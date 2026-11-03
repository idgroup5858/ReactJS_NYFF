import type { AuthUser, ID, Role, Shift, ShiftWithSummary, Timestamp } from '@/domain/types'
import { createStore, useStore } from '@/store/createStore'
import { readJson, removeKey, writeJson } from '@/store/storage'
import { SESSION_STORAGE_KEY } from '@/store/storageKeys'
import { ApiError, configureHttp, http } from './http'
import { clearQueries } from './query'

/**
 * Kirgan xodim — sessionStorage da: har bir tab alohida (bir tabda kassir, boshqasida admin). PIN / parol serverda
 * tekshiriladi (5 marta xato — 5 daqiqa blok); brauzerda faqat token qoladi (24 soat, blokdan chiqishda yangilanadi).
 */
export interface Session {
  token: string
  userId: ID
  name: string
  surname: string
  /** admin: kirish emaili ("Profil" da ko'rsatiladi); PIN bilan kiradiganlarda `null` */
  email: string | null
  role: Role
  branchId: ID | null
  /** kassir uchun — kirishda ochilgan yoki davom etgan smena */
  shiftId: ID | null
  /** kassa bloklangan ("Bloklash" tugmasi) — sahifa yangilansa ham blok saqlanadi */
  locked: boolean
  loggedInAt: Timestamp
}

interface LoginResult {
  token: string
  user: AuthUser
  shift: Shift | null
}

function readSession(): Session | null {
  const raw = readJson(SESSION_STORAGE_KEY, sessionStorage) as Session | null
  if (!raw || typeof raw.token !== 'string' || typeof raw.userId !== 'string') return null
  // 2026-11-02 dan oldingi sessiyada familiya va email yo'q — `refreshSession` to'ldiradi
  return { ...raw, surname: raw.surname ?? '', email: raw.email ?? null, locked: raw.locked === true }
}

export const sessionStore = createStore<Session | null>(readSession())

function saveSession(session: Session | null): void {
  sessionStore.set(session)
  if (session) writeJson(SESSION_STORAGE_KEY, session, sessionStorage)
  else removeKey(SESSION_STORAGE_KEY, sessionStorage)
}

function patchSession(patch: Partial<Session>): void {
  const current = sessionStore.get()
  if (current) saveSession({ ...current, ...patch })
}

configureHttp({
  token: () => sessionStore.get()?.token ?? null,
  // token eskirgan yoki xodim bloklangan — kirish ekraniga (RequireRole yo'naltiradi)
  unauthorized: () => logout(),
})

/** Kirish natijasi → sessiya (kassirga smena ochiladi yoki davom etadi). */
function startSession(result: LoginResult): Session {
  clearQueries()
  const { user } = result
  const session: Session = {
    token: result.token,
    userId: user.id,
    name: user.name,
    surname: user.surname,
    email: user.email,
    role: user.role,
    branchId: user.branchId,
    shiftId: result.shift?.id ?? null,
    locked: false,
    loggedInAt: new Date().toISOString(),
  }
  saveSession(session)
  return session
}

/**
 * PIN bilan kirish — kassir, oshpaz yordamchisi, ta'minotchi. Xato — ApiError (`wrong_pin`, `too_many_attempts`…).
 * Admin va kuryer bu yo'ldan kira olmaydi (server — `forbidden`).
 */
export async function login(userId: ID, pin: string): Promise<Session> {
  return startSession(await http.post<LoginResult>('/auth/login', { userId, pin }, { token: null }))
}

/** Admin — email va parol bilan (`/admin`). Xato — `wrong_login`, `too_many_attempts`, `user_inactive`. */
export async function adminLogin(email: string, password: string): Promise<Session> {
  return startSession(await http.post<LoginResult>('/auth/admin-login', { email, password }, { token: null }))
}

/** "Profil": ism, familiya, email — sessiya ham yangilanadi. */
export async function updateProfile(input: { name: string; surname: string; email: string }): Promise<void> {
  const user = await http.put<AuthUser>('/auth/profile', input)
  patchSession({ name: user.name, surname: user.surname, email: user.email })
}

/** "Profil": parol — joriysi bilan (`wrong_password`). */
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await http.put<void>('/auth/password', { oldPassword, newPassword })
}

/** Chiqish. Kassir smenasi yopilmaydi — buni [closeCurrentShift] qiladi. */
export function logout(): void {
  saveSession(null)
  clearQueries()
}

export function lockSession(): void {
  patchSession({ locked: true })
}

/** Blokdan chiqish — faqat shu xodimning PIN'i bilan; token yangilanadi. */
export async function unlockSession(pin: string): Promise<void> {
  if (!sessionStore.get()) return
  const { token } = await http.post<{ token: string }>('/auth/unlock', { pin })
  patchSession({ token, locked: false })
}

/**
 * Kassir smenasi ochiq ekanini ta'minlaydi: boshqa joyda yopilgan bo'lsa (masalan, ikkinchi tabda topshirilgan),
 * yangisi ochiladi va sessiyaga yoziladi.
 */
export async function ensureCashierShift(): Promise<void> {
  const session = sessionStore.get()
  if (!session || session.role !== 'cashier' || !session.branchId) return
  const shift = await http.post<Shift>('/shifts/current')
  if (shift.id !== sessionStore.get()?.shiftId) patchSession({ shiftId: shift.id })
}

/** "Smenani topshirish": smena yopiladi (hisobot uchun jami bilan qaytariladi); chiqish hisobot ko'rilgach alohida. */
export async function closeCurrentShift(): Promise<ShiftWithSummary | null> {
  const session = sessionStore.get()
  if (!session?.shiftId) return null
  const closed = await http.post<ShiftWithSummary>('/shifts/current/close')
  patchSession({ shiftId: null })
  return closed
}

/** Sahifa ochilganda: token hali amal qiladimi, xodim (ism, rol, filial) va smena yangilanadi. */
export async function refreshSession(): Promise<void> {
  if (!sessionStore.get()) return
  try {
    const me = await http.get<{ user: AuthUser; shift: Shift | null }>('/auth/me')
    // admin rolini kuryerga almashtirgan — vebda ishi yo'q
    if (me.user.role === 'courier') return logout()
    const { name, surname, email, role, branchId } = me.user
    patchSession({ name, surname, email, role, branchId, shiftId: me.shift?.id ?? null })
  } catch (error) {
    // 401 — `configureHttp` chiqaradi; server o'chiq bo'lsa sessiya qoladi (keyingi so'rovda tekshiriladi)
    if (!(error instanceof ApiError)) throw error
  }
}

export function useSession(): Session | null {
  return useStore(sessionStore)
}

/** Kirgan xodim (sessiyadan); kirmagan bo'lsa — `null`. */
export function useCurrentUser(): AuthUser | null {
  const session = useSession()
  if (!session) return null
  const { userId: id, name, surname, role, branchId, email } = session
  return { id, name, surname, role, branchId, email }
}

/** Xodim roli bo'yicha bosh sahifasi. */
export function homePathFor(role: Role): string {
  switch (role) {
    case 'cashier':
      return '/kassa'
    case 'kitchen':
      return '/oshxona'
    case 'supplier':
      return '/ombor'
    case 'admin':
      return '/admin'
    case 'courier':
      // sessiyaga tushmaydi (`login`, `refreshSession`) — faqat tip to'liq bo'lishi uchun
      return '/'
  }
}

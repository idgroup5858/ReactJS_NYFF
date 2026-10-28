import { fail } from '@/domain/errors'
import type { AuthUser, ID, Role, Shift, ShiftWithSummary, Timestamp } from '@/domain/types'
import { createStore, useStore } from '@/store/createStore'
import { readJson, removeKey, writeJson } from '@/store/storage'
import { SESSION_STORAGE_KEY } from '@/store/storageKeys'
import { ApiError, configureHttp, http } from './http'
import { clearQueries } from './query'

/**
 * Kirgan xodim — sessionStorage da: har bir tab alohida (bir tabda kassir, boshqasida admin). PIN serverda
 * tekshiriladi (5 marta xato — 5 daqiqa blok); brauzerda faqat token qoladi (24 soat, blokdan chiqishda yangilanadi).
 */
export interface Session {
  token: string
  userId: ID
  name: string
  role: Role
  branchId: ID | null
  /** kassir uchun — kirishda ochilgan yoki davom etgan smena */
  shiftId: ID | null
  /** kassa harakatsizlikdan bloklangan — sahifa yangilansa ham blok saqlanadi */
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
  return raw && typeof raw.token === 'string' && typeof raw.userId === 'string' ? { ...raw, locked: raw.locked === true } : null
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

/** PIN bilan kirish; kassirga smena ochiladi yoki davom etadi. Xato — ApiError (`wrong_pin`, `too_many_attempts`…). */
export async function login(userId: ID, pin: string): Promise<Session> {
  const result = await http.post<LoginResult>('/auth/login', { userId, pin }, { token: null })
  // kuryer — faqat Android ilovasida (vebda sahifasi yo'q)
  if (result.user.role === 'courier') fail('forbidden', 'courier')
  clearQueries()
  const session: Session = {
    token: result.token,
    userId: result.user.id,
    name: result.user.name,
    role: result.user.role,
    branchId: result.user.branchId,
    shiftId: result.shift?.id ?? null,
    locked: false,
    loggedInAt: new Date().toISOString(),
  }
  saveSession(session)
  return session
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
    patchSession({ name: me.user.name, role: me.user.role, branchId: me.user.branchId, shiftId: me.shift?.id ?? null })
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
  return session ? { id: session.userId, name: session.name, role: session.role, branchId: session.branchId } : null
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

import { verifyPin } from '@/domain/logic/users'
import type { ID, Role, Shift, Timestamp, User } from '@/domain/types'
import { createStore, useStore } from '@/store/createStore'
import { readJson, removeKey, writeJson } from '@/store/storage'
import { SESSION_STORAGE_KEY } from '@/store/storageKeys'
import { dbStore, useDb } from './db'
import { api } from './index'

/** Kirgan xodim. sessionStorage da — har bir tab alohida: bir tabda kassir, boshqasida oshxona ishlashi mumkin. */
export interface Session {
  userId: ID
  role: Role
  branchId: ID | null
  /** kassir uchun — kirishda ochilgan yoki davom etgan smena */
  shiftId: ID | null
  /** kassa harakatsizlikdan bloklangan — sahifa yangilansa ham blok saqlanadi */
  locked: boolean
  loggedInAt: Timestamp
}

function readSession(): Session | null {
  const raw = readJson(SESSION_STORAGE_KEY, sessionStorage) as Session | null
  return raw && typeof raw.userId === 'string' ? { ...raw, locked: raw.locked === true } : null
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

/** PIN tekshiriladi; kassir uchun smena ochiladi yoki davom etadi. Xato — AppError (`wrong_pin` va h.k.). */
export async function login(userId: ID, pin: string): Promise<Session> {
  const user = verifyPin(dbStore.get(), userId, pin)
  let shiftId: ID | null = null
  if (user.role === 'cashier' && user.branchId) shiftId = (await api.shifts.openOrResume(user.id, user.branchId)).id
  const session: Session = {
    userId: user.id,
    role: user.role,
    branchId: user.branchId,
    shiftId,
    locked: false,
    loggedInAt: new Date().toISOString(),
  }
  saveSession(session)
  return session
}

/** Chiqish. Kassir smenasi yopilmaydi — buni [closeShiftAndLogout] qiladi. */
export function logout(): void {
  saveSession(null)
}

export function lockSession(): void {
  patchSession({ locked: true })
}

/** Blokdan chiqish — faqat shu xodimning PIN'i bilan. */
export function unlockSession(pin: string): void {
  const session = sessionStore.get()
  if (!session) return
  verifyPin(dbStore.get(), session.userId, pin)
  patchSession({ locked: false })
}

/**
 * Kassir smenasi ochiq ekanini ta'minlaydi: boshqa joyda yopilgan bo'lsa (masalan, ikkinchi tabda topshirilgan),
 * yangisi ochiladi va sessiyaga yoziladi.
 */
export async function ensureCashierShift(): Promise<void> {
  const session = sessionStore.get()
  if (!session || session.role !== 'cashier' || !session.branchId) return
  const shift = dbStore.get().shifts.find((s) => s.id === session.shiftId)
  if (shift && shift.closedAt === null) return
  const opened = await api.shifts.openOrResume(session.userId, session.branchId)
  patchSession({ shiftId: opened.id })
}

/** "Smenani topshirish": smena yopiladi (hisobot uchun qaytariladi); chiqish hisobot ko'rilgach alohida. */
export async function closeCurrentShift(): Promise<Shift | null> {
  const session = sessionStore.get()
  if (!session?.shiftId) return null
  return api.shifts.close(session.shiftId)
}

export function useSession(): Session | null {
  return useStore(sessionStore)
}

/** Kirgan xodimning bazadagi yozuvi (o'chirilgan yoki bloklangan bo'lsa — `null`). */
export function useCurrentUser(): User | null {
  const session = useSession()
  const db = useDb()
  if (!session) return null
  const user = db.users.find((u) => u.id === session.userId)
  return user && user.active ? user : null
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
  }
}

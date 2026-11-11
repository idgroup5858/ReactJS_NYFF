import type { ID, Menu, Order } from '@/domain/types'
import { createStore, useStore } from '@/store/createStore'
import { readJson, removeKey, writeJson } from '@/store/storage'
import { OFFLINE_SESSION_STORAGE_KEY } from '@/store/storageKeys'
import { request } from './http'
import type { NewOrderInput } from './index'

/**
 * Offline kassa (`/offline`) — kassa kompyuteridagi offline server bilan (`NestJS_NYFF/src/offline`, `/api/offline/*`).
 * Sahifa shu serverning o'zidan ochiladi, shuning uchun manzil nisbiy. Markaziy server bilan aloqani offline server
 * o'zi qiladi (nusxa olish, internet qaytgach buyurtmalarni yuborish).
 */

export interface OfflineCashier {
  id: ID
  name: string
  surname: string
}

export interface OfflineData {
  /** `address` — chekda chiqadi (eski offline serverda yo'q) */
  branch: { id: ID; name: string; address?: string }
  /** PIN bilan kira oladiganlar (markazdan olingan nusxa) */
  cashiers: OfflineCashier[]
  menu: Menu | null
  /** online kassa sayti — "Online rejimga qaytish" (online kassadan o'tilgan bo'lsa — o'sha sahifaniki) */
  kassaUrl: string
}

export interface OfflineSyncStatus {
  /** markaz manzili va filial kaliti sozlanganmi */
  configured: boolean
  /** markaz oxirgi tekshiruvda javob berdimi (`null` — hali tekshirilmagan) */
  online: boolean | null
  /** markazga hali yetib bormagan buyurtmalar */
  pending: number
  /** markaz rad etganlari */
  rejected: number
  lastSyncAt: string | null
  error: string | null
}

export interface OfflineState {
  /** menyu bor — savdo qilsa bo'ladi */
  ready: boolean
  /** `confirmed: false` — savdodan oldin kassir oxirgi raqamni kiritadi */
  number: { confirmed: boolean; last: number }
  sync: OfflineSyncStatus
}

export interface OfflineSession {
  token: string
  cashier: OfflineCashier
}

function readSession(): OfflineSession | null {
  const raw = readJson(OFFLINE_SESSION_STORAGE_KEY, sessionStorage) as OfflineSession | null
  return raw && typeof raw.token === 'string' && raw.cashier && typeof raw.cashier.id === 'string' ? raw : null
}

export const offlineSessionStore = createStore<OfflineSession | null>(readSession())

function saveSession(session: OfflineSession | null): OfflineSession | null {
  offlineSessionStore.set(session)
  if (session) writeJson(OFFLINE_SESSION_STORAGE_KEY, session, sessionStorage)
  else removeKey(OFFLINE_SESSION_STORAGE_KEY, sessionStorage)
  return session
}

export const useOfflineSession = () => useStore(offlineSessionStore)

/** Chiqish (kassir almashadi) — keyingisi PIN bilan kiradi. */
export const offlineLogout = () => void saveSession(null)

const open = { token: null }
const authed = () => ({ token: offlineSessionStore.get()?.token ?? null })

export const offlineApi = {
  data: () => request<OfflineData>('GET', '/offline/data', { auth: open }),
  state: () => request<OfflineState>('GET', '/offline/state', { auth: open }),
  /** online kassadan o'tish: ishlayotgan kassir PIN'siz davom etadi */
  handover: async (input: {
    branchId: ID
    branchName: string
    branchAddress: string
    cashier: OfflineCashier
    lastNumber: number
    returnUrl?: string
    menu: Menu | null
  }) =>
    saveSession(await request<OfflineSession>('POST', '/offline/handover', { body: input, auth: open })) as OfflineSession,
  login: async (cashierId: ID, pin: string) =>
    saveSession(await request<OfflineSession>('POST', '/offline/login', { body: { cashierId, pin }, auth: open })) as OfflineSession,
  /** kassir oxirgi chekdagi raqamni kiritdi */
  setNumber: (last: number) => request<void>('POST', '/offline/number', { body: { last }, auth: authed() }),
  /** "Online rejimga qaytish" — keyingi offline'da raqam yana aniqlanadi (kassir kirmagan bo'lsa ham — ochiq) */
  leave: () => request<void>('POST', '/offline/leave', { auth: authed() }),
  orders: () => request<Order[]>('GET', '/offline/orders', { auth: authed() }),
  create: (input: NewOrderInput) => request<Order>('POST', '/offline/orders', { body: input, auth: authed() }),
  ready: (id: ID) => request<Order>('POST', `/offline/orders/${id}/ready`, { auth: authed() }),
  cancel: (id: ID) => request<Order>('POST', `/offline/orders/${id}/cancel`, { auth: authed() }),
}

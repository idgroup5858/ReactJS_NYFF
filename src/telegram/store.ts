import { useSyncExternalStore } from 'react'
import type { CartLine, OrderMode } from './domain'
import type { Branch, CustomerOrder, DeliveryRoute, GeoPoint, Lang, Menu, OnlinePayment, SavedCard } from './types'

/*
 * Mini app holati. Telefonda (brauzer xotirasi — `localStorage`) — Android'dagi DataStore / Room o'rnida: til, mavzu,
 * qoralama (tur, filial, dostavka nuqtasi), profil, to'lov tanlovi, telefon kaliti, ochilgan to'lov, buyurtmalar
 * tarixi. Kalitlar `nyt.` bilan boshlanadi — xodimlar tizimi kalitlariga tegmaydi. Savat — faqat xotirada (Android'dagidek).
 */

type Listener = () => void

export interface Store<T> {
  get(): T
  set(next: T | ((prev: T) => T)): void
  subscribe(listener: Listener): () => void
}

export function createStore<T>(initial: T, onChange?: (value: T) => void): Store<T> {
  let state = initial
  const listeners = new Set<Listener>()
  return {
    get: () => state,
    set(next) {
      const value = typeof next === 'function' ? (next as (prev: T) => T)(state) : next
      if (Object.is(value, state)) return
      state = value
      onChange?.(value)
      listeners.forEach((l) => l())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}

// ---------------------------------------------------------------- brauzer xotirasi

const PREFIX = 'nyt.'

export function readLocal<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeLocal(key: string, value: unknown): void {
  try {
    if (value === null || value === undefined) localStorage.removeItem(PREFIX + key)
    else localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // xotira to'lgan / yopiq (maxfiy rejim) — saqlanmaydi, ilova ishlayveradi
  }
}

function persisted<T>(key: string, fallback: T, read: (saved: T) => T = (s) => s): Store<T> {
  const saved = readLocal<T>(key)
  return createStore<T>(saved == null ? fallback : read({ ...fallback, ...saved }), (value) => writeLocal(key, value))
}

// ---------------------------------------------------------------- sozlamalar

export interface Settings {
  lang: Lang
  /** yorug' — standart (Android'dagidek) */
  theme: 'light' | 'dark'
}

export const settingsStore = persisted<Settings>('settings', { lang: 'uz', theme: 'light' }, (s) => ({
  lang: s.lang === 'ru' || s.lang === 'en' ? s.lang : 'uz',
  theme: s.theme === 'dark' ? 'dark' : 'light',
}))

// ---------------------------------------------------------------- qoralama: tur, olib ketish filiali, dostavka nuqtasi

export interface Draft {
  mode: OrderMode
  takeawayBranchId: string | null
  deliveryPoint: GeoPoint | null
  /** nuqta uchun server javobi — saqlanmaydi, ochilganda qayta so'raladi */
  route: DeliveryRoute | null
}

const savedDraft = readLocal<Partial<Draft>>('draft')
export const draftStore = createStore<Draft>(
  {
    mode: savedDraft?.mode === 'takeaway' ? 'takeaway' : 'delivery',
    takeawayBranchId: typeof savedDraft?.takeawayBranchId === 'string' ? savedDraft.takeawayBranchId : null,
    deliveryPoint:
      savedDraft?.deliveryPoint && typeof savedDraft.deliveryPoint.lat === 'number' ? savedDraft.deliveryPoint : null,
    route: null,
  },
  ({ mode, takeawayBranchId, deliveryPoint }) => writeLocal('draft', { mode, takeawayBranchId, deliveryPoint }),
)

/** Savat — faqat xotirada: mini app yopilsa bo'shaydi. */
export const cartStore = createStore<CartLine[]>([])

// ---------------------------------------------------------------- serverdan: filiallar, menyular, kartalar

export interface Catalog {
  /** `null` — hali yuklanmagan */
  branches: Branch[] | null
  menus: Record<string, Menu>
}

export const catalogStore = createStore<Catalog>({ branches: null, menus: {} })

/** Shu qurilmaga bog'langan kartalar; `null` — hali yuklanmagan. */
export const cardsStore = createStore<SavedCard[] | null>(null)

// ---------------------------------------------------------------- profil va to'lov tanlovi

/** `phone` — `+998` dan keyingi raqamlar (yoki bo'sh). */
export interface Profile {
  name: string
  phone: string
}

export const profileStore = persisted<Profile>('profile', { name: '', phone: '' }, (p) => ({
  name: typeof p.name === 'string' ? p.name : '',
  phone: typeof p.phone === 'string' ? p.phone.replace(/\D/g, '').slice(0, 9) : '',
}))

export function savedPayment(): OnlinePayment {
  return readLocal<string>('payment') === 'card' ? 'card' : 'cash'
}

export function savePayment(payment: OnlinePayment): void {
  writeLocal('payment', payment)
}

// ---------------------------------------------------------------- rasmiylashtirish formasi (xotirada)

/**
 * Rasmiylashtirish formasi — xaritaga yoki "Karta qo'shish"ga o'tib qaytganda yozilgani qolsin. Bosh sahifa ochilganda
 * tozalanadi (Android'dagidek: manzil va izoh har safar bo'sh, ism va telefon — profildan, to'lov — oxirgi tanlov).
 */
export interface CheckoutForm {
  ready: boolean
  name: string
  phone: string
  address: string
  note: string
  payment: OnlinePayment
  /** mijoz o'zi tanlagan: karta id'si yoki `null` (bir martalik); tanlamagan bo'lsa — eng yangi karta */
  cardChoice: string | null
  cardChosen: boolean
  /** serverda karta ulangan (`GET /mobile/payments/methods`) */
  cardEnabled: boolean
}

const EMPTY_FORM: CheckoutForm = {
  ready: false,
  name: '',
  phone: '',
  address: '',
  note: '',
  payment: 'cash',
  cardChoice: null,
  cardChosen: false,
  cardEnabled: false,
}

export const checkoutStore = createStore<CheckoutForm>(EMPTY_FORM)

/** Profil sahifasida yozilayotgan (hali saqlanmagan) ism va telefon — "Karta qo'shish"dan qaytganda qolsin. */
export const profileDraftStore = createStore<Profile | null>(null)

/** Bosh sahifa ochildi — yarim to'ldirilgan formalar tashlanadi. */
export function resetForms(): void {
  checkoutStore.set(EMPTY_FORM)
  profileDraftStore.set(null)
}

// ---------------------------------------------------------------- telefon kaliti (API.md 5.8)

/**
 * Kartalar shu qurilmaga bog'lanadi (login yo'q, Telegram akkauntiga ham emas): birinchi so'ralganda 32 tasodifiy bayt
 * (base64url, 43 belgi) yaratiladi va o'chmaydi. Brauzer xotirasi tozalansa — yangi kalit, karta qayta qo'shiladi.
 */
export function clientKey(): string {
  const saved = readLocal<string>('clientKey')
  if (saved && /^[A-Za-z0-9_-]{32,128}$/.test(saved)) return saved
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const key = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  writeLocal('clientKey', key)
  return key
}

// ---------------------------------------------------------------- ochilgan karta to'lovi (API.md 5.7)

/** Bittasi saqlanadi — yangisi eskisining o'rniga; mini app yopilib qolsa ham keyingi ochilishda tekshiriladi. */
export interface PendingPayment {
  id: string
  token: string
  /** to'lov oynasi; saqlangan kartadan — `null` */
  paymentUrl: string | null
  expiresAt: string | null
  deliveryFee: number | null
  createdAt: number
  /** to'lov oynasi ochilgan — sahifaga qaytilganda natija kutiladi */
  opened?: boolean
}

export const pendingPayment = {
  get: () => readLocal<PendingPayment>('pendingPayment'),
  save: (payment: PendingPayment) => writeLocal('pendingPayment', payment),
  /** faqat shu to'lov bo'lsa (orada yangisi ochilgan bo'lishi mumkin) */
  clear(id: string) {
    const saved = readLocal<PendingPayment>('pendingPayment')
    if (!saved || saved.id === id) writeLocal('pendingPayment', null)
  },
}

// ---------------------------------------------------------------- buyurtmalar tarixi

/** Qurilmada saqlangan buyurtma: oxirgi holat + kuzatish tokeni (faqat buyurtma javobida keladi). */
export interface SavedOrder {
  order: CustomerOrder
  token: string
  deliveryFee: number | null
  createdAt: number
}

/** Brauzer xotirasi cheklangan (~5 MB) — eng yangi shuncha buyurtma saqlanadi. */
const MAX_ORDERS = 200

export const ordersStore = createStore<SavedOrder[]>(
  (readLocal<SavedOrder[]>('orders') ?? []).filter((o) => o && o.order && typeof o.token === 'string'),
  (value) => writeLocal('orders', value.slice(0, MAX_ORDERS)),
)

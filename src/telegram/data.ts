import { api, ApiError } from './api'
import { forMobile } from './domain'
import {
  cardsStore,
  catalogStore,
  clientKey,
  draftStore,
  ordersStore,
  pendingPayment,
  type PendingPayment,
  type SavedOrder,
} from './store'
import type { CustomerOrder, GeoPoint, MobileOrderRequest, MobilePayment } from './types'

/*
 * Serverdan o'qish va qurilmaga yozish (Android'dagi Catalog / Order / Payment / Card repository'lari).
 * So'rov boshlangach sahifa yopilsa ham javob yoziladi — buyurtma tokeni yo'qolmaydi.
 */

// ---------------------------------------------------------------- filiallar, yo'nalish, menyu

export async function refreshBranches(): Promise<void> {
  const branches = await api.branches()
  catalogStore.set((c) => ({ ...c, branches }))
}

/** Dostavka nuqtasi → server tanlagan filial va narx (yangi nuqta — eski javob darhol tozalanadi). */
export async function updateRoute(point: GeoPoint): Promise<void> {
  const route = await api.deliveryRoute(point)
  const current = draftStore.get().deliveryPoint
  // orada boshqa nuqta tanlangan bo'lsa — eski javob yozilmaydi
  if (current && current.lat === point.lat && current.lng === point.lng) draftStore.set((d) => ({ ...d, route }))
}

export function setDeliveryPoint(point: GeoPoint): void {
  draftStore.set((d) => ({ ...d, mode: 'delivery', deliveryPoint: point, route: null }))
}

/** Menyu keshda bo'lsa — qayta so'ralmaydi ([force] — yangilash). "Faqat zalda" taomlar olib tashlanadi. */
export async function loadMenu(branchId: string, force = false): Promise<void> {
  if (!force && catalogStore.get().menus[branchId]) return
  const menu = forMobile(await api.menu(branchId))
  catalogStore.set((c) => ({ ...c, menus: { ...c.menus, [branchId]: menu } }))
}

// ---------------------------------------------------------------- buyurtmalar

function storeOrder(order: CustomerOrder, token: string, deliveryFee: number | null): SavedOrder {
  const saved: SavedOrder = { order, token, deliveryFee, createdAt: Date.parse(order.createdAt) || Date.now() }
  ordersStore.set((list) => [saved, ...list.filter((o) => o.order.id !== order.id)])
  return saved
}

/** Idempotent emas — avtomatik qayta yuborilmaydi. */
export async function placeOrder(request: MobileOrderRequest, deliveryFee: number | null): Promise<SavedOrder> {
  const response = await api.placeOrder(request)
  return storeOrder(response.order, response.trackingToken, deliveryFee)
}

/** Karta bilan to'langandan keyin server yaratgan buyurtma — to'lov tokeni bilan o'qib, qurilmaga yoziladi. */
export async function adoptOrder(orderId: string, token: string, deliveryFee: number | null): Promise<SavedOrder> {
  const existing = ordersStore.get().find((o) => o.order.id === orderId)
  const order = await api.order(orderId, token)
  return storeOrder(order, token, existing?.deliveryFee ?? deliveryFee)
}

export function findOrder(id: string): SavedOrder | undefined {
  return ordersStore.get().find((o) => o.order.id === id)
}

/** Yangi holatni yozish (REST yoki socket). Tartib o'zgarmaydi. */
export function saveOrderState(order: CustomerOrder): void {
  ordersStore.set((list) => list.map((o) => (o.order.id === order.id ? { ...o, order } : o)))
}

export async function refreshOrder(id: string): Promise<CustomerOrder> {
  const saved = findOrder(id)
  if (!saved) throw new ApiError(404, 'not_found', 'local')
  const order = await api.order(id, saved.token)
  saveOrderState(order)
  return order
}

// ---------------------------------------------------------------- karta bilan to'lov (API.md 5.7)

/** Shu serverda karta ulanganmi (so'rov o'tmasa — yo'q deb hisoblanadi). */
export async function cardEnabled(): Promise<boolean> {
  try {
    return (await api.paymentMethods()).card === true
  } catch {
    return false
  }
}

export type PaymentOutcome =
  | { kind: 'waiting' }
  | { kind: 'paid'; orderId: string }
  /** to'landi, buyurtma yaratilmadi — filial bog'lanadi, pulni qaytaradi */
  | { kind: 'paidNoOrder' }
  /** bank rad etdi yoki muddat o'tdi — pul yechilmagan */
  | { kind: 'failed' }

/**
 * To'lov ochish. Saqlangan karta (`request.cardId`) — server darhol yechadi: to'langan bo'lsa buyurtma shu yerda
 * qurilmaga yoziladi (`paidOrderId`); natija noma'lum bo'lsa — to'lov sahifasi holatni so'raydi.
 */
export async function startPayment(
  request: MobileOrderRequest,
  deliveryFee: number | null,
): Promise<{ pending: PendingPayment; paidOrderId: string | null }> {
  const response = await api.startPayment(request, clientKey())
  const pending: PendingPayment = {
    id: response.payment.id,
    token: response.trackingToken,
    paymentUrl: response.paymentUrl,
    expiresAt: response.payment.expiresAt,
    deliveryFee,
    createdAt: Date.now(),
  }
  pendingPayment.save(pending)
  const orderId = response.payment.orderId
  if (response.payment.status === 'paid' && orderId) {
    try {
      await adoptOrder(orderId, pending.token, deliveryFee)
      pendingPayment.clear(pending.id)
      return { pending, paidOrderId: orderId }
    } catch {
      // buyurtma o'qilmadi — to'lov sahifasi holatni qayta so'raydi
    }
  }
  return { pending, paidOrderId: null }
}

/**
 * Serverdan holat. To'langan va buyurtma yaratilgan bo'lsa — buyurtma qurilmaga yoziladi; yakunlangan to'lov
 * o'chiriladi. Server to'lovni tanimasa (`not_found`) — ham o'chiriladi.
 */
export async function checkPayment(pending: PendingPayment): Promise<PaymentOutcome> {
  let payment: MobilePayment
  try {
    payment = await api.payment(pending.id, pending.token)
  } catch (e) {
    if (e instanceof ApiError && e.code === 'not_found') pendingPayment.clear(pending.id)
    throw e
  }
  let outcome: PaymentOutcome = { kind: 'waiting' }
  if (payment.status === 'paid') {
    if (payment.orderId) {
      await adoptOrder(payment.orderId, pending.token, pending.deliveryFee)
      outcome = { kind: 'paid', orderId: payment.orderId }
    } else if (payment.error) {
      outcome = { kind: 'paidNoOrder' }
    }
    // ikkalasi ham yo'q — buyurtma bir lahzada yaratiladi
  } else if (payment.status === 'failed' || payment.status === 'expired') {
    outcome = { kind: 'failed' }
  }
  if (outcome.kind !== 'waiting') pendingPayment.clear(pending.id)
  return outcome
}

const STALE_MS = 24 * 60 * 60_000

/** Mini app ochilganda: oldingi to'lov yakunlanmagan bo'lsa — tekshiriladi (to'langan bo'lsa "Buyurtmam"da chiqadi). */
export async function resumePayment(): Promise<void> {
  const pending = pendingPayment.get()
  if (!pending) return
  if (Date.now() - pending.createdAt > STALE_MS) {
    pendingPayment.clear(pending.id)
    return
  }
  try {
    await checkPayment(pending)
  } catch {
    // keyingi ochilishda yana
  }
}

// ---------------------------------------------------------------- bog'langan kartalar (API.md 5.8)

export async function refreshCards(): Promise<void> {
  cardsStore.set(await api.cards(clientKey()))
}

export const startCardBinding = () => api.bindCard(clientKey())

/** Bog'lash natijasi; faol bo'lsa — ro'yxat yangilanadi. */
export async function cardBinding(id: string) {
  const binding = await api.cardBinding(id, clientKey())
  if (binding.card) await refreshCards().catch(() => undefined)
  return binding
}

/** O'chirish (bankda ham uziladi) — ro'yxatdan darhol chiqadi. */
export async function removeCard(id: string): Promise<void> {
  await api.deleteCard(id, clientKey())
  cardsStore.set((list) => list?.filter((c) => c.id !== id) ?? null)
}

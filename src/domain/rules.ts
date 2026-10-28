import { PAYMENT_METHODS, type Branch, type Order, type PaymentMethod, type Purchase, type Role, type Shift } from './types'

/**
 * Ekranda kerak bo'ladigan qoidalar (toza funksiyalar). Hisob-kitob va tekshiruvlarning asl joyi — backend; bu yerda
 * faqat ko'rsatish uchun (TV dan tushish vaqti, to'lov qismlari, smena davomiyligi, forma tekshiruvi).
 */

/** Tayyor bo'lgan raqam TV va kassa ro'yxatida shuncha vaqt turadi, keyin o'zi tushadi. */
export const READY_SHOWN_MS = 5 * 60_000

/** Mobil buyurtma shu vaqtda qabul qilinmasa — boshqa filialga o'tadi yoki bekor bo'ladi (server). */
export const MOBILE_ACCEPT_MS = 5 * 60_000

/**
 * TV navbat ekraniga chiqadimi: faqat kassa va kioskdan — zalda yoki olib ketish. Dostavka va mobil ilovadagi buyurtmani
 * mijoz zalda kutmaydi (holatini ilovada ko'radi).
 */
export function showsOnTv(order: Pick<Order, 'source' | 'type'>): boolean {
  return order.source !== 'mobile' && order.type !== 'delivery'
}

/** Buyurtma tushumi to'lov turlari bo'yicha: aralashda — qismlar, aks holda — butun summa. */
export function orderPayments(order: Pick<Order, 'split' | 'payment' | 'total'>): Record<PaymentMethod, number> {
  const result: Record<PaymentMethod, number> = { cash: 0, card: 0, click: 0 }
  if (order.split) for (const method of PAYMENT_METHODS) result[method] = order.split[method] ?? 0
  else if (order.payment) result[order.payment] = order.total
  return result
}

/** Smena davomiyligi, daqiqada: yopilgan bo'lsa — yopilgunicha, ochiq bo'lsa — hozirgacha. */
export function shiftMinutes(shift: Pick<Shift, 'openedAt' | 'closedAt'>, now: Date): number {
  const end = shift.closedAt ? new Date(shift.closedAt).getTime() : now.getTime()
  return Math.max(0, Math.floor((end - new Date(shift.openedAt).getTime()) / 60_000))
}

/** PIN: faqat raqamlar, 4 tadan 8 tagacha. */
export function isValidPin(pin: string): boolean {
  return /^\d{4,8}$/.test(pin)
}

/** Kuryer login: lotin harflari, raqam, «.», «_», «-» — 3–40 (server kichik harfga o'tkazadi). Parol — kamida 6 belgi. */
export const isValidLogin = (login: string): boolean => /^[a-z0-9._-]{3,40}$/.test(login.trim().toLowerCase())
export const isValidPassword = (password: string): boolean => password.length >= 6 && password.length <= 64

/** Kassir va oshpaz yordamchisi filialga bog'lanadi; admin, ta'minotchi va kuryer — butun tarmoq uchun. */
export function roleNeedsBranch(role: Role): boolean {
  return role === 'cashier' || role === 'kitchen'
}

/**
 * Mobil dostavkaning kuryer bosqichi (`status` ready da qoladi): waiting — hech kim olmagan; taken — kuryer oldi, filialda;
 * on_the_way — yo'lda; delivered — yetkazildi; returned — "Yetkazib bo'lmadi", filialga qaytdi. Boshqa buyurtma — `null`.
 */
export type CourierStage = 'waiting' | 'taken' | 'on_the_way' | 'delivered' | 'returned'

export function courierStage(
  order: Pick<Order, 'source' | 'type' | 'status' | 'courierId' | 'departedAt' | 'deliveredAt' | 'returnedAt'>,
): CourierStage | null {
  if (order.source !== 'mobile' || order.type !== 'delivery') return null
  if (order.status !== 'preparing' && order.status !== 'ready') return null
  if (order.deliveredAt) return 'delivered'
  if (order.returnedAt) return 'returned'
  if (order.departedAt) return 'on_the_way'
  return order.courierId ? 'taken' : 'waiting'
}

/** Kassir / admin "Kuryerdan olish" qila oladimi: kuryeri bor, yetkazilmagan (server ham tekshiradi). */
export const canReleaseCourier = (order: Pick<Order, 'courierId' | 'deliveredAt' | 'status'>): boolean =>
  !!order.courierId && !order.deliveredAt && order.status !== 'cancelled'

export const hasZone = (branch: Pick<Branch, 'deliveryZone'>): boolean => branch.deliveryZone.length >= 3

export function purchaseTotal(purchase: Pick<Purchase, 'items'>): number {
  return purchase.items.reduce((sum, item) => sum + (item.price ?? 0) * item.qty, 0)
}

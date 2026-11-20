/*
 * Mijoz API turlari — NestJS_NYFF/API.md 5 va 6-bo'lim (Android ilovadagi `Models.kt` bilan bir xil). Mini app xodimlar
 * tizimining turlarini (`@/domain/types`) ishlatmaydi — papka o'chirilsa hech narsa buzilmasin.
 */

export type Lang = 'uz' | 'ru' | 'en'

/** Uch tildagi matn: `uz` majburiy, `ru` / `en` bo'sh bo'lsa `uz` ko'rsatiladi. */
export interface LocalizedText {
  uz: string
  ru?: string
  en?: string
}

export interface GeoPoint {
  lat: number
  lng: number
}

export type BranchOnlineState = 'open' | 'inactive' | 'paused' | 'off_hours' | 'no_shift' | 'no_kassa'

export interface Branch {
  id: string
  name: string
  address: string
  phone: string
  active: boolean
  location: GeoPoint | null
  /** Online qabul vaqti "HH:MM"; `null` — 24/7. */
  workHours: { open: string; close: string } | null
  onlineState: BranchOnlineState
}

/** `GET /delivery/route`: buyurtmani qaysi filial oladi va yetkazish narxi. */
export interface DeliveryRoute {
  /** `null` — hech bir filial ochiq emas */
  branchId: string | null
  zoneBranchId: string | null
  /** hudud narxi (`0` — bepul); `null` — hududdan tashqarida, narxni kuryer aytadi */
  fee: number | null
  redirected: boolean
}

export interface Category {
  id: string
  name: LocalizedText
  image: string
  icon: string
  sortOrder: number
}

export interface MenuProduct {
  id: string
  categoryId: string
  name: LocalizedText
  image: string
  sortOrder: number
  /** shu filial narxi; `null` — sotilmaydi */
  price: number | null
  composition: LocalizedText[]
  /** faqat zalda (choynakdagi choy) — mini appda ko'rsatilmaydi (API.md 5.3) */
  dineInOnly?: boolean
}

export interface Menu {
  branchId: string
  categories: Category[]
  products: MenuProduct[]
}

export type OrderType = 'dine_in' | 'takeaway' | 'delivery'
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'cancelled'
export type CancelReason = 'timeout' | 'branch_closed' | 'no_branch'
export type OnlinePayment = 'cash' | 'card' | 'click'

export interface OrderItem {
  productId: string
  name: LocalizedText
  price: number
  qty: number
  note?: string
}

export interface OnlineInfo {
  platform: string
  name: string
  phone: string
  address: string
  payment: OnlinePayment
  location: GeoPoint | null
}

/** Mijoz ko'rinishidagi buyurtma (`CustomerOrder`) — REST va socket `order:<id>` xonasi. */
export interface CustomerOrder {
  id: string
  branchId: string
  /** filialda har kuni 1 dan; boshqa filialga o'tkazilsa o'zgaradi */
  number: number
  type: OrderType
  items: OrderItem[]
  note: string
  /** taomlar summasi (yetkazish narxisiz) */
  total: number
  online: OnlineInfo | null
  status: OrderStatus
  createdAt: string
  preparingAt: string | null
  readyAt: string | null
  cancelledAt: string | null
  cancelReason: CancelReason | null
  /** shu filialga tushgan vaqt — qabul muddati (5 daqiqa) shundan */
  routedAt: string | null
  transferCount: number
  fromBranchId: string | null
  deliveryFee: number | null
  departedAt: string | null
  deliveredAt: string | null
  returnedAt: string | null
}

export interface OrderLineRequest {
  productId: string
  qty: number
  note?: string
}

/** `POST /mobile/orders` va `POST /mobile/payments` tanasi; dostavkada `branchId` yuborilmaydi. */
export interface MobileOrderRequest {
  type: 'delivery' | 'takeaway'
  branchId?: string
  items: OrderLineRequest[]
  note: string
  online: {
    platform: 'telegram'
    name: string
    phone: string
    address: string
    payment: OnlinePayment
    location?: GeoPoint
  }
  /** saqlangan kartadan to'lash (faqat `/mobile/payments`) */
  cardId?: string
}

export interface MobileOrderResponse {
  order: CustomerOrder
  trackingToken: string
}

// ---------------------------------------------------------------- karta bilan to'lov (API.md 5.7)

export interface PaymentMethods {
  cash: boolean
  card: boolean
}

export type PaymentStatus = 'waiting' | 'paid' | 'failed' | 'expired'

export interface MobilePayment {
  id: string
  status: PaymentStatus
  total: number
  expiresAt: string | null
  orderId: string | null
  error: string | null
}

export interface MobilePaymentResponse {
  payment: MobilePayment
  /** saqlangan kartadan to'lovda — `null` (bank sahifasi yo'q) */
  paymentUrl: string | null
  returnUrl: string | null
  trackingToken: string
}

// ---------------------------------------------------------------- bog'langan kartalar (API.md 5.8)

export interface SavedCard {
  id: string
  /** `9860********4764`; bank bermagan bo'lsa — `null` */
  maskedPan: string | null
  createdAt: string | null
}

export type CardBindingStatus = 'pending' | 'active' | 'failed'

export interface CardBinding {
  id: string
  status: CardBindingStatus
  card: SavedCard | null
}

export interface CardBindStart {
  binding: CardBinding
  paymentUrl: string
  returnUrl: string
}

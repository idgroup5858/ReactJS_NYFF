/**
 * Domen modellari — backend (`C:\BACKEND APPS\NestJS_NYFF`, `API.md`) javoblari bilan bir xil. Vaqtlar — ISO satr (UTC).
 *
 * Miqdorlar: ombor qoldig'i, retseptlar va harakatlar ASOSIY birlikda (g / ml / dona) butun son bo'lib saqlanadi;
 * kirim va ko'chirish hujjatlari esa odam kiritgan OMBOR birligida (kg / l / dona) — qarang `units.ts`.
 */

export type Lang = 'uz' | 'ru' | 'en'
export const LANGS: Lang[] = ['uz', 'ru', 'en']

/** Uch tildagi matn (taom, kategoriya, ombor mahsuloti nomlari). */
export type LocalizedText = Record<Lang, string>

export type ID = string
/** ISO 8601 vaqt — `new Date().toISOString()` */
export type Timestamp = string
/** Mahalliy sana `YYYY-MM-DD` */
export type DateKey = string

// ───────────────────────── Tashkilot ─────────────────────────

/** Xaritadagi nuqta (WGS84, gradusda). */
export interface LatLng {
  lat: number
  lng: number
}

export interface Branch {
  id: ID
  name: string
  address: string
  phone: string
  active: boolean
  createdAt: Timestamp
  /** xaritadagi joyi — hududdan tashqaridagi buyurtma uchun eng yaqin filial shundan topiladi */
  location: LatLng | null
  /** yetkazib berish hududi — poligon uchlari (kamida 3 ta); bo'sh — hudud chizilmagan */
  deliveryZone: LatLng[]
  /** hudud ichida yetkazib berish narxi, so'm (0 — bepul); hududdan tashqarida narxni kuryer aytadi */
  deliveryFee: number
  /** filial yopiq bo'lsa uning hududidagi online buyurtmalar shu filialga; `null` — eng yaqin ochiq filialga */
  fallbackBranchId: ID | null
  /** admin to'xtatib qo'ysa (`false`) smena ochiq bo'lsa ham online buyurtma olmaydi */
  onlineEnabled: boolean
  /** online buyurtma qabul qilish vaqti (`HH:MM`, yarim tundan o'tishi mumkin); `null` — 24/7 */
  workHours: WorkHours | null
  /** hozir online buyurtma oladimi — `GET /branches` javobida (server hisoblaydi) */
  onlineState?: BranchOnlineState
}

export interface WorkHours {
  open: string
  close: string
}

/**
 * open — qabul qiladi; inactive — faol emas; paused — admin to'xtatgan; off_hours — ish vaqtidan tashqari;
 * no_shift — ochiq smena yo'q; no_kassa — smena ochiq, lekin kassa ekrani ulanmagan.
 */
export type BranchOnlineState = 'open' | 'inactive' | 'paused' | 'off_hours' | 'no_shift' | 'no_kassa'

export type WarehouseKind = 'central' | 'branch'

export interface Warehouse {
  id: ID
  name: string
  kind: WarehouseKind
  /** filial ombori uchun — qaysi filialniki; markaziy omborda `null` */
  branchId: ID | null
}

/**
 * `kitchen` — oshpaz yordamchisi: ovqatni oshxonadan olib chiqib "Tayyor" bosadi. `courier` — kuryer: faqat Android
 * ilovasida ishlaydi (`Kotlin_NYFF_Courier`), vebga kirmaydi; bu yerda — admin uni qo'shadi, kassa holatini ko'radi.
 */
export type Role = 'admin' | 'cashier' | 'kitchen' | 'supplier' | 'courier'
export const ROLES: Role[] = ['admin', 'cashier', 'kitchen', 'supplier', 'courier']

export interface User {
  id: ID
  name: string
  role: Role
  /** kassir va oshpaz yordamchisi — filialga bog'langan; admin, ta'minotchi va kuryer — `null` */
  branchId: ID | null
  /** faqat kuryer: kirish logini (kichik harfda); boshqalarda `null` */
  login: string | null
  active: boolean
  createdAt: Timestamp
}

/** Kuryer va hozirgi holati (`GET /users/couriers`) — admin "Xodimlar" va kassa "Dostavka" uchun. */
export interface CourierStatus {
  id: ID
  name: string
  /** bloklanmagan */
  active: boolean
  /** ilovada "Ishdaman" yoqilgan */
  onDuty: boolean
  /** qo'ldagi buyurtmalar: olgan, hali yetkazmagan va qaytarmagan */
  orders: number
  /** qo'ldagi buyurtmalar filiali (bir vaqtda bittasi); bo'sh qo'l — `null` */
  branchId: ID | null
  /** "Yo'lga chiqdim" bosgan */
  departed: boolean
}

/** Kirgan xodim (token egasi) — PIN serverda tekshiriladi, brauzerga kelmaydi. */
export interface AuthUser {
  id: ID
  name: string
  role: Role
  branchId: ID | null
}

// ───────────────────────── Menyu ─────────────────────────

export interface Category {
  id: ID
  name: LocalizedText
  image: string
  /** ikonka ("Zamonaviy" mavzuda rasm o'rnida); bo'sh satr — ikonkasiz */
  icon: string
  sortOrder: number
  active: boolean
}

export interface RecipeLine {
  ingredientId: ID
  /** asosiy birlikda: g / ml / dona */
  qty: number
}

export interface Product {
  id: ID
  categoryId: ID
  name: LocalizedText
  image: string
  /** bitta taomga ketadigan mahsulotlar — sotilganda filial omboridan shu miqdorlar ayriladi */
  recipe: RecipeLine[]
  /** sotuv narxi — barcha filiallarda bir xil */
  price: number
  /** taom vaqtincha sotilmaydigan filiallar; yangi filial — hamma taomni sotadi */
  unavailableBranchIds: ID[]
  sortOrder: number
  active: boolean
}

// ───────────────────────── Ombor ─────────────────────────

/** Ombor birligi: kirim, qoldiqni ko'rsatish va narx shu birlikda. Asosiy birligi: kg → g, l → ml, pcs → dona. */
export type StockUnit = 'kg' | 'l' | 'pcs'
export const STOCK_UNITS: StockUnit[] = ['kg', 'l', 'pcs']
export type BaseUnit = 'g' | 'ml' | 'pcs'

/**
 * Ombor mahsulotlari guruhi — omborda saralash va guruh ikonkasi uchun (qoldiq, retsept, sotuvga ta'sir qilmaydi).
 * Ro'yxat tartibi — sahifalardagi tartib; mos guruh topilmasa — `other`.
 */
export type IngredientGroup =
  | 'bread'
  | 'meat'
  | 'seafood'
  | 'dairy'
  | 'vegetables'
  | 'fruits'
  | 'frozen'
  | 'sauces'
  | 'grocery'
  | 'sweets'
  | 'drinks'
  | 'coffee'
  | 'packaging'
  | 'cleaning'
  | 'other'
export const INGREDIENT_GROUPS: IngredientGroup[] = [
  'bread',
  'meat',
  'seafood',
  'dairy',
  'vegetables',
  'fruits',
  'frozen',
  'sauces',
  'grocery',
  'sweets',
  'drinks',
  'coffee',
  'packaging',
  'cleaning',
  'other',
]
/** Taom tarkibida (kioskda) ko'rsatilmaydigan guruhlar — mijozga "tarkibi: quti, yog', ziravor" deb chiqmasin. */
export const NON_COMPOSITION_GROUPS: IngredientGroup[] = ['grocery', 'packaging', 'cleaning', 'other']

export interface Ingredient {
  id: ID
  name: LocalizedText
  group: IngredientGroup
  unit: StockUnit
  /** oxirgi tasdiqlangan kirimdagi 1 birlik (kg / l / dona) narxi — keyingi kirimda avtomatik yoziladi */
  lastPrice: number | null
  active: boolean
}

/** Ombordagi qoldiq. Yozuv bo'lmasa qoldiq 0, ogohlantirish chegarasi yo'q. */
export interface StockItem {
  warehouseId: ID
  ingredientId: ID
  /** asosiy birlikda; sotuv qoldiqdan oshsa manfiy bo'lishi mumkin (savdo to'xtamaydi) */
  qty: number
  /** asosiy birlikda; qoldiq shundan kam bo'lsa — ogohlantirish. 0 — kuzatilmaydi */
  minQty: number
}

export type PurchaseStatus = 'pending' | 'approved' | 'rejected'

export interface PurchaseItem {
  ingredientId: ID
  /** ombor birligida (kg / l / dona) */
  qty: number
  /** 1 birlik narxi — admin kiritadi; tasdiqlanmaguncha `null` bo'lishi mumkin */
  price: number | null
}

/** Ta'minotchi kiritgan kirim. Admin narxlarni kiritib tasdiqlamaguncha omborga qo'shilmaydi. */
export interface Purchase {
  id: ID
  number: number
  warehouseId: ID
  items: PurchaseItem[]
  note: string
  status: PurchaseStatus
  createdBy: ID
  createdAt: Timestamp
  decidedBy: ID | null
  decidedAt: Timestamp | null
}

export interface TransferItem {
  ingredientId: ID
  /** ombor birligida (kg / l / dona) */
  qty: number
}

/** Omborlar orasidagi ko'chirish (markaziy → filial yoki filial → filial). */
export interface Transfer {
  id: ID
  number: number
  fromWarehouseId: ID
  toWarehouseId: ID
  items: TransferItem[]
  note: string
  createdBy: ID
  createdAt: Timestamp
}

export type MovementKind = 'purchase' | 'transfer_in' | 'transfer_out' | 'sale' | 'sale_cancel'

/** Qoldiqning har bir o'zgarishi — tarix va hisobotlar uchun. */
export interface StockMovement {
  id: ID
  warehouseId: ID
  ingredientId: ID
  /** asosiy birlikda: musbat — kirim, manfiy — chiqim */
  qty: number
  kind: MovementKind
  /** sabab bo'lgan hujjat: buyurtma, kirim yoki ko'chirish id'si */
  refId: ID
  createdAt: Timestamp
}

// ───────────────────────── Sotuv ─────────────────────────

export type OrderType = 'dine_in' | 'takeaway' | 'delivery'
export const ORDER_TYPES: OrderType[] = ['dine_in', 'takeaway', 'delivery']

export type OrderSource = 'cashier' | 'kiosk' | 'mobile'
export const ORDER_SOURCES: OrderSource[] = ['cashier', 'kiosk', 'mobile']

/** Mijozning mobil ilovasi qaysi telefonda. */
export type MobilePlatform = 'android' | 'ios'

/**
 * Mobil ilovadan kelgan buyurtma: mijoz, telefon, manzil (faqat dostavkada) va u tanlagan to'lov — `click` (ilovada
 * to'langan) yoki `cash` (kuryerga / filialda naqd). Kassir "Qabul qilish" bosganda shu to'lov bilan oshxonaga ketadi.
 */
export interface OnlineInfo {
  platform: MobilePlatform
  name: string
  phone: string
  address: string
  payment: 'click' | 'cash'
  /** mijoz belgilagan joy (GPS / xarita) — dostavkada majburiy, filialni server shu bo'yicha tanlaydi */
  location: LatLng | null
}

/**
 * Server o'zi bekor qilgan mobil buyurtma sababi (kassir / admin bekor qilsa — `null`): `timeout` — filial 5 daqiqada
 * qabul qilmadi; `branch_closed` — kutish paytida filial yopildi; `no_branch` — o'tkazadigan ochiq filial yo'q.
 */
export type CancelReason = 'timeout' | 'branch_closed' | 'no_branch'

/** Kuryer "Yetkazib bo'lmadi" sababi: mijoz javob bermadi, manzil topilmadi, mijoz olmadi, boshqa (izohda). */
export type ReturnReason = 'no_answer' | 'wrong_address' | 'refused' | 'other'

/**
 * pending (kioskdan — kassada to'lanmagan; mobil ilovadan — kassir qabul qilmagan) → preparing (to'langan / qabul
 * qilingan, chek oshxonada) → ready (oshpaz yordamchisi ovqatni olib chiqib "Tayyor" bosdi, TV da bir necha daqiqa
 * turadi). Kassir istalgan bosqichda bekor qila oladi.
 */
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'cancelled'

export type PaymentMethod = 'cash' | 'card' | 'click'
export const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'click']
/** Aralash to'lov: tur bo'yicha summalar (yig'indisi = buyurtma summasi), masalan yarmi naqd, yarmi karta. */
export type PaymentSplit = Partial<Record<PaymentMethod, number>>

export interface OrderItem {
  productId: ID
  /** sotilgan paytdagi nom va narx — keyin menyu o'zgarsa ham chek o'zgarmaydi */
  name: LocalizedText
  price: number
  qty: number
}

export interface Order {
  id: ID
  branchId: ID
  /** filialda har kuni 1 dan boshlanadigan raqam — TV va chekda shu ko'rinadi */
  number: number
  type: OrderType
  source: OrderSource
  items: OrderItem[]
  /** butun buyurtmaga izoh */
  note: string
  total: number
  /** to'lov turi; aralashda — eng katta qism. Kassada to'lanmagan kiosk buyurtmasida `null` */
  payment: PaymentMethod | null
  /** faqat aralash to'lovda: tur bo'yicha summalar */
  split: PaymentSplit | null
  /** faqat mobil ilovadan kelganda */
  online: OnlineInfo | null
  status: OrderStatus
  cashierId: ID | null
  shiftId: ID | null
  createdAt: Timestamp
  /** to'langan va oshxonaga ketgan vaqt */
  preparingAt: Timestamp | null
  readyAt: Timestamp | null
  cancelledAt: Timestamp | null
  cancelledBy: ID | null
  cancelReason: CancelReason | null
  /** shu filialga tushgan vaqt (mobil buyurtmaning 5 daqiqalik qabul muddati shundan) */
  routedAt: Timestamp
  /** mobil buyurtma boshqa filialga necha marta o'tkazilgan (ko'pi bilan 1) va oldingi filial */
  transferCount: number
  fromBranchId: ID | null
  /** mobil dostavka: buyurtma berilgandagi hudud narxi (summaga kirmaydi, kuryerga naqd); hududdan tashqarida — `null` */
  deliveryFee: number | null
  // ── kuryer (faqat mobil dostavka; `status` ready da qoladi) ──
  courierId: ID | null
  /** "Olaman" */
  takenAt: Timestamp | null
  /** "Yo'lga chiqdim" */
  departedAt: Timestamp | null
  /** "Yetkazildi" */
  deliveredAt: Timestamp | null
  /** "Yetkazib bo'lmadi" — filialga qaytadi; kassir kuryerdan oladi yoki bekor qiladi */
  returnedAt: Timestamp | null
  returnReason: ReturnReason | null
  returnNote: string
  /** kuryer yo'lidagi navbati (1, 2, …) — server taklif qilgan tartib */
  courierSeq: number | null
  /** oldingi nuqtadan shu manzilgacha, km (to'g'ri chiziq) */
  courierLegKm: number | null
}

/** TV navbat ekrani uchun — mijoz ma'lumotisiz. */
export type TvOrder = Pick<Order, 'id' | 'branchId' | 'number' | 'type' | 'status' | 'preparingAt' | 'readyAt'>

/** Mijoz ko'rinishi (mobil ilova, kiosk javobi) — xodim va kuryer ma'lumotisiz (faqat "yo'lda" / "yetkazildi"). */
export type CustomerOrder = Pick<
  Order,
  | 'id'
  | 'branchId'
  | 'number'
  | 'type'
  | 'items'
  | 'note'
  | 'total'
  | 'payment'
  | 'online'
  | 'status'
  | 'createdAt'
  | 'preparingAt'
  | 'readyAt'
  | 'cancelledAt'
  | 'cancelReason'
  | 'routedAt'
  | 'transferCount'
  | 'fromBranchId'
  | 'deliveryFee'
  | 'departedAt'
  | 'deliveredAt'
  | 'returnedAt'
>

/** Kassir smenasi: kirganda ochiladi (yoki davom etadi), "Smenani topshirish" bilan yopiladi. */
export interface Shift {
  id: ID
  branchId: ID
  cashierId: ID
  openedAt: Timestamp
  closedAt: Timestamp | null
}

/** Smena tushumi: to'langan (bekor qilinmagan) buyurtmalar, to'lov turlari bo'yicha; bekor qilinganlar — faqat soni. */
export interface ShiftSummary {
  orderCount: number
  cancelledCount: number
  total: number
  byPayment: Record<PaymentMethod, number>
}

export type ShiftWithSummary = Shift & { summary: ShiftSummary }

export type ExpenseKind = 'electricity' | 'gas' | 'water' | 'internet' | 'other'
export const EXPENSE_KINDS: ExpenseKind[] = ['electricity', 'gas', 'water', 'internet', 'other']

/** Chiqim — hozircha faqat kommunal to'lovlar. */
export interface Expense {
  id: ID
  branchId: ID
  kind: ExpenseKind
  amount: number
  date: DateKey
  note: string
  createdBy: ID
  createdAt: Timestamp
}

// ───────────────────────── Server javoblari ─────────────────────────

/** Sahifalangan ro'yxat (`?page=&limit=`). */
export interface Page<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

/** Kassa / kiosk / mobil menyusi: shu filialda sotuvdagi taom — narxi bilan, retseptsiz. */
export interface MenuProduct {
  id: ID
  categoryId: ID
  name: LocalizedText
  image: string
  sortOrder: number
  /** `null` — shu filialda sotilmaydi (faqat kassa menyusida keladi — `useMenu(id, { all: true })`) */
  price: number | null
  /** tarkibi (qadoq, yog', ziravorlarsiz) — kioskda ko'rsatiladi */
  composition: LocalizedText[]
}

export interface Menu {
  branchId: ID
  categories: Category[]
  products: MenuProduct[]
}

/** Admin rasm tanlaydigan papkalar (`public/images/...`). */
export type ImageFolder = 'products' | 'categories'

/** Papkadagi rasm (`GET /images`) yoki yuklangani (`POST /images`). */
export interface ImageFile {
  /** taom / kategoriyaning `image` iga yoziladigan yo'l: `/images/products/cola.png` */
  path: string
  folder: ImageFolder
  name: string
  size: number
  modifiedAt: Timestamp
}

/** Yetkazib berish manzili qaysi filialga tushadi (`GET /delivery/route`). */
export interface DeliveryRoute {
  /** buyurtmani oladigan filial; `null` — hech bir filial ochiq emas */
  branchId: ID | null
  /** nuqta tushgan hudud egasi; `null` — hech bir hududga tushmadi */
  zoneBranchId: ID | null
  /** hudud narxi; `null` — hududdan tashqarida, narxni kuryer aytadi */
  fee: number | null
  /** hudud egasi yopiq — zaxira (yoki eng yaqin ochiq) filialga yo'naltirildi */
  redirected: boolean
}

export interface Tally {
  orders: number
  revenue: number
}

export interface DayPoint extends Tally {
  date: DateKey
  expenses: number
}

export interface ProductStat {
  productId: ID
  name: LocalizedText
  qty: number
  revenue: number
}

export interface BranchStat extends Tally {
  branchId: ID
  expenses: number
}

/** Sotuv hisoboti (`GET /reports/sales`). */
export interface SalesReport extends Tally {
  cancelled: number
  cancelledAmount: number
  avgCheck: number
  byPayment: Record<PaymentMethod, number>
  byType: Record<OrderType, Tally>
  bySource: Record<OrderSource, Tally>
  /** soat bo'yicha tushum (0–23) */
  byHour: number[]
  /** oraliqdagi har bir kun — buyurtmasiz kunlar ham (0 bilan) */
  days: DayPoint[]
  /** tushum bo'yicha kamayish tartibida */
  topProducts: ProductStat[]
  byBranch: BranchStat[]
  expenses: number
  expensesByKind: Record<ExpenseKind, number>
  /** tushum − kommunal xarajatlar */
  net: number
}

/** Admin bosh sahifasining "hozir" ko'rsatkichlari (`GET /reports/overview`). */
export interface Overview {
  liveOrders: { branchId: ID; count: number }[]
  lowStock: number
  pendingPurchases: number
  /** birinchi buyurtma kuni — undan oldingi davr bilan solishtirish ma'nosiz; `null` — buyurtma yo'q */
  firstOrderDate: DateKey | null
}

/** Admin buyurtmalar ro'yxatining jami — filtrlangan hammasi bo'yicha (sahifadan qat'i nazar). */
export interface OrdersSummary {
  count: number
  /** to'langan (tayyorlanmoqda / tayyor) — tushum */
  paid: { count: number; amount: number }
  cancelled: { count: number; amount: number }
  /** kassada to'lanmagan kiosk / qabul qilinmagan mobil */
  pending: { count: number; amount: number }
}

/** Smenalar ro'yxatining jami — filtrlangan hammasi bo'yicha. */
export interface ShiftsSummary {
  count: number
  /** hozir ochiq */
  open: number
  revenue: number
  cash: number
}

/** Harakat + sabab bo'lgan hujjat raqami; ko'chirishda — ikkinchi ombor (kirimda qayerdan, chiqimda qayerga). */
export type MovementWithRef = StockMovement & { refNumber: number | null; refWarehouseId: ID | null }

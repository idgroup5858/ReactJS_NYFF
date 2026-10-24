/**
 * Domen modellari. Backend tayyor bo'lguncha hammasi bitta `Db` obyektida (localStorage) yashaydi — jadvallar
 * keyinchalik NestJS dagi entity'larga bir-birga mos tushadi.
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

export interface Branch {
  id: ID
  name: string
  address: string
  phone: string
  active: boolean
  createdAt: Timestamp
}

export type WarehouseKind = 'central' | 'branch'

export interface Warehouse {
  id: ID
  name: string
  kind: WarehouseKind
  /** filial ombori uchun — qaysi filialniki; markaziy omborda `null` */
  branchId: ID | null
}

export type Role = 'admin' | 'cashier' | 'supplier'
export const ROLES: Role[] = ['admin', 'cashier', 'supplier']

export interface User {
  id: ID
  name: string
  role: Role
  /** kassir — filialga bog'langan; admin va ta'minotchi — `null` */
  branchId: ID | null
  /** 4–8 ta raqam */
  pin: string
  active: boolean
  createdAt: Timestamp
}

// ───────────────────────── Menyu ─────────────────────────

export interface Category {
  id: ID
  name: LocalizedText
  image: string
  /** ikonka ("Zamonaviy" mavzuda rasm o'rnida): berilmagan — boshlang'ich kategoriyaniki, bo'sh satr — ikonkasiz */
  icon?: string
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
  sortOrder: number
  active: boolean
}

/** Taomning filialdagi narxi. Yozuv bo'lmasa — taom shu filialda sotilmaydi. */
export interface BranchPrice {
  branchId: ID
  productId: ID
  price: number
  available: boolean
}

// ───────────────────────── Ombor ─────────────────────────

/** Ombor birligi: kirim, qoldiqni ko'rsatish va narx shu birlikda. Asosiy birligi: kg → g, l → ml, pcs → dona. */
export type StockUnit = 'kg' | 'l' | 'pcs'
export const STOCK_UNITS: StockUnit[] = ['kg', 'l', 'pcs']
export type BaseUnit = 'g' | 'ml' | 'pcs'

/** Ombor mahsulotlari guruhi — omborda saralash uchun; `other` va `packaging` taom tarkibida (kioskda) ko'rsatilmaydi. */
export type IngredientGroup = 'bread' | 'meat' | 'dairy' | 'vegetables' | 'frozen' | 'sauces' | 'drinks' | 'other' | 'packaging'
export const INGREDIENT_GROUPS: IngredientGroup[] = ['bread', 'meat', 'dairy', 'vegetables', 'frozen', 'sauces', 'drinks', 'other', 'packaging']

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

export type OrderSource = 'cashier' | 'kiosk'

/**
 * pending (kioskdan, kassada to'lanmagan) → preparing (to'langan, chek oshxonada) → ready (kassir "Tayyor" bosdi, TV da
 * bir necha daqiqa turadi). Kassir istalgan bosqichda bekor qila oladi.
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
  /** taomga izoh: "piyozsiz" */
  note: string
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
  split?: PaymentSplit
  status: OrderStatus
  cashierId: ID | null
  shiftId: ID | null
  createdAt: Timestamp
  /** to'langan va oshxonaga ketgan vaqt */
  preparingAt: Timestamp | null
  readyAt: Timestamp | null
  cancelledAt: Timestamp | null
  cancelledBy: ID | null
}

/** Kassir smenasi: kirganda ochiladi (yoki davom etadi), "Smenani topshirish" bilan yopiladi. */
export interface Shift {
  id: ID
  branchId: ID
  cashierId: ID
  openedAt: Timestamp
  closedAt: Timestamp | null
}

export type ExpenseKind = 'electricity' | 'gas' | 'water' | 'internet' | 'other'
export const EXPENSE_KINDS: ExpenseKind[] = ['electricity', 'gas', 'water', 'internet', 'other']

/** Rasxod — hozircha faqat kommunal to'lovlar. */
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

// ───────────────────────── Baza ─────────────────────────

export interface Db {
  /** sxema versiyasi — o'zgarsa localStorage dagi eski ma'lumot tashlanib, boshlang'ich ma'lumot yoziladi */
  version: number
  branches: Branch[]
  warehouses: Warehouse[]
  users: User[]
  categories: Category[]
  products: Product[]
  prices: BranchPrice[]
  ingredients: Ingredient[]
  stock: StockItem[]
  purchases: Purchase[]
  transfers: Transfer[]
  movements: StockMovement[]
  orders: Order[]
  shifts: Shift[]
  expenses: Expense[]
  /** ketma-ket raqamlar: `order:<filial>:<sana>`, `purchase`, `transfer` */
  counters: Record<string, number>
}

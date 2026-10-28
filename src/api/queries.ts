import type {
  Branch,
  Category,
  CourierStatus,
  DateKey,
  Expense,
  ID,
  ImageFile,
  Ingredient,
  Menu,
  MovementKind,
  MovementWithRef,
  Order,
  OrderSource,
  OrderStatus,
  OrdersSummary,
  OrderType,
  Overview,
  Page,
  PaymentMethod,
  Product,
  Purchase,
  PurchaseStatus,
  Role,
  SalesReport,
  Shift,
  ShiftsSummary,
  ShiftWithSummary,
  AuthUser,
  StockItem,
  Transfer,
  TvOrder,
  User,
  Warehouse,
} from '@/domain/types'
import { http } from './http'
import { useQuery } from './query'

/**
 * Serverdan o'qish (hook'lar). Kalit prefikslari `index.ts` dagi `invalidate` lar va `realtime.ts` dagi jonli
 * prefikslar (`orders:`, `tv:`, `shift:`) bilan bir xil bo'lishi shart.
 */

type Params = Record<string, string | number | boolean | null | undefined>

/** `enabled: false` — hali so'ralmaydi (masalan rol mos emas); `refetchMs` — ochiq turganda davriy yangilash. */
export interface HookOptions {
  enabled?: boolean
  refetchMs?: number
}

const on = (key: string, options: HookOptions) => (options.enabled === false ? null : key)

/** So'rov parametrlari kalitga — tartibi bir xil (bir xil so'rov — bitta kesh yozuvi). */
function keyOf(prefix: string, params: Params = {}): string {
  const parts = Object.keys(params)
    .filter((name) => params[name] !== undefined && params[name] !== null && params[name] !== '')
    .sort()
    .map((name) => `${name}=${params[name]}`)
  return parts.length ? `${prefix}?${parts.join('&')}` : prefix
}

// ───────────────────────── Tashkilot ─────────────────────────

/** Filiallar va hozirgi online holati (`onlineState`) — kirish ekrani, mobil ilova, admin. */
export const useBranches = (options: HookOptions = {}) =>
  useQuery(on('branches', options), () => http.get<Branch[]>('/branches', undefined, { token: null }), options)

export const useWarehouses = () => useQuery('warehouses', () => http.get<Warehouse[]>('/warehouses'))

/** Kirish ekrani: faol xodimlar (PINsiz). */
export const useStaffList = (params: { branchId?: ID | null; role?: Role | null }, options: HookOptions = {}) =>
  useQuery(on(keyOf('staff:', params), options), () => http.get<AuthUser[]>('/auth/staff', params, { token: null }), options)

/** Admin va ta'minotchi: barcha xodimlar (ismlar uchun). */
export const useUsers = () => useQuery('users', () => http.get<User[]>('/users'))

/** Kassir va admin: kuryerlar ismi (kuryer bosqichi yonida) — ochiq kirish ro'yxatida kuryerlar yo'q. */
/** Kuryerlar va holati ("Ishdaman", qo'ldagi buyurtmalar) — socket'da kelmaydi, kerak joyda `refetchMs` bilan. */
export const useCouriers = (options: HookOptions = {}) =>
  useQuery(on('users:couriers', options), () => http.get<CourierStatus[]>('/users/couriers'), options)

// ───────────────────────── Menyu ─────────────────────────

/**
 * Kiosk, mobil: shu filialda sotuvdagi taomlar (narxi bilan) va ular bor kategoriyalar. Kassa — `{ all: true }`:
 * sotilmaydigan faol taomlar ham (`price: null` — "Sotilmaydi") va hamma faol kategoriyalar.
 */
export const useMenu = (branchId: ID | null | undefined, options: { all?: boolean } = {}) =>
  useQuery(
    branchId ? keyOf(`menu:${branchId}`, { all: options.all }) : null,
    () => http.get<Menu>('/menu', { branchId, all: options.all }, { token: null }),
    // kassa kun bo'yi ochiq turadi (oynaga qaytilmaydi) — admin o'zgartirgan narx / "sotuvda" daqiqada yetib keladi
    { refetchMs: options.all ? 60_000 : undefined },
  )

/** Admin: barcha kategoriyalar / taomlar (faol emaslari ham, retsept, narx va vaqtincha sotilmaydigan filiallari bilan). */
export const useCategories = () => useQuery('categories', () => http.get<Category[]>('/categories'))
export const useProducts = () => useQuery('products', () => http.get<Product[]>('/products'))
/** Admin: `public/images` dagi taom va kategoriya rasmlari (papkaga qo'lda tashlanganlari ham), eng yangisi birinchi. */
export const useImages = () => useQuery('images', () => http.get<ImageFile[]>('/images'))

// ───────────────────────── Ombor ─────────────────────────

export const useIngredients = () => useQuery('ingredients', () => http.get<Ingredient[]>('/ingredients'))

/** Qoldiqlar (asosiy birlikda); [warehouseId] berilmasa — hamma omborlar (bitta ombor kerak bo'lsa — `enabled`). */
export const useStock = (warehouseId?: ID, options: HookOptions = {}) =>
  useQuery(on(keyOf('stock', { warehouseId }), options), () => http.get<StockItem[]>('/stock', { warehouseId }), options)

/** Ogohlantirishdagi qoldiqlar (chegaradan kam). */
export const useLowStock = (warehouseId?: ID, options: HookOptions = {}) =>
  useQuery(on(keyOf('stock-low', { warehouseId }), options), () => http.get<StockItem[]>('/stock/low', { warehouseId }), options)

/** Harakatlar (yangisi birinchi) — hujjat raqami (`refNumber`) va ko'chirishda ikkinchi ombor (`refWarehouseId`) bilan. */
export const useMovements = (params: { warehouseId?: ID; ingredientId?: ID; kind?: MovementKind; refId?: ID; page?: number; limit?: number }, enabled = true) =>
  useQuery(enabled ? keyOf('movements', params) : null, () => http.get<Page<MovementWithRef>>('/movements', params))

export const usePurchases = (params: { status?: PurchaseStatus; warehouseId?: ID; page?: number; limit?: number } = {}) =>
  useQuery(keyOf('purchases', params), () => http.get<Page<Purchase>>('/purchases', params))

export const useTransfers = (params: { warehouseId?: ID; page?: number; limit?: number } = {}) =>
  useQuery(keyOf('transfers', params), () => http.get<Page<Transfer>>('/transfers', params))

// ───────────────────────── Buyurtmalar ─────────────────────────

/**
 * Ishdagi buyurtmalar (kassada to'lanmagan kiosk, qabul kutayotgan mobil, tayyorlanayotganlar), eskisi birinchi.
 * Kassir va oshpaz yordamchisi — o'z filiali (branchId kerak emas); admin — [branchId] majburiy.
 */
export const useActiveOrders = (branchId?: ID | null) =>
  useQuery(keyOf('orders:active', { branchId }), () => http.get<Order[]>('/orders/active', { branchId }))

/** Yaqinda (5 daqiqada) tayyor bo'lganlar, yangisi birinchi. */
export const useReadyOrders = (branchId?: ID | null) =>
  useQuery(keyOf('orders:ready', { branchId }), () => http.get<Order[]>('/orders/ready', { branchId }))

/** Kuryer ishidagi dostavkalar (kuryer kutayotgan, olingan, yo'ldagi, qaytgan — hali yetkazilmagan), eskisi birinchi. */
export const useDeliveryOrders = (branchId?: ID | null) =>
  useQuery(keyOf('orders:delivery', { branchId }), () => http.get<Order[]>('/orders/delivery', { branchId }))

export interface OrdersParams {
  branchId?: ID
  status?: OrderStatus
  source?: OrderSource
  type?: OrderType
  shiftId?: ID
  /** aralash to'lovda o'sha qismi bor buyurtma ham */
  payment?: PaymentMethod
  cashierId?: ID
  /** filialdagi kunlik raqam */
  number?: number
  /** yaratilgan vaqti (ISO): `from` kiradi, `to` kirmaydi */
  from?: string
  to?: string
  page?: number
  limit?: number
}

/** Admin: buyurtmalar (yangisi birinchi), sahifalangan; `summary` — filtrlangan hammasi bo'yicha jami. */
export const useOrders = (params: OrdersParams) =>
  useQuery(keyOf('orders:list', { ...params }), () =>
    http.get<Page<Order> & { summary: OrdersSummary }>('/orders', { ...params }),
  )

export const useOrder = (id: ID | null | undefined) =>
  useQuery(id ? `orders:one:${id}` : null, () => http.get<Order>(`/orders/${id}`))

/** TV navbat — PINsiz va kodsiz (ochiq), [branchId] majburiy; noma'lum / faol bo'lmagan filial — 404. */
export const useTvQueue = (branchId: ID | null, options: HookOptions = {}) =>
  useQuery(
    branchId ? on(`tv:${branchId}`, options) : null,
    () => http.get<{ preparing: TvOrder[]; ready: TvOrder[] }>('/tv/queue', { branchId }, { token: null }),
    options,
  )

// ───────────────────────── Smenalar ─────────────────────────

/** Kassirning ochiq smenasi (`null` — yo'q). */
export const useCurrentShift = (enabled = true) =>
  useQuery(enabled ? 'shift:current' : null, async () => (await http.get<{ shift: Shift | null }>('/shifts/current')).shift)

/** Smena, tushumi va buyurtmalari (admin; kassir — faqat o'ziniki). */
export const useShift = (id: ID | null | undefined) =>
  useQuery(id ? `shift:${id}` : null, () => http.get<ShiftWithSummary & { orders: Order[] }>(`/shifts/${id}`))

/**
 * Admin: smenalar — oraliq (ISO) bilan kesishganlari, ochiqlari tepada; `summary` — filtrlangan hammasi bo'yicha jami.
 */
export const useShifts = (params: { branchId?: ID; cashierId?: ID; open?: boolean; from?: string; to?: string; page?: number; limit?: number }) =>
  useQuery(keyOf('shifts', params), () => http.get<Page<ShiftWithSummary> & { summary: ShiftsSummary }>('/shifts', params))

// ───────────────────────── Chiqim va hisobot ─────────────────────────

export const useExpenses = (params: { branchId?: ID; from?: DateKey; to?: DateKey } = {}) =>
  useQuery(keyOf('expenses', params), () => http.get<Expense[]>('/expenses', params))

/** Sotuv hisoboti: [branchId] `null` — butun tarmoq. */
export const useSalesReport = (range: { from: DateKey; to: DateKey; branchId?: ID | null } | null) =>
  useQuery(range ? keyOf('reports:sales', range) : null, () => http.get<SalesReport>('/reports/sales', range!))

/** Admin bosh sahifasi ko'rsatkichlari — faqat admin (boshqa rolda `enabled: false`). */
export const useOverview = (options: HookOptions = {}) =>
  useQuery(on('reports:overview', options), () => http.get<Overview>('/reports/overview'), options)

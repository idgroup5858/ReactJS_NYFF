import type {
  Branch,
  Category,
  CustomerOrder,
  DateKey,
  DeliveryRoute,
  Expense,
  ExpenseKind,
  ID,
  ImageFile,
  ImageFolder,
  Ingredient,
  IngredientGroup,
  LatLng,
  LocalizedText,
  Order,
  OrderType,
  PaymentMethod,
  PaymentSplit,
  Product,
  Purchase,
  RecipeLine,
  Role,
  ShiftWithSummary,
  StockItem,
  StockUnit,
  Transfer,
  TransferItem,
  User,
  WorkHours,
} from '@/domain/types'
import { http } from './http'
import { invalidate } from './query'

/**
 * Ilovaning buyruqlari — backend REST (`API.md`). Komponentlar serverga faqat shu funksiyalar orqali yozadi; o'qish —
 * `queries.ts` dagi hook'lar. Kim bajarayotgani (kassir, admin, ta'minotchi) tokendan olinadi — id'lar yuborilmaydi.
 * Har buyruqdan keyin unga bog'liq ro'yxatlar qaytadan yuklanadi (`invalidate`).
 */

export interface OrderLineInput {
  productId: ID
  qty: number
}

export interface NewOrderInput {
  type: OrderType
  items: OrderLineInput[]
  note?: string
  payment: PaymentMethod
  /** aralash to'lov (kamida 2 tur, yig'indisi = buyurtma summasi) */
  split?: PaymentSplit
}

export interface KioskOrderInput {
  /** kiosk ochilgan filial (`/kiosk/:branchId`) */
  branchId: ID
  type: 'dine_in' | 'takeaway'
  items: OrderLineInput[]
  note?: string
  /** `null` — "kassada to'layman" (buyurtma kassirni kutadi) */
  payment: 'card' | 'click' | null
}

export interface IngredientInput {
  id?: ID
  name: LocalizedText
  group: IngredientGroup
  /** faqat yangi mahsulotda — keyin o'zgarmaydi */
  unit: StockUnit
  /** 1 birlik narxi (faqat admin); berilmasa — o'zgarmaydi, `null` — narxsiz */
  lastPrice?: number | null
  active: boolean
}

export interface UserInput {
  id?: ID
  name: string
  role: Role
  branchId: ID | null
  /** kuryerdan boshqasi: yangi xodimda majburiy; tahrirda bo'sh — eski PIN qoladi */
  pin?: string
  /** faqat kuryer: kirish logini va paroli (tahrirda bo'sh parol — eskisi qoladi) */
  login?: string
  password?: string
  active: boolean
}

export interface BranchInput {
  id?: ID
  name: string
  address: string
  phone: string
  active: boolean
  /** berilmasa — o'zgarmaydi; `null` — 24/7 */
  workHours?: WorkHours | null
}

export interface DeliveryInput {
  location: LatLng | null
  zone: LatLng[]
  fee: number
  fallbackBranchId: ID | null
  onlineEnabled: boolean
}

export interface CategoryInput {
  id?: ID
  name: LocalizedText
  image: string
  icon: string
  active: boolean
}

export interface ProductInput {
  id?: ID
  categoryId: ID
  name: LocalizedText
  image: string
  recipe: RecipeLine[]
  /** barcha filiallarda bir xil narx, butun son > 0 */
  price: number
  /** taom vaqtincha sotilmaydigan filiallar */
  unavailableBranchIds: ID[]
  active: boolean
}

export interface DocumentLine {
  ingredientId: ID
  /** ombor birligida (kg / l / dona) */
  qty: number
}

export interface NewExpenseInput {
  branchId: ID
  kind: ExpenseKind
  amount: number
  date: DateKey
  note?: string
}

/** Buyruqdan keyin bog'liq ro'yxatlarni yangilab, natijani qaytaradi. */
async function then<T>(promise: Promise<T>, ...prefixes: string[]): Promise<T> {
  const result = await promise
  invalidate(...prefixes)
  return result
}

/** Buyurtma o'zgarsa — ro'yxatlar, TV, smena tushumi, qoldiq va hisobotlar. */
const ORDER_KEYS = ['orders:', 'tv:', 'shift:', 'shifts', 'stock', 'movements', 'reports']

export const api = {
  orders: {
    create: (input: NewOrderInput) => then(http.post<Order>('/orders', input), ...ORDER_KEYS),
    /** kiosk — PINsiz va kodsiz (ochiq), filial so'rovda */
    createKiosk: (input: KioskOrderInput) => http.post<CustomerOrder>('/kiosk/orders', input, { token: null }),
    /** kiosk buyurtmasining pulini olish / mobil buyurtmani qabul qilish (mobilda to'lov — mijoz tanlagani) */
    confirm: (orderId: ID, payment?: PaymentMethod, split?: PaymentSplit) =>
      then(http.post<Order>(`/orders/${orderId}/confirm`, { payment, split }), ...ORDER_KEYS),
    ready: (orderId: ID) => then(http.post<Order>(`/orders/${orderId}/ready`), ...ORDER_KEYS),
    reopen: (orderId: ID) => then(http.post<Order>(`/orders/${orderId}/reopen`), ...ORDER_KEYS),
    cancel: (orderId: ID) => then(http.post<Order>(`/orders/${orderId}/cancel`), ...ORDER_KEYS),
    /** dostavkani kuryerdan olish ("Yetkazib bo'lmadi" bilan qaytgan va h.k.) — yana kuryerlarning "Yangi" ro'yxatiga */
    releaseCourier: (orderId: ID) => then(http.post<Order>(`/orders/${orderId}/release-courier`), 'orders:'),
  },
  shifts: {
    /** admin: kassir yopmay ketgan smenani yopish */
    close: (shiftId: ID) => then(http.post<ShiftWithSummary>(`/shifts/${shiftId}/close`), 'shift:', 'shifts', 'branches'),
  },
  purchases: {
    create: (input: { warehouseId: ID; items: DocumentLine[]; note?: string }) =>
      then(http.post<Purchase>('/purchases', input), 'purchases', 'reports'),
    approve: (purchaseId: ID, prices: Record<ID, number>) =>
      then(http.post<Purchase>(`/purchases/${purchaseId}/approve`, { prices }), 'purchases', 'ingredients', 'stock', 'movements', 'reports'),
    reject: (purchaseId: ID) => then(http.post<Purchase>(`/purchases/${purchaseId}/reject`), 'purchases', 'reports'),
  },
  transfers: {
    create: (input: { fromWarehouseId: ID; toWarehouseId: ID; items: TransferItem[]; note?: string }) =>
      then(http.post<Transfer>('/transfers', input), 'transfers', 'stock', 'movements', 'reports'),
  },
  ingredients: {
    save: ({ id, ...input }: IngredientInput) =>
      then(
        id ? http.patch<Ingredient>(`/ingredients/${id}`, input) : http.post<Ingredient>('/ingredients', input),
        'ingredients',
        'menu:',
      ),
    /** ogohlantirish chegarasi — asosiy birlikda (g / ml / dona) */
    setMinQty: (warehouseId: ID, ingredientId: ID, minQty: number) =>
      then(http.put<StockItem>(`/stock/${warehouseId}/${ingredientId}/min-qty`, { minQty }), 'stock', 'reports'),
  },
  users: {
    changeOwnPin: (oldPin: string, newPin: string) => http.put<void>('/auth/pin', { oldPin, newPin }),
    save: ({ id, ...input }: UserInput) =>
      then(id ? http.patch<User>(`/users/${id}`, input) : http.post<User>('/users', input), 'users', 'staff:'),
  },
  branches: {
    save: ({ id, ...input }: BranchInput) =>
      then(id ? http.patch<Branch>(`/branches/${id}`, input) : http.post<Branch>('/branches', input), 'branches', 'warehouses', 'menu:'),
    saveDelivery: (branchId: ID, input: DeliveryInput) =>
      then(http.put<Branch>(`/branches/${branchId}/delivery`, input), 'branches'),
    setOnline: (branchId: ID, enabled: boolean) =>
      then(http.put<Branch>(`/branches/${branchId}/online`, { enabled }), 'branches'),
  },
  delivery: {
    /** xaritadagi nuqta qaysi filialga tushadi va yetkazish narxi (keshlanmaydi — har safar hozirgi holat) */
    route: (point: LatLng) => http.get<DeliveryRoute>('/delivery/route', { lat: point.lat, lng: point.lng }, { token: null }),
  },
  menu: {
    saveCategory: ({ id, ...input }: CategoryInput) =>
      then(id ? http.patch<Category>(`/categories/${id}`, input) : http.post<Category>('/categories', input), 'categories', 'menu:'),
    saveProduct: ({ id, ...input }: ProductInput) =>
      then(id ? http.patch<Product>(`/products/${id}`, input) : http.post<Product>('/products', input), 'products', 'menu:'),
    moveCategory: (id: ID, direction: -1 | 1) =>
      then(http.post<void>(`/categories/${id}/move`, { direction }), 'categories', 'menu:'),
    moveProduct: (id: ID, direction: -1 | 1) => then(http.post<void>(`/products/${id}/move`, { direction }), 'products', 'menu:'),
  },
  images: {
    /** Kompyuterdan rasm: server `public/images/<folder>` ga saqlaydi, nomini tozalaydi (`cola-zero.png`). */
    upload: (file: File, folder: ImageFolder) => {
      const form = new FormData()
      form.append('folder', folder)
      form.append('file', file)
      return then(http.upload<ImageFile>('/images', form), 'images')
    },
  },
  expenses: {
    create: (input: NewExpenseInput) => then(http.post<Expense>('/expenses', input), 'expenses', 'reports'),
    delete: (id: ID) => then(http.delete<void>(`/expenses/${id}`), 'expenses', 'reports'),
  },
  demo: {
    /** bazani demo holatga qaytaradi (faqat `DEMO=1` serverda) */
    reset: () => then(http.post<void>('/demo/reset')),
  },
}

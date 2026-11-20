import type {
  Branch,
  CardBinding,
  CardBindStart,
  CustomerOrder,
  DeliveryRoute,
  GeoPoint,
  Menu,
  MobileOrderRequest,
  MobileOrderResponse,
  MobilePayment,
  MobilePaymentResponse,
  PaymentMethods,
  SavedCard,
} from './types'

/**
 * Mijoz endpointlari (NestJS_NYFF/API.md 5) — hammasi ochiq, token yo'q. Manzil **nisbiy**: sahifa qaysi serverdan
 * ochilsa (`fast.newyork24.uz` yoki `newyork24.uz`), so'rov ham o'sha serverga ketadi — kodda domen yo'q. Ishlab
 * chiqishda `/api` ni Vite backendga uzatadi (`vite.config.ts`). Xodimlar tizimining `VITE_API_URL` i bu yerda
 * ishlatilmaydi: sahifa va API bitta domenda bo'lishi shart (bank sahifasidan qaytish, socket).
 */
const BASE = '/api'

/** Backend xatosi: `code` — API.md 3; server javob bermasa — `status: 0`, `code: 'network'`. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly detail?: string

  constructor(status: number, code: string, detail?: string) {
    super(code)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.detail = detail
  }
}

/** Server vaqti: qabul muddati sanog'i telefon soatiga emas, javobdagi `Date` sarlavhasiga tayanadi. */
let clockOffsetMs = 0

export function serverNow(): number {
  return Date.now() + clockOffsetMs
}

interface Options {
  query?: Record<string, string | number>
  body?: unknown
  headers?: Record<string, string>
}

async function request<T>(method: string, path: string, options: Options = {}): Promise<T> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(options.query ?? {})) params.set(key, String(value))
  const qs = params.toString()
  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(`${BASE}${path}${qs ? `?${qs}` : ''}`, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
    })
  } catch {
    throw new ApiError(0, 'network')
  }

  const date = Date.parse(response.headers.get('Date') ?? '')
  if (!Number.isNaN(date)) clockOffsetMs = date - Date.now()

  if (response.status === 204) return undefined as T
  const text = await response.text()
  let data: unknown
  try {
    data = text ? JSON.parse(text) : undefined
  } catch {
    // proksi xato sahifasi (HTML) — server ishlamayapti
    throw new ApiError(response.status || 0, response.ok ? 'unknown' : 'network')
  }
  if (response.ok) return data as T
  const body = (data ?? {}) as { code?: string; detail?: string }
  throw new ApiError(response.status, body.code ?? 'unknown', body.detail)
}

const clientHeader = (clientKey: string) => ({ 'X-Client-Key': clientKey })
const orderHeader = (token: string) => ({ 'X-Order-Token': token })

function normalizeMenu(menu: Menu): Menu {
  return {
    branchId: menu.branchId,
    categories: menu.categories ?? [],
    products: (menu.products ?? []).map((p) => ({ ...p, price: p.price ?? null, composition: p.composition ?? [] })),
  }
}

export const api = {
  /** Filiallar `onlineState` bilan (so'rov paytidagi surat). */
  branches: () => request<Branch[]>('GET', '/branches'),

  /** Dostavka nuqtasi → buyurtmani oladigan filial va hudud narxi. */
  deliveryRoute: (point: GeoPoint) => request<DeliveryRoute>('GET', '/delivery/route', { query: { lat: point.lat, lng: point.lng } }),

  menu: async (branchId: string) => normalizeMenu(await request<Menu>('GET', '/menu', { query: { branchId } })),

  /** Idempotent emas — tarmoq xatosida avtomatik qayta yuborilmaydi. */
  placeOrder: (body: MobileOrderRequest) => request<MobileOrderResponse>('POST', '/mobile/orders', { body }),

  /** Token noto'g'ri — `404 not_found`. */
  order: (id: string, token: string) =>
    request<CustomerOrder>('GET', `/mobile/orders/${encodeURIComponent(id)}`, { headers: orderHeader(token) }),

  paymentMethods: () => request<PaymentMethods>('GET', '/mobile/payments/methods'),

  /** Karta bilan: bankda to'lov ochiladi (yoki `cardId` — saqlangan kartadan darhol); buyurtma to'langandan keyin. */
  startPayment: (body: MobileOrderRequest, clientKey: string) =>
    request<MobilePaymentResponse>('POST', '/mobile/payments', { body, headers: clientHeader(clientKey) }),

  payment: (id: string, token: string) =>
    request<MobilePayment>('GET', `/mobile/payments/${encodeURIComponent(id)}`, { headers: orderHeader(token) }),

  cards: (clientKey: string) => request<SavedCard[]>('GET', '/mobile/cards', { headers: clientHeader(clientKey) }),

  bindCard: (clientKey: string) => request<CardBindStart>('POST', '/mobile/cards/bind', { headers: clientHeader(clientKey) }),

  cardBinding: (id: string, clientKey: string) =>
    request<CardBinding>('GET', `/mobile/cards/bind/${encodeURIComponent(id)}`, { headers: clientHeader(clientKey) }),

  /** `204` — bankda ham uziladi. */
  deleteCard: (id: string, clientKey: string) =>
    request<void>('DELETE', `/mobile/cards/${encodeURIComponent(id)}`, { headers: clientHeader(clientKey) }),
}

import type { Branch, CustomerOrder, DeliveryRoute, Menu, MenuProduct } from './types'

/*
 * Mini app hech narsani o'zi hisoblamaydi (API.md 5): filial, narx, ochiq / yopiq — serverdan. Bu yerda Android
 * ilovadagi `domain/*` qoidalari: qaysi filial menyusini ko'rsatish, savat, holat matni, formatlash.
 */

export type OrderMode = 'delivery' | 'takeaway'

// ---------------------------------------------------------------- filial va menyu (Android `Shop.kt`)

export const ALL_CATEGORIES = '__all__'

/** Mijozga ko'rsatiladigan filiallar — faol emaslari chiqmaydi. */
export function visibleBranches(branches: Branch[]): Branch[] {
  return branches.filter((b) => b.active !== false && b.onlineState !== 'inactive')
}

export const isOpen = (branch: Branch) => branch.onlineState === 'open'

/**
 * Menyu qaysi filialniki: olib ketishda — tanlangani (tanlanmagan bo'lsa birinchi ochiq), dostavkada — server tanlagani
 * (`route.branchId`). Manzil yo'q yoki ochiq filial yo'q — ko'rib turish uchun birinchi ochiq (yoki birinchi) filial.
 */
export function menuBranchId(mode: OrderMode, branches: Branch[], takeawayBranchId: string | null, route: DeliveryRoute | null): string | null {
  const visible = visibleBranches(branches)
  const browse = (visible.find(isOpen) ?? visible[0])?.id ?? null
  if (mode === 'takeaway') return visible.find((b) => b.id === takeawayBranchId)?.id ?? browse
  const routed = route?.branchId
  return routed && branches.some((b) => b.id === routed) ? routed : browse
}

/** Olib ketish filiali: tanlangani ro'yxatda bo'lsa — o'sha, aks holda birinchi ochiq. */
export function takeawayBranch(branches: Branch[], takeawayBranchId: string | null): Branch | null {
  const visible = visibleBranches(branches)
  return visible.find((b) => b.id === takeawayBranchId) ?? visible.find(isOpen) ?? null
}

/** "Faqat zalda" taomlar (va faqat shulardan iborat kategoriya) olib tashlanadi. */
export function forMobile(menu: Menu): Menu {
  if (!menu.products.some((p) => p.dineInOnly)) return menu
  const products = menu.products.filter((p) => !p.dineInOnly)
  const withProducts = new Set(products.map((p) => p.categoryId))
  return { ...menu, products, categories: menu.categories.filter((c) => withProducts.has(c.id)) }
}

export function selectedCategory(menu: Menu | null, chosen: string | null): string {
  return menu?.categories.find((c) => c.id === chosen)?.id ?? ALL_CATEGORIES
}

/** "Barchasi" — hamma kategoriyalardan, kategoriyalar tartibida; aks holda shu kategoriyaniki. */
export function productsOf(menu: Menu | null, categoryId: string): MenuProduct[] {
  const sold = (menu?.products ?? []).filter((p) => p.price != null)
  if (categoryId !== ALL_CATEGORIES) return sold.filter((p) => p.categoryId === categoryId)
  const order = new Map((menu?.categories ?? []).map((c, i) => [c.id, i]))
  return sold.filter((p) => order.has(p.categoryId)).sort((a, b) => order.get(a.categoryId)! - order.get(b.categoryId)!)
}

// ---------------------------------------------------------------- savat (Android `Cart.kt`)

/** Savat qatori — narx saqlanmaydi, doim menyu filialining joriy narxidan. */
export interface CartLine {
  key: string
  productId: string
  qty: number
}

export interface PricedLine {
  line: CartLine
  /** menyuda yo'q (shu filialda sotilmaydi) — `null` */
  product: MenuProduct | null
}

export const lineAvailable = (l: PricedLine) => l.product?.price != null
export const lineSum = (l: PricedLine) => (l.product?.price ?? 0) * l.line.qty

export const cart = {
  add(lines: CartLine[], productId: string, qty = 1): CartLine[] {
    const same = lines.find((l) => l.productId === productId)
    if (!same) return [...lines, { key: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`, productId, qty }]
    return lines.map((l) => (l.key === same.key ? { ...l, qty: l.qty + qty } : l))
  },
  /** Soni 0 ga tushsa qator o'chadi. */
  change(lines: CartLine[], key: string, delta: number): CartLine[] {
    return lines.flatMap((l) => (l.key !== key ? [l] : l.qty + delta > 0 ? [{ ...l, qty: l.qty + delta }] : []))
  },
  remove: (lines: CartLine[], key: string) => lines.filter((l) => l.key !== key),
  counts(lines: CartLine[]): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const l of lines) counts[l.productId] = (counts[l.productId] ?? 0) + l.qty
    return counts
  },
  price(lines: CartLine[], menu: Menu | null): PricedLine[] {
    return lines.map((line) => ({ line, product: menu?.products.find((p) => p.id === line.productId && p.price != null) ?? null }))
  },
}

// ---------------------------------------------------------------- buyurtma holati (Android `OrderProgress.kt`, API.md 5.6)

export type Headline =
  | 'waiting'
  | 'cooking'
  | 'readyDelivery'
  | 'readyPickup'
  | 'onTheWay'
  | 'delivered'
  | 'returned'
  | 'cancelled'
  | 'cancelTimeout'
  | 'cancelTimeoutPickup'
  | 'cancelBranchClosed'
  | 'cancelBranchClosedPickup'
  | 'cancelNoBranch'

export type TrackingStep = 'placed' | 'cooking' | 'readyPickup' | 'onTheWay' | 'delivered'

const ACCEPT_WINDOW_MS = 5 * 60_000
const FINISHED_VISIBLE_MS = 60 * 60_000
const OPEN_DELIVERY_VISIBLE_MS = 12 * 60 * 60_000

export const progress = {
  ACCEPT_WINDOW_MS,

  headline(order: CustomerOrder): Headline {
    const pickup = order.type !== 'delivery'
    switch (order.status) {
      case 'preparing':
        return 'cooking'
      case 'ready':
        if (pickup) return 'readyPickup'
        if (order.deliveredAt) return 'delivered'
        if (order.returnedAt) return 'returned'
        if (order.departedAt) return 'onTheWay'
        return 'readyDelivery'
      case 'cancelled':
        switch (order.cancelReason) {
          case 'timeout':
            return pickup ? 'cancelTimeoutPickup' : 'cancelTimeout'
          case 'branch_closed':
            return pickup ? 'cancelBranchClosedPickup' : 'cancelBranchClosed'
          case 'no_branch':
            return 'cancelNoBranch'
          default:
            return 'cancelled'
        }
      default:
        return 'waiting'
    }
  },

  steps(order: CustomerOrder): TrackingStep[] {
    return order.type === 'delivery' ? ['placed', 'cooking', 'onTheWay', 'delivered'] : ['placed', 'cooking', 'readyPickup']
  },

  /** Joriy bosqich indeksi; dostavka tayyor, kuryer hali chiqmagan — "tayyorlanmoqda" bosqichida ("Tayyor"). */
  step(order: CustomerOrder): number {
    if (order.status === 'preparing') return 1
    if (order.status !== 'ready') return 0
    if (order.type !== 'delivery') return 2
    if (order.deliveredAt) return 3
    if (order.departedAt) return 2
    return 1
  },

  completed: (order: CustomerOrder) => order.status === 'ready' && (order.type !== 'delivery' || !!order.deliveredAt),

  /** Qabul muddati tugaydigan vaqt (`routedAt` + 5 daqiqa), ms; faqat `pending` da. */
  acceptDeadline(order: CustomerOrder): number | null {
    if (order.status !== 'pending') return null
    const routed = parseTime(order.routedAt) ?? parseTime(order.createdAt)
    return routed == null ? null : routed + ACCEPT_WINDOW_MS
  },

  /** Server holatni yana o'zgartirishi mumkinmi (bekor qilingan va yetkazilgan — yakuniy). */
  isLive: (order: CustomerOrder) => order.status !== 'cancelled' && !order.deliveredAt,

  /** Bosh sahifadagi "Buyurtmam": ishdagi, yo'ldagi, qaytgan yoki yaqinda tugagan. */
  isCurrent(order: CustomerOrder, now = Date.now()): boolean {
    const within = (iso: string | null, window: number) => {
      const at = parseTime(iso)
      return at != null && now - at < window
    }
    switch (order.status) {
      case 'pending':
      case 'preparing':
        return true
      case 'ready':
        if (order.type === 'delivery' && !order.deliveredAt) return within(order.createdAt, OPEN_DELIVERY_VISIBLE_MS)
        return within(order.deliveredAt ?? order.readyAt, FINISHED_VISIBLE_MS)
      default:
        return false
    }
  },
}

// ---------------------------------------------------------------- formatlash (Android `Format.kt`)

/** Uzilmaydigan bo'shliq: "16 866 so'm" ikki qatorga bo'linmasin. */
export const NBSP = ' '

export function parseTime(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  return Number.isNaN(t) ? null : t
}

export const format = {
  /** 1234567 → "1 234 567". */
  number(value: number): string {
    const digits = Math.abs(Math.round(value)).toString()
    const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
    return value < 0 ? `−${grouped}` : grouped
  },
  money: (value: number, unit: string) => `${format.number(value)}${NBSP}${unit}`,
  /** 7 → "#007". */
  orderNumber: (n: number) => `#${String(n).padStart(3, '0')}`,
  time(iso: string | null | undefined): string {
    const t = parseTime(iso)
    if (t == null) return ''
    const d = new Date(t)
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  },
  dateTime(iso: string | null | undefined): string {
    const t = parseTime(iso)
    if (t == null) return ''
    const d = new Date(t)
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  },
  /** soniyalar → "3:07" */
  countdown(seconds: number): string {
    const safe = Math.max(0, Math.floor(seconds))
    return `${Math.floor(safe / 60)}:${pad(safe % 60)}`
  },
  /** `9860********4764` → "9860 •••• 4764"; o'qilmasa — `null`. */
  maskedPan(value: string | null | undefined): string | null {
    const digits = (value ?? '').replace(/[^\d*]/g, '')
    const first = /^\d{0,4}/.exec(digits)?.[0] ?? ''
    const last = /\d{0,4}$/.exec(digits)?.[0] ?? ''
    return first.length === 4 && last.length === 4 && digits.length > 8 ? `${first} •••• ${last}` : null
  },
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// ---------------------------------------------------------------- telefon (Android `Phone`)

/** `+998` dan keyingi 9 ta raqam saqlanadi, serverga "+998 90 123 45 67" ko'rinishida yuboriladi. */
export const phone = {
  PREFIX: '+998',
  LENGTH: 9,
  /** faqat raqamlar; to'liq raqam (`+998 90 …`) qo'yilsa — `998` tashlanadi */
  clean(input: string): string {
    const digits = input.replace(/\D/g, '')
    const local = digits.length > 9 && digits.startsWith('998') ? digits.slice(3) : digits
    return local.slice(0, 9)
  },
  isComplete: (local: string) => /^\d{9}$/.test(local),
  /** "901234567" → "90 123 45 67" */
  group: (local: string) => [local.slice(0, 2), local.slice(2, 5), local.slice(5, 7), local.slice(7, 9)].filter(Boolean).join(' '),
  full: (local: string) => `+998 ${phone.group(local)}`,
}

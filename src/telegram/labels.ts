import { format, progress } from './domain'
import type { Dict } from './i18n'
import type { Branch, CustomerOrder, SavedCard } from './types'

/** Mini app matn va ko'rinish yordamchilari (komponent emas) — Android `ui/common/Texts.kt` dagidek. */

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

export const money = (t: Dict, value: number) => format.money(value, t.soum)

/** Hudud narxi: `0` — "Bepul", `null` — "Yetkazish narxini kuryer aytadi". */
export function feeText(t: Dict, fee: number | null): string {
  if (fee == null) return t.courierFee
  return fee === 0 ? t.free : money(t, fee)
}

/** "Yetkazib berish: 10 000 so'm"; narx yo'q — faqat "Yetkazish narxini kuryer aytadi". */
export const deliveryFeeLine = (t: Dict, fee: number | null) => (fee == null ? t.courierFee : `${t.deliveryFee}: ${feeText(t, fee)}`)

/** Filial holati (API.md 5.1). */
export function branchStateText(t: Dict, branch: Branch): string {
  switch (branch.onlineState) {
    case 'open':
      return t.stateOpen
    case 'off_hours':
      return branch.workHours ? t.closedUntil(branch.workHours.open) : t.closedNow
    case 'paused':
      return t.statePaused
    default:
      return t.closedNow
  }
}

/** Holat → asosiy matn (API.md 5.6). */
export function headlineText(t: Dict, order: CustomerOrder): string {
  const texts = {
    waiting: t.stepPlaced,
    cooking: t.stepCooking,
    readyDelivery: t.readyWaitCourier,
    readyPickup: t.stepReadyPickup,
    onTheWay: t.stepOnTheWay,
    delivered: t.stepDelivered,
    returned: t.returned,
    cancelled: t.cancelled,
    cancelTimeout: t.cancelTimeout,
    cancelTimeoutPickup: t.cancelTimeoutPickup,
    cancelBranchClosed: t.cancelBranchClosed,
    cancelBranchClosedPickup: t.cancelBranchClosedPickup,
    cancelNoBranch: t.noBranchOpen,
  }
  return texts[progress.headline(order)]
}

/** Ro'yxatdagi qisqa holat belgisi. */
export function statusText(t: Dict, order: CustomerOrder): string {
  switch (progress.headline(order)) {
    case 'waiting':
      return t.statusPending
    case 'cooking':
      return t.statusPreparing
    case 'readyDelivery':
    case 'readyPickup':
      return t.statusReady
    case 'onTheWay':
      return t.statusOnTheWay
    case 'delivered':
      return t.statusDelivered
    case 'returned':
      return t.statusReturned
    default:
      return t.statusCancelled
  }
}

/** Holat rangi: bekor — qizil, qaytdi — sariq, tugadi — yashil, jarayonda — to'q sariq. */
export function statusColor(order: CustomerOrder): string {
  if (order.status === 'cancelled') return 'var(--nyt-danger)'
  if (progress.headline(order) === 'returned') return 'var(--nyt-warning)'
  if (progress.completed(order)) return 'var(--nyt-success)'
  return 'var(--nyt-select)'
}

/** "Karta bilan to'langan" / "Click orqali to'langan" / "Naqd — kuryerga" / "Naqd — filialda". */
export function paymentText(t: Dict, order: CustomerOrder): string {
  const payment = order.online?.payment
  if (!payment) return ''
  if (payment === 'card') return t.paidCard
  if (payment === 'click') return t.paidOnline
  return order.type === 'delivery' ? t.payOnDelivery : t.payOnPickup
}

/** Karta nomi: "9860 •••• 4764" (bank raqam bermagan bo'lsa — "Karta"). */
export const cardTitle = (t: Dict, card: SavedCard) => format.maskedPan(card.maskedPan) ?? t.payCard

/** Taom / kategoriya rasmi — backenddan (shu domen); ikonkalar (`/images/icons`) — web ilovaning `public/` papkasidan. */
export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return path
  if (/^\/images\/(products|categories)\//.test(path)) return path
  return import.meta.env.BASE_URL + path.replace(/^\//, '')
}

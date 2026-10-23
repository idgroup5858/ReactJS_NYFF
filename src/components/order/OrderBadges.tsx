import type { OrderStatus, OrderType } from '@/domain/types'
import { useT } from '@/i18n'
import { ORDER_TYPE_ICONS } from './orderIcons'

/** Buyurtma turi: ikonka + nom (kassa, oshxona, TV — hamma joyda bir xil). */
export function OrderTypeBadge({ type, className = '' }: { type: OrderType; className?: string }) {
  const t = useT()
  const Icon = ORDER_TYPE_ICONS[type]
  return (
    <span className={`inline-flex items-center gap-1 rounded-chip bg-neutral-100 px-1.5 py-0.5 text-[11px] font-semibold text-neutral-700 ${className}`}>
      <Icon size={12} />
      {t.orderType[type]}
    </span>
  )
}

const STATUS_CLASSES: Record<OrderStatus, string> = {
  new: 'bg-sky-50 text-sky-700',
  preparing: 'bg-brand-100 text-brand-800',
  ready: 'bg-emerald-50 text-emerald-700',
  served: 'bg-neutral-100 text-neutral-500',
  cancelled: 'bg-red-50 text-red-700',
}

/** GoMeal'da — ichi bo'sh, rangli chegarali kapsula ("Completed", "Delivering to you" kabi). */
const STATUS_GOMEAL = 'gomeal:rounded-full gomeal:border gomeal:border-current gomeal:bg-transparent gomeal:px-2.5 gomeal:font-medium gomeal:tracking-normal gomeal:normal-case'

export function StatusPill({ status }: { status: OrderStatus }) {
  const t = useT()
  return (
    <span className={`inline-flex items-center rounded-chip px-1.5 py-0.5 text-[11px] font-bold tracking-wide uppercase ${STATUS_CLASSES[status]} ${STATUS_GOMEAL}`}>
      {t.orderStatus[status]}
    </span>
  )
}

/** Kiosk orqali kelgan buyurtma belgisi. */
export function KioskBadge() {
  const t = useT()
  return <span className="rounded-chip bg-coal px-1.5 py-0.5 text-[11px] font-semibold text-taxi">{t.orders.kiosk}</span>
}

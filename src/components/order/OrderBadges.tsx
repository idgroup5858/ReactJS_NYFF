import { Smartphone } from 'lucide-react'
import type { OrderSource, OrderStatus, OrderType } from '@/domain/types'
import { useT } from '@/i18n'
import { ORDER_TYPE_ICONS } from './orderIcons'

/** Buyurtma turi: ikonka + nom (kassa, kiosk, TV — hamma joyda bir xil). */
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

/** Holat ranglari: to'ldirilgan fon + to'q matn + rangli nuqta — jadvalda bir qarashda ajralib tursin (yozuv ham bor). */
const STATUS_CLASSES: Record<OrderStatus, { pill: string; dot: string }> = {
  pending: { pill: 'bg-sky-100 text-sky-800 ring-sky-300', dot: 'bg-sky-500' },
  preparing: { pill: 'bg-amber-100 text-amber-900 ring-amber-300', dot: 'bg-amber-500' },
  ready: { pill: 'bg-emerald-100 text-emerald-800 ring-emerald-300', dot: 'bg-emerald-500' },
  cancelled: { pill: 'bg-red-100 text-red-800 ring-red-300', dot: 'bg-red-500' },
}

/** GoMeal'da — kapsula shakli, oddiy yozuv (KATTA HARF emas). */
const STATUS_GOMEAL = 'gomeal:rounded-full gomeal:px-2.5 gomeal:tracking-normal gomeal:normal-case'

/** `online` — mobil buyurtma: kutish holati "To'lanmagan" emas, "Qabul kutilmoqda" (Click bilan to'langan bo'lishi mumkin). */
export function StatusPill({ status, online = false }: { status: OrderStatus; online?: boolean }) {
  const t = useT()
  const { pill, dot } = STATUS_CLASSES[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-chip px-2 py-0.5 text-[11px] font-bold tracking-wide whitespace-nowrap uppercase ring-1 ring-inset ${pill} ${STATUS_GOMEAL}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      {status === 'pending' && online ? t.orders.awaitingAccept : t.orderStatus[status]}
    </span>
  )
}

/** Buyurtma qayerdan kelgani: kiosk yoki mobil ilova ("Online"); kassadan bo'lsa — hech narsa. */
export function SourceBadge({ source }: { source: OrderSource }) {
  const t = useT()
  if (source === 'kiosk') return <span className="rounded-chip bg-coal px-1.5 py-0.5 text-[11px] font-semibold text-taxi">{t.orders.kiosk}</span>
  if (source === 'mobile')
    return (
      <span className="inline-flex items-center gap-1 rounded-chip bg-sky-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
        <Smartphone size={11} />
        {t.orders.online}
      </span>
    )
  return null
}

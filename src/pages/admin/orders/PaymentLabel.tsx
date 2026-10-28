import { PAYMENT_ICONS } from '@/components/order/orderIcons'
import type { Order } from '@/domain/types'
import { useT } from '@/i18n'

/** Jadvaldagi to'lov turi: ikonka + nomi, aralashda — "Aralash", to'lanmagan bo'lsa — "—". */
export default function PaymentLabel({ order }: { order: Order }) {
  const t = useT()
  if (order.split) return <>{t.checkout.mixed}</>
  if (!order.payment) return <span className="text-neutral-400">—</span>
  const Icon = PAYMENT_ICONS[order.payment]
  return (
    <span className="flex items-center gap-1.5">
      <Icon size={14} className="text-neutral-400" />
      {t.payment[order.payment]}
    </span>
  )
}

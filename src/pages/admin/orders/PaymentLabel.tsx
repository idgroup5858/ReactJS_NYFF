import { PAYMENT_ICONS } from '@/components/order/orderIcons'
import type { Order } from '@/domain/types'
import { useT } from '@/i18n'

/**
 * Jadvaldagi to'lov turi: ikonka + nomi, aralashda — "Aralash", to'lanmagan bo'lsa — "—". Ilovada karta bilan oldindan
 * to'langan mobil buyurtma kassir qabul qilmasdan ham "Karta"; bekor qilingan bo'lsa — qizil (admin pulni qaytaradi).
 */
export default function PaymentLabel({ order }: { order: Order }) {
  const t = useT()
  if (order.split) return <>{t.checkout.mixed}</>
  const prepaidCard = order.online?.payment === 'card'
  const method = order.payment ?? (prepaidCard ? 'card' : null)
  if (!method) return <span className="text-neutral-400">—</span>
  const Icon = PAYMENT_ICONS[method]
  const refund = prepaidCard && order.status === 'cancelled'
  return (
    <span className={`flex items-center gap-1.5 ${refund ? 'font-semibold text-red-700' : ''}`} title={prepaidCard ? (refund ? t.orders.refundCard : t.orders.paidCard) : undefined}>
      <Icon size={14} className={refund ? 'text-red-500' : 'text-neutral-400'} />
      {t.payment[method]}
    </span>
  )
}

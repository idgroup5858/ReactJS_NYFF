import { Printer } from 'lucide-react'
import { useBranches, useUsers } from '@/api/queries'
import { CourierBadge } from '@/components/order/CourierStatus'
import { OrderTypeBadge, SourceBadge, StatusPill } from '@/components/order/OrderBadges'
import { PAYMENT_ICONS } from '@/components/order/orderIcons'
import { tdClass, thClass } from '@/components/ui/styles'
import { courierStage, orderPayments } from '@/domain/rules'
import { PAYMENT_METHODS, type ID, type Order } from '@/domain/types'
import { useLocalize, useT } from '@/i18n'
import { formatDateTime, formatMoney, formatOnlinePayment } from '@/lib/format'
import { printReceipt } from '@/lib/printReceipt'

/** To'langan (bekor qilinmagan) buyurtma chekini qayta chiqarish; boshqa holatda — hech narsa. */
export function PrintReceiptButton({ order, className = '' }: { order: Order; className?: string }) {
  const t = useT()
  const branches = useBranches().data ?? []
  if (order.status !== 'preparing' && order.status !== 'ready') return null
  const branchName = branches.find((b) => b.id === order.branchId)?.name ?? ''
  return (
    <button type="button" onClick={() => printReceipt(order, branchName)} className={`btn-ghost flex h-10 items-center gap-2 rounded px-4 text-xs font-bold ${className}`}>
      <Printer size={16} />
      {t.orders.print}
    </button>
  )
}

/**
 * Buyurtma tafsiloti (admin uchun, faqat ko'rish): taomlar va izohlar, to'lov (aralashda — tur bo'yicha), kassir, manba,
 * mobil dostavkada — kuryer va yetkazish narxi, jarayon vaqtlari (yaratildi → to'landi → tayyor → kuryer oldi → yo'lda →
 * yetkazildi / qaytdi yoki bekor qilindi, kim tomonidan). Oynada ham, sahifada ham.
 */
export default function OrderDetailsBody({ order }: { order: Order }) {
  const t = useT()
  const users = useUsers().data ?? []
  const localize = useLocalize()
  const userName = (id: ID | null) => (id ? (users.find((u) => u.id === id)?.name ?? '—') : '—')
  const payments = PAYMENT_METHODS.map((method) => ({ method, amount: orderPayments(order)[method] })).filter((part) => part.amount > 0)
  const stage = courierStage(order)
  const returnText = order.returnReason ? [t.courier.reasons[order.returnReason], order.returnNote].filter(Boolean).join(' — ') : null

  const timeline = [
    { label: t.admin.orders.created, at: order.createdAt, by: null, note: null },
    { label: t.admin.orders.paid, at: order.preparingAt, by: null, note: null },
    { label: t.admin.orders.ready, at: order.readyAt, by: null, note: null },
    { label: t.courier.stages.taken, at: order.takenAt, by: order.courierId, note: null },
    { label: t.courier.stages.on_the_way, at: order.departedAt, by: null, note: null },
    { label: t.courier.stages.delivered, at: order.deliveredAt, by: null, note: null },
    { label: t.courier.stages.returned, at: order.returnedAt, by: null, note: returnText },
    { label: t.admin.orders.cancelled, at: order.cancelledAt, by: order.cancelledBy, note: null },
  ].flatMap((step) => (step.at ? [{ ...step, at: step.at }] : []))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusPill status={order.status} online={!!order.online} />
        <OrderTypeBadge type={order.type} />
        <SourceBadge source={order.source} />
        {stage && <CourierBadge stage={stage} />}
      </div>

      <div className="overflow-x-auto rounded-card border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50">
            <tr>
              <th className={thClass}>{t.admin.orders.items}</th>
              <th className={`${thClass} text-right`}>{t.admin.orders.qty}</th>
              <th className={`${thClass} text-right`}>{t.admin.orders.price}</th>
              <th className={`${thClass} text-right`}>{t.admin.orders.total}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {order.items.map((item, index) => (
              <tr key={`${item.productId}-${index}`}>
                <td className={`${tdClass} whitespace-normal`}>
                  <span className="font-semibold text-neutral-900">{localize(item.name)}</span>
                </td>
                <td className={`${tdClass} text-right tabular-nums`}>{item.qty}</td>
                <td className={`${tdClass} text-right text-neutral-600 tabular-nums`}>{formatMoney(item.price, t)}</td>
                <td className={`${tdClass} text-right font-semibold tabular-nums`}>{formatMoney(item.price * item.qty, t)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-neutral-200">
            <tr>
              <td colSpan={3} className={`${tdClass} font-bold`}>
                {t.kassa.total}
              </td>
              <td className={`${tdClass} text-right text-base font-extrabold tabular-nums`}>{formatMoney(order.total, t)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {order.note && (
        <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">
          <span className="font-semibold">{t.common.note}:</span> {order.note}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-neutral-500">{t.admin.orders.payment}</dt>
            <dd className="text-right font-semibold">
              {payments.length === 0
                ? order.online
                  ? formatOnlinePayment(order.online, order.type, t)
                  : t.orderStatus.pending
                : payments.map(({ method, amount }) => {
                    const Icon = PAYMENT_ICONS[method]
                    return (
                      <span key={method} className="flex items-center justify-end gap-1.5 tabular-nums">
                        <Icon size={14} className="text-neutral-400" />
                        {t.payment[method]}
                        {payments.length > 1 && <span className="text-neutral-600">· {formatMoney(amount, t)}</span>}
                      </span>
                    )
                  })}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-neutral-500">{t.admin.orders.cashier}</dt>
            <dd className="font-semibold">{userName(order.cashierId)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-neutral-500">{t.admin.orders.source}</dt>
            <dd className="font-semibold">
              {t.orderSource[order.source]}
              {order.online && ` · ${t.mobilePlatform[order.online.platform]}`}
            </dd>
          </div>
          {order.online && (
            <>
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-500">{t.orders.customer}</dt>
                <dd className="font-semibold">{order.online.name || '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-500">{t.orders.phone}</dt>
                <dd className="font-semibold tabular-nums">{order.online.phone}</dd>
              </div>
              {order.online.address && (
                <div className="flex justify-between gap-3">
                  <dt className="text-neutral-500">{t.orders.address}</dt>
                  <dd className="text-right font-semibold">{order.online.address}</dd>
                </div>
              )}
            </>
          )}
          {stage && (
            <>
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-500">{t.courier.fee}</dt>
                <dd className="font-semibold tabular-nums">{order.deliveryFee === null ? t.courier.feeByCourier : formatMoney(order.deliveryFee, t)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-500">{t.courier.courier}</dt>
                <dd className="font-semibold">{userName(order.courierId)}</dd>
              </div>
            </>
          )}
        </dl>

        <div className="space-y-1.5 text-sm">
          <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-500 uppercase">{t.admin.orders.timeline}</p>
          <ol className="space-y-1.5 border-l-2 border-neutral-200 pl-3">
            {timeline.map((step) => (
              <li key={step.label}>
                <p className="font-semibold text-neutral-900">{step.label}</p>
                <p className="text-xs text-neutral-500 tabular-nums">
                  {formatDateTime(step.at)}
                  {step.by && ` · ${userName(step.by)}`}
                </p>
                {step.note && <p className="text-xs font-semibold text-red-700">{step.note}</p>}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

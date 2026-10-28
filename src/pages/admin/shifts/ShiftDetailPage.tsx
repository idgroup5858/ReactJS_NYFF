import { Clock, Power, ReceiptText } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { api } from '@/api'
import { ApiError } from '@/api/http'
import { useBranches, useShift, useUsers } from '@/api/queries'
import { OrderTypeBadge, SourceBadge, StatusPill } from '@/components/order/OrderBadges'
import { PAYMENT_ICONS } from '@/components/order/orderIcons'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { Card, CardHeader } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import { tdClass, thClass } from '@/components/ui/styles'
import { usePagination } from '@/components/ui/usePagination'
import { shiftMinutes } from '@/domain/rules'
import { PAYMENT_METHODS } from '@/domain/types'
import { errorMessage, useLocalize, useT } from '@/i18n'
import { formatDateTime, formatMoney, formatNumber, formatOrderNumber, formatTime } from '@/lib/format'
import { confirmDialog, showToast } from '@/lib/swal'
import { useNow } from '@/lib/useNow'
import ListPlaceholder from '../orders/ListPlaceholder'
import PaymentLabel from '../orders/PaymentLabel'
import { SHIFTS_PATH, shiftOrderPath } from './paths'

/**
 * Smena sahifasi (Smenalar → Smena): kim, qayerda, qachon, qancha — to'lov turlari bo'yicha; pastda smena buyurtmalari
 * (10 tadan). Buyurtmani bosganda — uning tarkibi sahifasi. Ochiq smenani admin yopa oladi (kassir yopmay ketgan bo'lsa).
 */
export default function ShiftDetailPage() {
  const t = useT()
  const localize = useLocalize()
  const navigate = useNavigate()
  const now = useNow(60_000)
  const { shiftId } = useParams()
  const query = useShift(shiftId)
  const branches = useBranches().data ?? []
  const users = useUsers().data ?? []
  const shift = query.data
  const orders = shift ? [...shift.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : []
  const { pageItems, pagination } = usePagination(orders)

  if (!shift) {
    if (query.error instanceof ApiError && query.error.code === 'not_found') return <Navigate to={SHIFTS_PATH} replace />
    return (
      <div className="space-y-5">
        <Breadcrumbs items={[{ label: t.admin.shifts.title, to: SHIFTS_PATH }, { label: '…' }]} />
        <ListPlaceholder icon={Clock} empty="" query={query} />
      </div>
    )
  }

  const { summary } = shift
  const minutes = shiftMinutes(shift, now)
  const cashierName = users.find((u) => u.id === shift.cashierId)?.name ?? '—'
  const title = t.admin.shifts.details(cashierName)
  const branchName = branches.find((b) => b.id === shift.branchId)?.name ?? '—'

  const closeShift = async () => {
    if (!(await confirmDialog(t.admin.shifts.closeTitle(cashierName), t.admin.shifts.closeText, t.admin.shifts.close))) return
    try {
      await api.shifts.close(shift.id)
      showToast(t.admin.shifts.closedToast)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  const rows: { label: string; value: string; tone?: string }[] = [
    { label: t.common.branch, value: branchName },
    { label: t.report.opened, value: formatDateTime(shift.openedAt) },
    shift.closedAt
      ? { label: t.report.closed, value: formatDateTime(shift.closedAt) }
      : { label: t.report.closed, value: t.admin.shifts.stillOpen, tone: 'text-emerald-700' },
    { label: t.admin.shifts.duration, value: t.admin.shifts.durationValue(Math.floor(minutes / 60), minutes % 60) },
    { label: t.report.orders, value: formatNumber(summary.orderCount) },
    { label: t.report.cancelled, value: formatNumber(summary.cancelledCount), tone: summary.cancelledCount > 0 ? 'text-red-700' : undefined },
  ]

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: t.admin.shifts.title, to: SHIFTS_PATH }, { label: title }]} />
      <PageHeader
        title={title}
        description={`${branchName} · ${formatDateTime(shift.openedAt)}`}
        actions={
          shift.closedAt === null && (
            <button type="button" onClick={() => void closeShift()} className="btn-ghost flex h-10 items-center gap-2 rounded px-4 text-xs font-bold">
              <Power size={16} />
              {t.admin.shifts.close}
            </button>
          )
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="px-4 py-2">
          <dl className="divide-y divide-dashed divide-neutral-200 text-sm">
            {rows.map((row) => (
              <div key={row.label} className="flex justify-between gap-3 py-2">
                <dt className="text-neutral-500">{row.label}</dt>
                <dd className={`font-semibold tabular-nums ${row.tone ?? 'text-neutral-950'}`}>{row.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="flex flex-col gap-3 p-4">
          <div className="space-y-2">
            {PAYMENT_METHODS.map((method) => {
              const Icon = PAYMENT_ICONS[method]
              return (
                <p key={method} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 text-neutral-600">
                    <Icon size={16} className="text-neutral-400" />
                    {t.payment[method]}
                  </span>
                  <span className="font-bold tabular-nums">{formatMoney(summary.byPayment[method], t)}</span>
                </p>
              )
            })}
          </div>
          <div className="mt-auto flex items-end justify-between gap-3 rounded bg-brand-50 px-3 py-3">
            <span className="text-xs font-bold tracking-[0.12em] text-neutral-600 uppercase">{t.report.total}</span>
            <span className="text-2xl font-black text-neutral-950 tabular-nums">{formatMoney(summary.total, t)}</span>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader title={`${t.admin.shifts.orders} · ${orders.length}`} />
        {orders.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={ReceiptText} title={t.admin.shifts.noOrders} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200">
                  <tr>
                    <th className={thClass}>{t.admin.orders.number}</th>
                    <th className={thClass}>{t.admin.orders.time}</th>
                    <th className={thClass}>{t.kassa.orderType}</th>
                    <th className={thClass}>{t.admin.orders.items}</th>
                    <th className={thClass}>{t.admin.orders.payment}</th>
                    <th className={`${thClass} text-right`}>{t.admin.orders.total}</th>
                    <th className={thClass}>{t.admin.orders.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {pageItems.map((order) => {
                    const items = order.items.map((item) => `${item.qty}× ${localize(item.name)}`).join(', ')
                    const open = () => void navigate(shiftOrderPath(shift.id, order.id))
                    return (
                      <tr key={order.id} onClick={open} className="cursor-pointer transition-colors hover:bg-brand-50/60">
                        <td className={tdClass}>
                          <button type="button" onClick={open} className="cursor-pointer font-black text-neutral-950 tabular-nums hover:underline">
                            {formatOrderNumber(order.number)}
                          </button>
                        </td>
                        <td className={`${tdClass} text-neutral-600 tabular-nums`}>{formatTime(order.createdAt)}</td>
                        <td className={tdClass}>
                          <span className="flex items-center gap-1.5">
                            <OrderTypeBadge type={order.type} />
                            <SourceBadge source={order.source} />
                          </span>
                        </td>
                        <td className={`${tdClass} max-w-80 truncate text-neutral-700`} title={items}>
                          {items}
                        </td>
                        <td className={tdClass}>
                          <PaymentLabel order={order} />
                        </td>
                        <td className={`${tdClass} text-right font-bold tabular-nums ${order.status === 'cancelled' ? 'text-neutral-400 line-through' : 'text-neutral-950'}`}>
                          {formatMoney(order.total, t)}
                        </td>
                        <td className={tdClass}>
                          <StatusPill status={order.status} online={!!order.online} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination {...pagination} />
          </>
        )}
      </Card>
    </div>
  )
}

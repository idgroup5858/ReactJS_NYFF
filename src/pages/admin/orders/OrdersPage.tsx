import { ReceiptText, Search } from 'lucide-react'
import { useState } from 'react'
import { useBranches, useOrder, useOrders, useUsers, type OrdersParams } from '@/api/queries'
import { CourierBadge } from '@/components/order/CourierStatus'
import { OrderTypeBadge, SourceBadge, StatusPill } from '@/components/order/OrderBadges'
import { Card } from '@/components/ui/Card'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { inputClass, selectClass, tdClass, thClass } from '@/components/ui/styles'
import { PAGE_SIZE } from '@/components/ui/usePagination'
import { addDays, parseDateKey } from '@/domain/dates'
import { courierStage } from '@/domain/rules'
import { ORDER_SOURCES, ORDER_TYPES, PAYMENT_METHODS, type ID, type OrderSource, type OrderStatus, type OrderType, type PaymentMethod } from '@/domain/types'
import { useLocalize, useT } from '@/i18n'
import { formatDateTime, formatMoney, formatNumber, formatOrderNumber, formatTime } from '@/lib/format'
import PeriodFilter from '../PeriodFilter'
import { useLatest, usePeriod } from '../usePeriod'
import ListPlaceholder from './ListPlaceholder'
import OrderDetails from './OrderDetails'
import PaymentLabel from './PaymentLabel'

const STATUSES: OrderStatus[] = ['pending', 'preparing', 'ready', 'cancelled']

type Filters = {
  branchId: ID | 'all'
  status: OrderStatus | 'all'
  type: OrderType | 'all'
  source: OrderSource | 'all'
  payment: PaymentMethod | 'all'
  cashierId: ID | 'all'
  /** buyurtma raqami: "#12" yoki "12" */
  query: string
}

const NO_FILTERS: Filters = { branchId: 'all', status: 'all', type: 'all', source: 'all', payment: 'all', cashierId: 'all', query: '' }

/** "Barchasi" — so'rovga qo'shilmaydi. */
const pick = <T extends string>(value: T | 'all'): T | undefined => (value === 'all' ? undefined : value)

/**
 * Buyurtmalar (admin): davr, filial, holat, tur, manba, to'lov turi, kassir va raqam bo'yicha filtr (server filtrlaydi
 * va sahifalaydi); yuqorida tanlangan buyurtmalar jami, pastda 10 tadan jadval. Qatorni bosganda — buyurtma tafsiloti
 * (taomlar, to'lov, jarayon vaqtlari).
 */
export default function OrdersPage() {
  const t = useT()
  const localize = useLocalize()
  const branches = useBranches().data ?? []
  const users = useUsers().data ?? []
  const period = usePeriod('today')
  const { range } = period
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [openedId, setOpenedId] = useState<ID | null>(null)
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters({ ...filters, [key]: value })

  const number = filters.query.replace(/\D/g, '')
  const params: OrdersParams = {
    branchId: pick(filters.branchId),
    status: pick(filters.status),
    type: pick(filters.type),
    source: pick(filters.source),
    // aralash to'lov ikkala turda ham chiqadi (server)
    payment: pick(filters.payment),
    cashierId: pick(filters.cashierId),
    number: number === '' ? undefined : Number(number),
    // mahalliy kun chegaralari: `from` kiradi, `to` (oxirgi kundan keyingi yarim tun) kirmaydi
    from: parseDateKey(range.from).toISOString(),
    to: parseDateKey(addDays(range.to, 1)).toISOString(),
  }

  // filtr yoki davr o'zgarsa — 1-sahifa
  const filterKey = JSON.stringify(params)
  const [paging, setPaging] = useState({ key: filterKey, page: 1 })
  const page = paging.key === filterKey ? paging.page : 1
  const query = useOrders({ ...params, page, limit: PAGE_SIZE })
  // ro'yxat qisqarib, sahifa bo'shab qolsa (masalan holati o'zgardi) — oxirgi mavjud sahifa
  if (query.data && query.data.items.length === 0 && query.data.total > 0 && page > 1) {
    setPaging({ key: filterKey, page: Math.ceil(query.data.total / PAGE_SIZE) })
  }
  const data = useLatest(query.data)
  const list = data?.items ?? []

  const listed = list.find((o) => o.id === openedId)
  // boshqa sahifaga o'tib ketgan bo'lsa — serverdan alohida
  const single = useOrder(openedId && !listed ? openedId : null).data
  const opened = listed ?? (single?.id === openedId ? single : undefined)

  const branchName = (id: ID) => branches.find((b) => b.id === id)?.name ?? '—'
  const userName = (id: ID | null) => (id ? (users.find((u) => u.id === id)?.name ?? '—') : '—')
  const cashiers = users.filter((u) => u.role === 'cashier' && (filters.branchId === 'all' || u.branchId === filters.branchId))
  const singleDay = range.from === range.to

  const totals = data?.summary
  const summary = [
    { label: t.admin.reports.orders, value: formatNumber(totals?.count ?? 0) },
    { label: t.admin.reports.revenue, value: formatMoney(totals?.paid.amount ?? 0, t), sub: formatNumber(totals?.paid.count ?? 0) },
    { label: t.admin.reports.cancelled, value: formatMoney(totals?.cancelled.amount ?? 0, t), sub: formatNumber(totals?.cancelled.count ?? 0) },
    { label: t.orderStatus.pending, value: formatMoney(totals?.pending.amount ?? 0, t), sub: formatNumber(totals?.pending.count ?? 0) },
  ]

  return (
    <div className="space-y-5">
      <PageHeader title={t.admin.orders.title} description={t.admin.orders.hint} />

      <Card className="space-y-3 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <PeriodFilter period={period} />
          <span className="flex-1" />
          <SegmentedControl
            label={t.common.branch}
            value={filters.branchId}
            onChange={(branchId) => setFilters({ ...filters, branchId, cashierId: 'all' })}
            options={[{ value: 'all', label: t.admin.reports.allBranches }, ...branches.map((b) => ({ value: b.id, label: b.name }))]}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          <label className="relative block">
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400" />
            <input value={filters.query} onChange={(event) => set('query', event.target.value)} placeholder={t.admin.orders.search} inputMode="numeric" className={`${inputClass} h-9! pl-9`} />
          </label>
          <select value={filters.status} onChange={(event) => set('status', event.target.value as Filters['status'])} aria-label={t.admin.orders.status} className={`${selectClass} h-9!`}>
            <option value="all">{t.admin.orders.allStatuses}</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {t.orderStatus[status]}
              </option>
            ))}
          </select>
          <select value={filters.type} onChange={(event) => set('type', event.target.value as Filters['type'])} aria-label={t.kassa.orderType} className={`${selectClass} h-9!`}>
            <option value="all">{t.admin.orders.allTypes}</option>
            {ORDER_TYPES.map((type) => (
              <option key={type} value={type}>
                {t.orderType[type]}
              </option>
            ))}
          </select>
          <select value={filters.source} onChange={(event) => set('source', event.target.value as Filters['source'])} aria-label={t.admin.orders.source} className={`${selectClass} h-9!`}>
            <option value="all">{t.admin.orders.allSources}</option>
            {ORDER_SOURCES.map((source) => (
              <option key={source} value={source}>
                {t.orderSource[source]}
              </option>
            ))}
          </select>
          <select value={filters.payment} onChange={(event) => set('payment', event.target.value as Filters['payment'])} aria-label={t.admin.orders.payment} className={`${selectClass} h-9!`}>
            <option value="all">{t.admin.orders.allPayments}</option>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {t.payment[method]}
              </option>
            ))}
          </select>
          <select value={filters.cashierId} onChange={(event) => set('cashierId', event.target.value)} aria-label={t.admin.orders.cashier} className={`${selectClass} h-9!`}>
            <option value="all">{t.admin.orders.allCashiers}</option>
            {cashiers.map((user) => (
              <option key={user.id} value={user.id}>
                {filters.branchId === 'all' && user.branchId ? `${user.name} · ${branchName(user.branchId)}` : user.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 gap-px border-b border-neutral-200 bg-neutral-200 lg:grid-cols-4">
          {summary.map((cell) => (
            <div key={cell.label} className="bg-white px-4 py-2.5">
              <p className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">{cell.label}</p>
              <p className="text-base font-extrabold whitespace-nowrap">
                {cell.value}
                {cell.sub !== undefined && <span className="ml-1.5 text-xs font-semibold text-neutral-500">· {cell.sub}</span>}
              </p>
            </div>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="p-4">
            <ListPlaceholder icon={ReceiptText} empty={t.admin.orders.empty} query={{ data, error: query.error }} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200">
                  <tr>
                    <th className={thClass}>{t.admin.orders.number}</th>
                    <th className={thClass}>{t.admin.orders.time}</th>
                    <th className={thClass}>{t.common.branch}</th>
                    <th className={thClass}>{t.admin.orders.cashier}</th>
                    <th className={thClass}>{t.kassa.orderType}</th>
                    <th className={thClass}>{t.admin.orders.items}</th>
                    <th className={thClass}>{t.admin.orders.payment}</th>
                    <th className={`${thClass} text-right`}>{t.admin.orders.total}</th>
                    <th className={thClass}>{t.admin.orders.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {list.map((order) => {
                    const items = order.items.map((item) => `${item.qty}× ${localize(item.name)}`).join(', ')
                    const stage = courierStage(order)
                    return (
                      <tr key={order.id} onClick={() => setOpenedId(order.id)} className="cursor-pointer transition-colors hover:bg-brand-50/60">
                        <td className={tdClass}>
                          <button type="button" onClick={() => setOpenedId(order.id)} className="cursor-pointer font-black text-neutral-950 tabular-nums hover:underline">
                            {formatOrderNumber(order.number)}
                          </button>
                        </td>
                        <td className={`${tdClass} text-neutral-600 tabular-nums`}>{singleDay ? formatTime(order.createdAt) : formatDateTime(order.createdAt)}</td>
                        <td className={tdClass}>{branchName(order.branchId)}</td>
                        <td className={tdClass}>{userName(order.cashierId)}</td>
                        <td className={tdClass}>
                          <span className="flex items-center gap-1.5">
                            <OrderTypeBadge type={order.type} />
                            <SourceBadge source={order.source} />
                          </span>
                        </td>
                        <td className={`${tdClass} max-w-72 truncate text-neutral-700`} title={items}>
                          {items}
                        </td>
                        <td className={tdClass}>
                          <PaymentLabel order={order} />
                        </td>
                        <td className={`${tdClass} text-right font-bold tabular-nums ${order.status === 'cancelled' ? 'text-neutral-400 line-through' : 'text-neutral-950'}`}>
                          {formatMoney(order.total, t)}
                        </td>
                        <td className={tdClass}>
                          {/* kuryer bosqichi — holat ostida (ustun kengayib jadval surilmasin) */}
                          <span className="flex flex-col items-start gap-1">
                            <StatusPill status={order.status} online={!!order.online} />
                            {stage && <CourierBadge stage={stage} />}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onChange={(next) => setPaging({ key: filterKey, page: next })} />
          </>
        )}
      </Card>

      {opened && <OrderDetails order={opened} onClose={() => setOpenedId(null)} />}
    </div>
  )
}

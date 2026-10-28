import { ArrowDownRight, ArrowUpRight, ClipboardCheck, Monitor, RotateCcw, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { api } from '@/api'
import { ApiError } from '@/api/http'
import { useBranches, useOverview, useSalesReport } from '@/api/queries'
import { ORDER_TYPE_ICONS, PAYMENT_ICONS } from '@/components/order/orderIcons'
import { Card, CardHeader } from '@/components/ui/Card'
import PageHeader from '@/components/ui/PageHeader'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { addDays, dateRange, parseDateKey } from '@/domain/dates'
import { EXPENSE_KINDS, ORDER_SOURCES, ORDER_TYPES, PAYMENT_METHODS, type DateKey, type SalesReport, type Tally } from '@/domain/types'
import { errorMessage, useLocalize, useT } from '@/i18n'
import { formatMoney, formatNumber } from '@/lib/format'
import { confirmDialog, showToast } from '@/lib/swal'
import PeriodFilter from '../PeriodFilter'
import { useLatest, usePeriod } from '../usePeriod'
import BarChart, { type BarPoint } from './BarChart'
import BarList from './BarList'

const pad = (value: number) => String(value).padStart(2, '0')

const NO_TALLY: Tally = { orders: 0, revenue: 0 }

/** Javob kelguncha — nollar bilan (kunlar o'qi bilan): kartochkalar va diagramma joyida turadi. */
function emptyReport(range: { from: DateKey; to: DateKey }): SalesReport {
  return {
    ...NO_TALLY,
    cancelled: 0,
    cancelledAmount: 0,
    avgCheck: 0,
    byPayment: { cash: 0, card: 0, click: 0 },
    byType: { dine_in: NO_TALLY, takeaway: NO_TALLY, delivery: NO_TALLY },
    bySource: { cashier: NO_TALLY, kiosk: NO_TALLY, mobile: NO_TALLY },
    byHour: Array.from({ length: 24 }, () => 0),
    days: dateRange(range.from, range.to).map((date) => ({ date, ...NO_TALLY, expenses: 0 })),
    topProducts: [],
    byBranch: [],
    expenses: 0,
    expensesByKind: { electricity: 0, gas: 0, water: 0, internet: 0, other: 0 },
    net: 0,
  }
}

/** "+12%" / "−5%" — oldingi xuddi shunday uzunlikdagi davrga nisbatan. */
function Delta({ current, previous }: { current: number; previous: number }) {
  const t = useT()
  if (previous <= 0) return null
  const change = Math.round(((current - previous) / previous) * 100)
  const up = change >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-chip px-1.5 py-0.5 text-[11px] font-bold ${up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`} title={t.admin.reports.vsPrevious}>
      <Icon size={12} />
      {up ? '+' : '−'}
      {Math.abs(change)}%
    </span>
  )
}

/**
 * Hisobotlar (admin bosh sahifasi): davr (bugun / kecha / 7 kun / 30 kun / tanlangan) va filial bo'yicha tushum,
 * buyurtmalar, o'rtacha chek, kommunal xarajatlar va sof natija; kunlik (yoki soatlik) diagramma; to'lov turi,
 * buyurtma turi, manba, filiallar va eng ko'p sotilgan taomlar.
 */
export default function ReportsPage() {
  const t = useT()
  const localize = useLocalize()
  const branches = useBranches().data ?? []
  const overview = useOverview().data
  const period = usePeriod('week')
  const { range } = period
  const [branchId, setBranchId] = useState<string>('all')

  const branch = branchId === 'all' ? null : branchId
  const current = useSalesReport({ ...range, branchId: branch })
  const report = useLatest(current.data) ?? emptyReport(range)
  // oldingi xuddi shunday uzunlikdagi davr — o'sish / kamayish foizi uchun; u ma'lumot boshlanishidan (birinchi
  // buyurtma kunidan) oldin bo'lsa — solishtirish noto'g'ri (+3000%), so'ralmaydi ham, ko'rsatilmaydi ham
  const previousFrom = addDays(range.from, -dateRange(range.from, range.to).length)
  const firstOrderDate = overview?.firstOrderDate ?? null
  const previousRange = firstOrderDate !== null && previousFrom >= firstOrderDate ? { from: previousFrom, to: addDays(range.from, -1), branchId: branch } : null
  const previous = useSalesReport(previousRange).data
  const comparable = previousRange !== null && previous !== undefined

  const money = (value: number) => formatMoney(value, t)
  const singleDay = report.days.length === 1
  const points: BarPoint[] = singleDay
    ? report.byHour.flatMap((value, hour) =>
        hour >= 9 && hour <= 23 ? [{ key: String(hour), label: pad(hour), title: `${pad(hour)}:00–${pad(hour)}:59`, value, details: [] }] : [],
      )
    : report.days.map((day) => {
        const date = parseDateKey(day.date)
        return {
          key: day.date,
          label: String(date.getDate()),
          title: `${pad(date.getDate())}.${pad(date.getMonth() + 1)}, ${t.admin.reports.weekdays[date.getDay()]}`,
          value: day.revenue,
          details: [t.admin.reports.ordersCount(day.orders), ...(day.expenses > 0 ? [`${t.admin.reports.expenses}: ${money(day.expenses)}`] : [])],
        }
      })

  const pending = overview?.pendingPurchases ?? 0
  const low = overview?.lowStock ?? 0
  const liveOrders = branches
    .filter((b) => b.active)
    .map((b) => ({ branch: b, count: overview?.liveOrders.find((live) => live.branchId === b.id)?.count ?? 0 }))

  const onReset = async () => {
    if (!(await confirmDialog(t.common.resetConfirmTitle, t.common.resetConfirmText, t.common.resetData))) return
    try {
      await api.demo.reset()
      showToast(t.common.resetDone)
    } catch (error) {
      // admin uchun `forbidden` — serverda demo rejimi o'chiq
      showToast(error instanceof ApiError && error.code === 'forbidden' ? t.admin.reports.resetOff : errorMessage(error), 'error')
    }
  }

  const kpis = [
    { label: t.admin.reports.revenue, value: money(report.revenue), delta: comparable && <Delta current={report.revenue} previous={previous.revenue} />, strong: true },
    { label: t.admin.reports.orders, value: formatNumber(report.orders), delta: comparable && <Delta current={report.orders} previous={previous.orders} /> },
    { label: t.admin.reports.avgCheck, value: money(report.avgCheck), delta: comparable && <Delta current={report.avgCheck} previous={previous.avgCheck} /> },
    { label: t.admin.reports.cancelled, value: formatNumber(report.cancelled), sub: money(report.cancelledAmount) },
    { label: t.admin.reports.expenses, value: money(report.expenses), sub: t.admin.reports.utilitiesOnly },
    { label: t.admin.reports.net, value: money(report.net), sub: t.admin.reports.netHint, tone: report.net < 0 ? 'text-red-700' : 'text-neutral-950' },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.admin.reports.title}
        description={t.admin.reports.hint}
        actions={
          <button type="button" onClick={() => void onReset()} className="btn-ghost flex h-9 items-center gap-2 rounded px-4 text-xs font-semibold">
            <RotateCcw size={14} />
            {t.common.resetData}
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <PeriodFilter period={period} />
        <span className="flex-1" />
        <SegmentedControl
          label={t.common.branch}
          value={branchId}
          onChange={setBranchId}
          options={[{ value: 'all', label: t.admin.reports.allBranches }, ...branches.map((b) => ({ value: b.id, label: b.name }))]}
        />
      </div>

      {current.error !== null && !current.data && <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage(current.error)}</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className={`px-4 py-3 ${kpi.strong ? 'bg-coal! text-white' : ''}`}>
            <p className={`text-[11px] font-semibold tracking-[0.1em] whitespace-nowrap uppercase ${kpi.strong ? 'text-white/60' : 'text-neutral-500'}`}>{kpi.label}</p>
            <p className={`mt-1 text-xl font-extrabold whitespace-nowrap tabular-nums ${kpi.strong ? 'text-taxi' : (kpi.tone ?? 'text-neutral-950')}`}>{kpi.value}</p>
            <div className="mt-1 flex min-h-5 flex-wrap items-center gap-x-2 text-xs text-neutral-500">
              {kpi.delta}
              {kpi.sub && <span>{kpi.sub}</span>}
            </div>
          </Card>
        ))}
      </div>

      {/* diagramma va "Diqqat talab" bir xil balandlikda — orada bo'sh joy qolmasligi uchun */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader title={singleDay ? t.admin.reports.byHour : t.admin.reports.byDay} hint={t.admin.reports.chartHint} />
          <div className="p-4">
            <BarChart points={points} format={money} labelEvery={points.length > 16 ? 3 : 1} caption={singleDay ? t.admin.reports.byHour : t.admin.reports.byDay} />
          </div>
        </Card>

        <Card>
          <CardHeader title={t.admin.reports.attention} />
          <div className="space-y-2 p-4">
            <Link to="/admin/kirimlar" className="flex items-center gap-3 rounded-card border border-neutral-200 bg-white px-3 py-2.5 transition-colors hover:border-select">
              <ClipboardCheck size={18} className={pending ? 'text-amber-600' : 'text-neutral-300'} />
              <span className="flex-1 text-sm font-semibold">{t.admin.reports.pendingPurchases}</span>
              <span className={`rounded-full px-2 text-sm font-bold tabular-nums ${pending ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-500'}`}>{pending}</span>
            </Link>
            <Link to="/ombor" className="flex items-center gap-3 rounded-card border border-neutral-200 bg-white px-3 py-2.5 transition-colors hover:border-select">
              <TriangleAlert size={18} className={low ? 'text-red-600' : 'text-neutral-300'} />
              <span className="flex-1 text-sm font-semibold">{t.admin.reports.lowStock}</span>
              <span className={`rounded-full px-2 text-sm font-bold tabular-nums ${low ? 'bg-red-100 text-red-700' : 'bg-neutral-100 text-neutral-500'}`}>{low}</span>
            </Link>
            {liveOrders.map(({ branch: item, count }) => (
              <Link key={item.id} to={`/tv/${item.id}`} className="flex items-center gap-3 rounded-card border border-neutral-200 bg-white px-3 py-2.5 transition-colors hover:border-select">
                <Monitor size={18} className="text-neutral-400" />
                <span className="flex-1 text-sm font-semibold">{t.admin.reports.liveOrders(item.name)}</span>
                <span className="rounded-full bg-coal px-2 text-sm font-bold text-taxi tabular-nums">{count}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* tushum tarkibi: uchala kesim bir qatorda, bir xil balandlikda */}
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader title={t.admin.reports.byPayment} />
          <div className="p-4">
            <BarList
              total={report.revenue}
              rows={PAYMENT_METHODS.map((method) => ({ key: method, label: t.payment[method], icon: PAYMENT_ICONS[method], value: report.byPayment[method], valueText: money(report.byPayment[method]) }))}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title={t.admin.reports.byType} />
          <div className="p-4">
            <BarList
              total={report.revenue}
              rows={ORDER_TYPES.map((type) => ({
                key: type,
                label: t.orderType[type],
                icon: ORDER_TYPE_ICONS[type],
                value: report.byType[type].revenue,
                valueText: money(report.byType[type].revenue),
                sub: t.admin.reports.ordersCount(report.byType[type].orders),
              }))}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title={t.admin.reports.bySource} />
          <div className="p-4">
            <BarList
              total={report.revenue}
              rows={ORDER_SOURCES.map((source) => ({
                key: source,
                label: t.orderSource[source],
                value: report.bySource[source].revenue,
                valueText: money(report.bySource[source].revenue),
                sub: t.admin.reports.ordersCount(report.bySource[source].orders),
              }))}
            />
          </div>
        </Card>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title={t.admin.reports.topProducts} />
          <div className="p-4">
            {report.topProducts.length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-500">{t.admin.reports.noSales}</p>
            ) : (
              <BarList
                total={report.revenue}
                rows={report.topProducts.slice(0, 8).map((stat) => ({
                  key: stat.productId,
                  label: localize(stat.name),
                  value: stat.revenue,
                  valueText: money(stat.revenue),
                  sub: t.admin.reports.soldQty(stat.qty),
                }))}
              />
            )}
          </div>
        </Card>

        {/* filiallar jadvali: tushum − kommunal xarajat = natija, ustunlar nomlangan */}
        <Card>
          <CardHeader title={t.admin.reports.byBranch} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-[11px] tracking-[0.1em] text-neutral-500 uppercase">
                  <th className="px-4 py-2.5 text-left font-semibold">{t.common.branch}</th>
                  <th className="px-4 py-2.5 text-right font-semibold">{t.admin.reports.revenue}</th>
                  <th className="px-4 py-2.5 text-right font-semibold">{t.admin.reports.expenses}</th>
                  <th className="px-4 py-2.5 text-right font-semibold">{t.admin.reports.net}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {report.byBranch.map((stat) => {
                  const item = branches.find((b) => b.id === stat.branchId)
                  const net = stat.revenue - stat.expenses
                  return (
                    <tr key={stat.branchId}>
                      <td className="px-4 py-3">
                        <p className="font-bold text-neutral-950">{item?.name}</p>
                        <p className="text-xs text-neutral-500">{t.admin.reports.ordersCount(stat.orders)}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums">{money(stat.revenue)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-neutral-600 tabular-nums">{stat.expenses > 0 ? money(stat.expenses) : '—'}</td>
                      <td className={`px-4 py-3 text-right font-bold whitespace-nowrap tabular-nums ${net < 0 ? 'text-red-700' : 'text-neutral-950'}`}>{money(net)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {report.expenses > 0 && (
            <div className="space-y-1.5 border-t border-neutral-100 px-4 py-3">
              <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-500 uppercase">{t.admin.reports.expensesByKind}</p>
              {EXPENSE_KINDS.filter((kind) => report.expensesByKind[kind] > 0).map((kind) => (
                <p key={kind} className="flex justify-between text-sm">
                  <span className="text-neutral-600">{t.admin.expenses.kinds[kind]}</span>
                  <span className="font-semibold tabular-nums">{money(report.expensesByKind[kind])}</span>
                </p>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

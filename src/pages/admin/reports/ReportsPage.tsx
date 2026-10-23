import { ArrowDownRight, ArrowUpRight, ClipboardCheck, Monitor, RotateCcw, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { resetDb, useDb } from '@/api'
import { ORDER_TYPE_ICONS, PAYMENT_ICONS } from '@/components/order/orderIcons'
import { Card, CardHeader } from '@/components/ui/Card'
import PageHeader from '@/components/ui/PageHeader'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { inputClass } from '@/components/ui/styles'
import { addDays, dateKey, parseDateKey } from '@/domain/dates'
import { activeOrders } from '@/domain/logic/orders'
import { salesReport } from '@/domain/logic/reports'
import { lowStockItems } from '@/domain/logic/stock'
import { EXPENSE_KINDS, ORDER_TYPES, PAYMENT_METHODS, type DateKey } from '@/domain/types'
import { useLocalize, useT } from '@/i18n'
import { formatMoney, formatNumber } from '@/lib/format'
import { confirmDialog, showToast } from '@/lib/swal'
import { useToday } from '@/lib/useNow'
import BarChart, { type BarPoint } from './BarChart'
import BarList from './BarList'

type Preset = 'today' | 'yesterday' | 'week' | 'month' | 'custom'

const pad = (value: number) => String(value).padStart(2, '0')

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
  const db = useDb()
  const localize = useLocalize()
  const today = useToday()
  const [preset, setPreset] = useState<Preset>('week')
  const [custom, setCustom] = useState<{ from: DateKey; to: DateKey }>({ from: addDays(today, -13), to: today })
  const [branchId, setBranchId] = useState<string>('all')

  const range = (() => {
    switch (preset) {
      case 'today':
        return { from: today, to: today }
      case 'yesterday':
        return { from: addDays(today, -1), to: addDays(today, -1) }
      case 'week':
        return { from: addDays(today, -6), to: today }
      case 'month':
        return { from: addDays(today, -29), to: today }
      case 'custom':
        return custom.from <= custom.to ? custom : { from: custom.to, to: custom.from }
    }
  })()
  const branch = branchId === 'all' ? null : branchId
  const report = salesReport(db, { ...range, branchId: branch })
  const length = report.days.length
  const previousFrom = addDays(range.from, -length)
  const previous = salesReport(db, { from: previousFrom, to: addDays(range.from, -1), branchId: branch })
  // oldingi davr ma'lumot boshlanishidan oldin bo'lsa — solishtirish noto'g'ri (+3000%), ko'rsatilmaydi
  const firstSale = db.orders.reduce<string | null>((min, o) => (min === null || o.createdAt < min ? o.createdAt : min), null)
  const comparable = firstSale !== null && previousFrom >= dateKey(new Date(firstSale))

  const money = (value: number) => formatMoney(value, t)
  const singleDay = length === 1
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

  const pending = db.purchases.filter((p) => p.status === 'pending').length
  const low = lowStockItems(db).length
  const liveOrders = db.branches.filter((b) => b.active).map((b) => ({ branch: b, count: activeOrders(db, b.id).length }))

  const onReset = async () => {
    if (!(await confirmDialog(t.common.resetConfirmTitle, t.common.resetConfirmText, t.common.resetData))) return
    resetDb()
    showToast(t.common.resetDone)
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
        <SegmentedControl<Preset>
          label={t.admin.reports.period}
          value={preset}
          onChange={setPreset}
          options={[
            { value: 'today', label: t.admin.reports.today },
            { value: 'yesterday', label: t.admin.reports.yesterday },
            { value: 'week', label: t.admin.reports.week },
            { value: 'month', label: t.admin.reports.month },
            { value: 'custom', label: t.admin.reports.custom },
          ]}
        />
        {preset === 'custom' && (
          <span className="flex items-center gap-2">
            <input type="date" value={custom.from} max={today} onChange={(event) => event.target.value && setCustom({ ...custom, from: event.target.value })} aria-label={t.admin.reports.from} className={`${inputClass} h-9! w-40!`} />
            <span className="text-neutral-400">—</span>
            <input type="date" value={custom.to} max={today} onChange={(event) => event.target.value && setCustom({ ...custom, to: event.target.value })} aria-label={t.admin.reports.to} className={`${inputClass} h-9! w-40!`} />
          </span>
        )}
        <span className="flex-1" />
        <SegmentedControl
          label={t.common.branch}
          value={branchId}
          onChange={setBranchId}
          options={[{ value: 'all', label: t.admin.reports.allBranches }, ...db.branches.map((b) => ({ value: b.id, label: b.name }))]}
        />
      </div>

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

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader title={singleDay ? t.admin.reports.byHour : t.admin.reports.byDay} hint={t.admin.reports.chartHint} />
          <div className="p-4">
            <BarChart points={points} format={money} labelEvery={points.length > 16 ? 3 : 1} caption={singleDay ? t.admin.reports.byHour : t.admin.reports.byDay} />
          </div>
        </Card>

        <div className="space-y-5">
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
          <Card>
            <CardHeader title={t.admin.reports.byPayment} />
            <div className="p-4">
              <BarList
                total={report.revenue}
                rows={PAYMENT_METHODS.map((method) => ({ key: method, label: t.payment[method], icon: PAYMENT_ICONS[method], value: report.byPayment[method], valueText: money(report.byPayment[method]) }))}
              />
            </div>
          </Card>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader title={t.admin.reports.byType} />
          <div className="space-y-6 p-4">
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
            <div className="border-t border-neutral-100 pt-4">
              <p className="mb-3 text-[11px] font-bold tracking-[0.14em] text-neutral-500 uppercase">{t.admin.reports.bySource}</p>
              <BarList
                total={report.revenue}
                rows={(['cashier', 'kiosk'] as const).map((source) => ({
                  key: source,
                  label: source === 'cashier' ? t.modes.cashier.title : t.modes.kiosk.title,
                  value: report.bySource[source].revenue,
                  valueText: money(report.bySource[source].revenue),
                  sub: t.admin.reports.ordersCount(report.bySource[source].orders),
                }))}
              />
            </div>
          </div>
        </Card>

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

        <Card>
          <CardHeader title={t.admin.reports.byBranch} />
          <div className="divide-y divide-neutral-100">
            {report.byBranch.map((stat) => {
              const item = db.branches.find((b) => b.id === stat.branchId)
              return (
                <div key={stat.branchId} className="space-y-1 px-4 py-3 text-sm">
                  <p className="flex justify-between font-bold">
                    <span>{item?.name}</span>
                    <span className="tabular-nums">{money(stat.revenue)}</span>
                  </p>
                  <p className="flex justify-between text-neutral-500">
                    <span>{t.admin.reports.ordersCount(stat.orders)}</span>
                    <span className="tabular-nums">
                      − {money(stat.expenses)} = <span className={`font-semibold ${stat.revenue - stat.expenses < 0 ? 'text-red-700' : 'text-neutral-900'}`}>{money(stat.revenue - stat.expenses)}</span>
                    </span>
                  </p>
                </div>
              )
            })}
            <div className="space-y-1.5 px-4 py-3">
              <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-500 uppercase">{t.admin.reports.expensesByKind}</p>
              {EXPENSE_KINDS.filter((kind) => report.expensesByKind[kind] > 0).map((kind) => (
                <p key={kind} className="flex justify-between text-sm">
                  <span className="text-neutral-600">{t.admin.expenses.kinds[kind]}</span>
                  <span className="font-semibold tabular-nums">{money(report.expensesByKind[kind])}</span>
                </p>
              ))}
              {report.expenses === 0 && <p className="text-sm text-neutral-500">—</p>}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

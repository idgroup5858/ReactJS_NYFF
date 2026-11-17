import { ArrowDown, ArrowUp, TriangleAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useIngredients, useProductProfit, useProducts } from '@/api/queries'
import { Card } from '@/components/ui/Card'
import SegmentedControl from '@/components/ui/SegmentedControl'
import type { DateKey, ID, ProductProfit } from '@/domain/types'
import { errorMessage, useLocalize, useT } from '@/i18n'
import { formatMoney, formatNumber } from '@/lib/format'
import { useLatest } from '../usePeriod'

type SortKey = 'qty' | 'revenue' | 'cost' | 'profit' | 'margin'

/** Marja shundan past bo'lsa — sariq (zarar — qizil). */
const LOW_MARGIN = 15

interface Row {
  stat: ProductProfit
  /** tannarxi noma'lum sotilgani */
  unknownQty: number
  /** tannarxi ma'lum qismdan (`costedRevenue − cost`); `null` — birortasining ham tannarxi ma'lum emas */
  profit: number | null
  /** foiz, ma'lum qismdan; `null` — tannarx yoki tushum yo'q */
  margin: number | null
  /** o'rtacha 1 dona tannarx */
  unitCost: number | null
  /** taomning hozirgi retseptida narxi yo'q mahsulotlar — tannarx noma'lum bo'lsa sababi shu bo'lishi mumkin */
  missing: string[]
}

const marginTone = (margin: number) =>
  margin < 0 ? 'bg-red-50 text-red-700' : margin < LOW_MARGIN ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'

/**
 * "Hisobotlar" → "Taomlar foydasi": davr va filial bo'yicha har bir taomning soni, tushumi, sotuv paytidagi tannarxi,
 * foydasi va marjasi (`GET /reports/products`). Tannarxi noma'lum sotuvlar (tannarx yozilishidan oldingi yoki retseptida
 * narxsiz mahsulot bo'lgan) foyda va marjaga kirmaydi — qatorda "?" va sababi, tepada jami ogohlantirish.
 */
export default function ProductProfitTab({ range, branchId }: { range: { from: DateKey; to: DateKey }; branchId: ID | null }) {
  const t = useT()
  const tp = t.admin.reports.profit
  const localize = useLocalize()
  const current = useProductProfit({ ...range, branchId })
  const stats = useLatest(current.data)
  const products = useProducts().data ?? []
  const ingredients = useIngredients().data ?? []
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'profit', desc: true })

  const money = (value: number) => formatMoney(value, t)

  if (current.error !== null && !stats) {
    return <p className="rounded-card bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage(current.error)}</p>
  }
  if (!stats) return null
  if (stats.length === 0) {
    return (
      <Card>
        <p className="py-10 text-center text-sm text-neutral-500">{t.admin.reports.noSales}</p>
      </Card>
    )
  }

  const productMap = new Map(products.map((p) => [p.id, p]))
  const ingredientMap = new Map(ingredients.map((i) => [i.id, i]))
  const rows: Row[] = stats.map((stat) => {
    const known = stat.costedQty > 0
    const unknownQty = stat.qty - stat.costedQty
    const recipe = productMap.get(stat.productId)?.recipe ?? []
    return {
      stat,
      unknownQty,
      profit: known ? stat.costedRevenue - stat.cost : null,
      margin: known && stat.costedRevenue > 0 ? ((stat.costedRevenue - stat.cost) / stat.costedRevenue) * 100 : null,
      unitCost: known ? Math.round(stat.cost / stat.costedQty) : null,
      missing:
        unknownQty > 0
          ? recipe.flatMap((line) => {
              const ingredient = ingredientMap.get(line.ingredientId)
              return ingredient && ingredient.lastPrice === null ? [localize(ingredient.name)] : []
            })
          : [],
    }
  })

  const value = (row: Row): number | null => {
    switch (sort.key) {
      case 'qty':
        return row.stat.qty
      case 'revenue':
        return row.stat.revenue
      case 'cost':
        return row.stat.costedQty > 0 ? row.stat.cost : null
      case 'profit':
        return row.profit
      case 'margin':
        return row.margin
    }
  }
  // noma'lumlar doim pastda; tenglarda — tushum bo'yicha (javob tartibi)
  const sorted = [...rows].sort((a, b) => {
    const x = value(a)
    const y = value(b)
    if (x === null || y === null) return x === null ? (y === null ? 0 : 1) : -1
    return sort.desc ? y - x : x - y
  })

  const total = rows.reduce(
    (sum, row) => ({
      qty: sum.qty + row.stat.qty,
      revenue: sum.revenue + row.stat.revenue,
      costedRevenue: sum.costedRevenue + row.stat.costedRevenue,
      cost: sum.cost + row.stat.cost,
      unknownQty: sum.unknownQty + row.unknownQty,
      unknownRevenue: sum.unknownRevenue + row.stat.revenue - row.stat.costedRevenue,
    }),
    { qty: 0, revenue: 0, costedRevenue: 0, cost: 0, unknownQty: 0, unknownRevenue: 0 },
  )
  const totalProfit = total.costedRevenue - total.cost
  const totalMargin = total.costedRevenue > 0 ? (totalProfit / total.costedRevenue) * 100 : null

  const toggleSort = (key: SortKey) => setSort((prev) => ({ key, desc: prev.key === key ? !prev.desc : true }))
  const unknownMark = (
    <span className="cursor-help font-bold text-amber-700" title={tp.unknownHint}>
      ?
    </span>
  )
  const marginChip = (margin: number | null) =>
    margin === null ? (
      <span className="text-neutral-400">—</span>
    ) : (
      <span className={`inline-block rounded-chip px-1.5 py-0.5 text-xs font-bold tabular-nums ${marginTone(margin)}`}>{formatNumber(margin)}%</span>
    )
  const notes = (row: Row) => (
    <>
      {row.unknownQty > 0 && row.stat.costedQty > 0 && <p className="text-xs text-amber-700">{tp.unknownQty(row.unknownQty)}</p>}
      {row.missing.length > 0 && <p className="text-xs text-amber-700">{tp.missingPrice(row.missing.join(', '))}</p>}
    </>
  )

  const sortTh = (id: SortKey, children: ReactNode) => {
    const active = sort.key === id
    const Icon = sort.desc ? ArrowDown : ArrowUp
    return (
      <th key={id} className="px-4 py-2.5 text-right font-semibold" aria-sort={active ? (sort.desc ? 'descending' : 'ascending') : 'none'}>
        <button type="button" onClick={() => toggleSort(id)} className={`inline-flex cursor-pointer items-center gap-1 uppercase ${active ? 'text-neutral-950' : 'hover:text-neutral-800'}`}>
          {children}
          {active && <Icon size={12} />}
        </button>
      </th>
    )
  }

  const kpis = [
    { label: t.admin.reports.revenue, value: money(total.revenue) },
    { label: tp.cost, value: money(total.cost) },
    { label: tp.profit, value: money(totalProfit), tone: totalProfit < 0 ? 'text-red-700' : 'text-neutral-950' },
    { label: tp.margin, value: totalMargin === null ? '—' : `${formatNumber(totalMargin)}%` },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="px-3 py-3 sm:px-4">
            <p className="truncate text-[11px] font-semibold tracking-[0.1em] text-neutral-500 uppercase">{kpi.label}</p>
            <p className={`mt-1 text-base font-extrabold whitespace-nowrap tabular-nums sm:text-xl ${kpi.tone ?? 'text-neutral-950'}`}>{kpi.value}</p>
          </Card>
        ))}
      </div>

      {total.unknownQty > 0 && (
        <p className="flex items-start gap-2 rounded-card bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          <span>{tp.unknownSummary(total.unknownQty, money(total.unknownRevenue))}</span>
        </p>
      )}

      <Card>
        {/* telefonda — kartochkalar, saralash tugmalari bilan */}
        <div className="space-y-3 p-3 md:hidden">
          <SegmentedControl
            label={tp.profit}
            value={sort.key}
            onChange={(key) => setSort({ key, desc: true })}
            options={[
              { value: 'profit', label: tp.profit },
              { value: 'margin', label: tp.margin },
              { value: 'revenue', label: t.admin.reports.revenue },
              { value: 'qty', label: tp.sold },
            ]}
          />
          {sorted.map((row) => (
            <div key={row.stat.productId} className="rounded-card border border-neutral-200 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-neutral-950">{localize(row.stat.name)}</p>
                  {notes(row)}
                </div>
                {marginChip(row.margin)}
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <dt className="text-neutral-500">{tp.sold}</dt>
                <dd className="text-right tabular-nums">{formatNumber(row.stat.qty)}</dd>
                <dt className="text-neutral-500">{t.admin.reports.revenue}</dt>
                <dd className="text-right font-semibold tabular-nums">{money(row.stat.revenue)}</dd>
                <dt className="text-neutral-500">{tp.cost}</dt>
                <dd className="text-right tabular-nums">{row.unitCost === null ? unknownMark : money(row.stat.cost)}</dd>
                <dt className="text-neutral-500">{tp.profit}</dt>
                <dd className={`text-right font-bold tabular-nums ${row.profit !== null && row.profit < 0 ? 'text-red-700' : ''}`}>
                  {row.profit === null ? unknownMark : money(row.profit)}
                </dd>
              </dl>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-[11px] tracking-[0.1em] text-neutral-500 uppercase">
                <th className="px-4 py-2.5 text-left font-semibold">{tp.product}</th>
                {sortTh('qty', tp.sold)}
                {sortTh('revenue', t.admin.reports.revenue)}
                {sortTh('cost', tp.cost)}
                {sortTh('profit', tp.profit)}
                {sortTh('margin', tp.margin)}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {sorted.map((row) => (
                <tr key={row.stat.productId}>
                  <td className="px-4 py-3">
                    <p className="font-bold text-neutral-950">{localize(row.stat.name)}</p>
                    {notes(row)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">{formatNumber(row.stat.qty)}</td>
                  <td className="px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums">{money(row.stat.revenue)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                    {row.unitCost === null ? (
                      unknownMark
                    ) : (
                      <>
                        <p>{money(row.stat.cost)}</p>
                        <p className="text-xs text-neutral-500">{tp.unitCost(money(row.unitCost))}</p>
                      </>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right font-bold whitespace-nowrap tabular-nums ${row.profit !== null && row.profit < 0 ? 'text-red-700' : 'text-neutral-950'}`}>
                    {row.profit === null ? unknownMark : money(row.profit)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{marginChip(row.margin)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-neutral-200 font-bold">
                <td className="px-4 py-3">{tp.total}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">{formatNumber(total.qty)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">{money(total.revenue)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">{money(total.cost)}</td>
                <td className={`px-4 py-3 text-right whitespace-nowrap tabular-nums ${totalProfit < 0 ? 'text-red-700' : 'text-neutral-950'}`}>{money(totalProfit)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">{marginChip(totalMargin)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="border-t border-neutral-100 px-4 py-2.5 text-xs text-neutral-500">{tp.legend}</p>
      </Card>
    </div>
  )
}

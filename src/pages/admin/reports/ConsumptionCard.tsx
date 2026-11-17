import { useConsumption, useIngredients } from '@/api/queries'
import { Card, CardHeader } from '@/components/ui/Card'
import type { DateKey, ID } from '@/domain/types'
import { errorMessage, useLocalize, useT } from '@/i18n'
import { formatMoney, formatNumber, formatStock } from '@/lib/format'
import { useLatest } from '../usePeriod'

/**
 * "Taomlar foydasi" tabi pastida — xo'jalik sarflari (`GET /reports/consumption`): davrda "Sarflandi" bo'lgan sarf
 * materiallari (salfetka, yuvish vositalari), miqdori ombor birligida va summasi (hisobdan chiqqan paytdagi narxda).
 * Filial tanlansa — uning sotuv ombori (Luchvoy — markaziy). Taomlar foydasidan ayrilmaydi.
 */
export default function ConsumptionCard({ range, branchId }: { range: { from: DateKey; to: DateKey }; branchId: ID | null }) {
  const t = useT()
  const tc = t.admin.reports.profit.consumption
  const localize = useLocalize()
  const current = useConsumption({ ...range, branchId })
  const rows = useLatest(current.data)
  const ingredients = new Map((useIngredients().data ?? []).map((i) => [i.id, i]))
  const money = (value: number) => formatMoney(value, t)

  const body = (() => {
    if (!rows) return current.error ? <p className="px-4 py-6 text-center text-sm text-red-700">{errorMessage(current.error)}</p> : null
    if (rows.length === 0) return <p className="px-4 py-6 text-center text-sm text-neutral-500">{tc.empty}</p>
    const total = rows.reduce((sum, row) => sum + row.cost, 0)
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-[11px] tracking-[0.1em] text-neutral-500 uppercase">
              <th className="px-4 py-2.5 text-left font-semibold">{tc.item}</th>
              <th className="px-4 py-2.5 text-right font-semibold">{tc.qty}</th>
              <th className="px-4 py-2.5 text-right font-semibold">{tc.amount}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((row) => {
              const ingredient = ingredients.get(row.ingredientId)
              return (
                <tr key={row.ingredientId}>
                  <td className="px-4 py-3 font-bold text-neutral-950">{localize(row.name)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                    {ingredient ? formatStock(row.qty, ingredient, t) : formatNumber(row.qty)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums">
                    {row.costedQty === 0 ? (
                      <span className="cursor-help font-bold text-amber-700" title={tc.noPrice}>
                        ?
                      </span>
                    ) : (
                      <>
                        {money(row.cost)}
                        {row.costedQty < row.qty && (
                          <span className="ml-1 cursor-help text-amber-700" title={tc.noPrice}>
                            +?
                          </span>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-neutral-200 font-bold">
              <td className="px-4 py-3" colSpan={2}>
                {t.admin.reports.profit.total}
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">{money(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    )
  })()

  return (
    <Card>
      <CardHeader title={tc.title} hint={tc.hint} />
      {body}
    </Card>
  )
}

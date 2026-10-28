import { useIngredients } from '@/api/queries'
import { inputClass, tdClass, thClass } from '@/components/ui/styles'
import type { ID, Purchase, PurchaseStatus } from '@/domain/types'
import { useLocalize, useT } from '@/i18n'
import { formatMoney, formatNumber } from '@/lib/format'

const STATUS_CLASSES: Record<PurchaseStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
}

export function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  const t = useT()
  return <span className={`rounded-chip px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase ${STATUS_CLASSES[status]}`}>{t.purchase.statuses[status]}</span>
}

type Props = {
  purchase: Purchase
  /** admin tasdiqlashda: mahsulot id → kiritilayotgan narx (matn) */
  prices?: Record<ID, string>
  onPrice?: (ingredientId: ID, value: string) => void
}

/** Kirim tarkibi: mahsulot, miqdor (ombor birligida), 1 birlik narxi va summa; admin uchun narx maydonlari. */
export default function PurchaseDetails({ purchase, prices, onPrice }: Props) {
  const t = useT()
  const ingredients = useIngredients().data ?? []
  const localize = useLocalize()
  const editable = prices !== undefined && onPrice !== undefined
  const priceOf = (ingredientId: ID, fallback: number | null) => {
    if (!editable) return fallback
    const raw = prices[ingredientId]
    return raw === undefined || raw === '' ? null : Number(raw)
  }
  const total = purchase.items.reduce((sum, item) => sum + (priceOf(item.ingredientId, item.price) ?? 0) * item.qty, 0)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-neutral-200">
          <tr>
            <th className={thClass}>{t.stock.name}</th>
            <th className={`${thClass} text-right`}>{t.purchase.qty}</th>
            <th className={`${thClass} text-right`}>{t.purchase.price}</th>
            <th className={`${thClass} text-right`}>{t.purchase.sum}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {purchase.items.map((item) => {
            const ingredient = ingredients.find((i) => i.id === item.ingredientId)
            const price = priceOf(item.ingredientId, item.price)
            return (
              <tr key={item.ingredientId}>
                <td className={tdClass}>{ingredient ? localize(ingredient.name) : item.ingredientId}</td>
                <td className={`${tdClass} text-right whitespace-nowrap tabular-nums`}>
                  {formatNumber(item.qty, 3)} {ingredient ? t.units[ingredient.unit] : ''}
                </td>
                <td className={`${tdClass} text-right whitespace-nowrap`}>
                  {editable ? (
                    <input
                      value={prices[item.ingredientId] ? formatNumber(Number(prices[item.ingredientId])) : ''}
                      onChange={(event) => onPrice(item.ingredientId, event.target.value.replace(/\D/g, '').slice(0, 10))}
                      inputMode="numeric"
                      aria-label={t.purchase.price}
                      className={`${inputClass} h-9! w-32! text-right font-bold tabular-nums ${price === null ? 'border-red-300' : ''}`}
                    />
                  ) : (
                    <span className="tabular-nums">{price !== null ? formatMoney(price, t) : '—'}</span>
                  )}
                </td>
                <td className={`${tdClass} text-right font-semibold whitespace-nowrap tabular-nums`}>{price !== null ? formatMoney(price * item.qty, t) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-neutral-200">
            <td className={`${tdClass} font-bold`} colSpan={3}>
              {t.purchase.total}
            </td>
            <td className={`${tdClass} text-right text-base font-extrabold whitespace-nowrap tabular-nums`}>{formatMoney(Math.round(total), t)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

import { Plus, Trash2 } from 'lucide-react'
import { useIngredients, useStock } from '@/api/queries'
import { inputClass, selectClass } from '@/components/ui/styles'
import { INGREDIENT_GROUPS, type ID } from '@/domain/types'
import { toBase } from '@/domain/units'
import { useLocalize, useT } from '@/i18n'
import { countUnit, formatMoney, formatStock, formatUnit } from '@/lib/format'
import { parseQty } from '@/lib/warehouses'
import { newDraftLine, type DraftLine } from './draftLines'

type Props = {
  lines: DraftLine[]
  onChange: (lines: DraftLine[]) => void
  /** shu ombordagi mavjud qoldiq ko'rsatiladi: kirimda — qayerga, ko'chirishda — qayerdan */
  availableIn: ID
  /** kirim — yonida oxirgi narx ham, qoldiq chegaradan kam bo'lsa qizil; ko'chirish — miqdor qoldiqdan oshsa qizil */
  mode: 'purchase' | 'transfer'
}

/**
 * Mahsulot qatorlari muharriri (kirim va ko'chirish): mahsulot (guruhlar bo'yicha ro'yxat), miqdor ombor birligida,
 * yonida ombordagi mavjud qoldiq (kirimda — oxirgi narx ham).
 */
export default function LinesEditor({ lines, onChange, availableIn, mode }: Props) {
  const t = useT()
  const localize = useLocalize()
  const allIngredients = useIngredients().data ?? []
  const ingredients = allIngredients.filter((i) => i.active)
  // tanlangan ombor qoldig'i (asosiy birlikda, yozuvi yo'q — 0, chegara yo'q).
  // yuklanguncha `undefined` — "—" ko'rinadi, hech narsa qizil bo'lmaydi
  const stock = useStock(availableIn || undefined, { enabled: !!availableIn }).data

  const update = (key: string, patch: Partial<DraftLine>) => onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)))

  return (
    <div className="space-y-2">
      {lines.map((line) => {
        const ingredient = allIngredients.find((i) => i.id === line.ingredientId)
        const qty = parseQty(line.qty)
        const item = ingredient && stock?.find((s) => s.ingredientId === ingredient.id)
        const available = ingredient && stock ? (item?.qty ?? 0) : null
        // qadoqli mahsulot (ketchup 600 g) — miqdor donada, qoldiq grammda
        const tooMuch = mode === 'transfer' && ingredient && available !== null && qty > 0 && toBase(qty, ingredient.unit, ingredient.packSize) > available
        // Qoldiqlar sahifasidagi "Kam" bilan bir xil: chegara qo'yilgan va qoldiq undan kam
        const low = mode === 'purchase' && !!item && item.minQty > 0 && item.qty < item.minQty
        return (
          <div
            key={line.key}
            className={`grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-card border border-neutral-200 bg-white p-2 sm:items-center ${
              mode === 'purchase' ? 'sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,13rem)_auto]' : 'sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,11rem)_auto]'
            }`}
          >
            <select
              value={line.ingredientId}
              onChange={(event) => update(line.key, { ingredientId: event.target.value })}
              aria-label={t.purchase.chooseIngredient}
              className={`${selectClass} col-span-2 sm:col-span-1`}
            >
              <option value="">{t.purchase.chooseIngredient}</option>
              {INGREDIENT_GROUPS.map((group) => {
                const items = ingredients.filter((i) => i.group === group)
                if (items.length === 0) return null
                return (
                  <optgroup key={group} label={t.stock.groups[group]}>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {localize(item.name)}
                      </option>
                    ))}
                  </optgroup>
                )
              })}
            </select>
            <label className="relative">
              <input
                value={line.qty}
                onChange={(event) => update(line.key, { qty: event.target.value.replace(/[^\d.,]/g, '') })}
                inputMode="decimal"
                placeholder={t.purchase.qty}
                aria-label={t.purchase.qty}
                className={`${inputClass} pr-12 text-right font-bold tabular-nums ${tooMuch ? 'border-red-400 text-red-700' : ''}`}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-neutral-400">
                {ingredient ? countUnit(ingredient, t) : ''}
              </span>
            </label>
            <span className={`order-last col-span-2 text-xs sm:order-none sm:col-span-1 ${tooMuch ? 'font-semibold text-red-700' : 'text-neutral-500'}`}>
              {ingredient && (
                <>
                  <span className={`block ${low ? 'font-semibold text-red-700' : ''}`}>
                    {t.transfer.available}: {available !== null ? formatStock(available, ingredient, t) : '—'}
                  </span>
                  {mode === 'purchase' && (
                    <span className="block">
                      {t.purchase.lastPrice}: {ingredient.lastPrice !== null ? `${formatMoney(ingredient.lastPrice, t)} / ${formatUnit(ingredient, t)}` : '—'}
                    </span>
                  )}
                </>
              )}
            </span>
            <button
              type="button"
              onClick={() => onChange(lines.filter((item) => item.key !== line.key))}
              aria-label={t.purchase.remove}
              title={t.purchase.remove}
              className="btn-icon-danger flex h-10 w-10 items-center justify-center rounded"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )
      })}
      <button
        type="button"
        onClick={() => onChange([...lines, newDraftLine()])}
        className="btn-ghost flex h-10 w-full items-center justify-center gap-2 rounded border-dashed text-xs font-bold"
      >
        <Plus size={16} />
        {t.purchase.addLine}
      </button>
    </div>
  )
}

import { Plus, Trash2 } from 'lucide-react'
import { useIngredients, useStock } from '@/api/queries'
import { inputClass } from '@/components/ui/styles'
import type { ID } from '@/domain/types'
import { toBase } from '@/domain/units'
import { useT } from '@/i18n'
import { countUnit, formatMoney, formatNumber, formatStock, formatUnit } from '@/lib/format'
import { parseQty } from '@/lib/warehouses'
import { linePrice, newDraftLine, type DraftLine } from './draftLines'
import IngredientPicker from './IngredientPicker'

type Props = {
  lines: DraftLine[]
  onChange: (lines: DraftLine[]) => void
  /** shu ombordagi mavjud qoldiq ko'rsatiladi: kirimda — qayerga, ko'chirishda — qayerdan */
  availableIn: ID
  /**
   * kirim — 1 birlik narxi maydoni (oxirgi narx oldindan yozilgan), qator summasi, qoldiq chegaradan kam bo'lsa qizil;
   * ko'chirish — miqdor qoldiqdan oshsa qizil
   */
  mode: 'purchase' | 'transfer'
}

/**
 * Mahsulot qatorlari muharriri (kirim va ko'chirish): mahsulot (qidiruvli, guruhlar va alifbo bo'yicha ro'yxat), miqdor ombor birligida,
 * yonida ombordagi mavjud qoldiq; kirimda — narx (1 birlik), oxirgi narx va qator summasi ham.
 */
export default function LinesEditor({ lines, onChange, availableIn, mode }: Props) {
  const t = useT()
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
        // kirim: yozilgan narx yoki oxirgi narx; miqdor bor-u narx yo'q — qizil (yuborib bo'lmaydi)
        const price = mode === 'purchase' ? linePrice(line, ingredient) : null
        const noPrice = mode === 'purchase' && !!ingredient && qty > 0 && price === null
        return (
          <div
            key={line.key}
            className={`grid gap-2 rounded-card border border-neutral-200 bg-surface p-2 sm:items-center ${
              mode === 'purchase'
                ? 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_8rem_11rem_auto]'
                : 'grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_9rem_minmax(0,11rem)_auto]'
            }`}
          >
            <IngredientPicker
              value={line.ingredientId}
              // boshqa mahsulot — narx yana uning oxirgi narxidan
              onChange={(id) => update(line.key, { ingredientId: id, price: null })}
              ingredients={ingredients}
              selected={ingredient}
              className={`${mode === 'purchase' ? 'col-span-3' : 'col-span-2'} sm:col-span-1`}
            />
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
            {mode === 'purchase' && (
              // miqdor maydoni bilan bir xil ko'rinish: o'ngda birlik ("so'm/kg")
              <label className="relative">
                <input
                  value={price !== null ? formatNumber(price) : ''}
                  onChange={(event) => update(line.key, { price: event.target.value.replace(/\D/g, '').slice(0, 10) })}
                  inputMode="numeric"
                  placeholder={t.purchase.price}
                  aria-label={t.purchase.price}
                  className={`${inputClass} pr-20 text-right font-bold tabular-nums ${noPrice ? 'border-red-400' : ''}`}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-neutral-400">
                  {t.purchase.perUnit(ingredient ? countUnit(ingredient, t) : '…')}
                </span>
              </label>
            )}
            {mode === 'purchase' ? (
              <span className="order-last col-span-full flex flex-wrap gap-x-4 gap-y-0.5 px-1 text-xs text-neutral-500">
                {ingredient && (
                  <>
                    <span className={low ? 'font-semibold text-red-700' : ''}>
                      {t.transfer.available}: {available !== null ? formatStock(available, ingredient, t) : '—'}
                    </span>
                    <span>
                      {t.purchase.lastPrice}: {ingredient.lastPrice !== null ? `${formatMoney(ingredient.lastPrice, t)} / ${formatUnit(ingredient, t)}` : '—'}
                    </span>
                    {noPrice && <span className="font-semibold text-red-700">{t.purchase.priceMissing}</span>}
                    {qty > 0 && price !== null && (
                      <span className="ml-auto font-bold text-neutral-950 tabular-nums">
                        {t.purchase.sum}: {formatMoney(Math.round(qty * price), t)}
                      </span>
                    )}
                  </>
                )}
              </span>
            ) : (
              <span className={`order-last col-span-2 text-xs sm:order-none sm:col-span-1 ${tooMuch ? 'font-semibold text-red-700' : 'text-neutral-500'}`}>
                {ingredient && (
                  <span className="block">
                    {t.transfer.available}: {available !== null ? formatStock(available, ingredient, t) : '—'}
                  </span>
                )}
              </span>
            )}
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

import { Plus, Trash2, X } from 'lucide-react'
import { inputClass } from '@/components/ui/styles'
import type { ID, Ingredient, StockUnit } from '@/domain/types'
import { baseUnitOf, sameScale, toBase, unitSize } from '@/domain/units'
import { COOK_YIELD_BASE, normOutputPrice } from '@/domain/yieldNorm'
import { useLocalize, useT } from '@/i18n'
import { formatMoney, formatNumber, formatStock } from '@/lib/format'
import IngredientPicker from './IngredientPicker'
import { cookOf, cookValid, normError, normOf, normRow, parseQty, type NormDraft, type NormRow } from './normDraft'

type Props = {
  /** tahrirlanayotgan mahsulot (yangisida — `undefined`) — o'zi chiqish bo'lolmaydi */
  selfId?: ID
  name: string
  unit: StockUnit
  /** butun mahsulotning hozirgi narxi va u qaysi hisob birligi uchun (asosiy birlikda) — chiqqanlar narxini taxminlash */
  price: number | null
  priceSize: number
  value: NormDraft
  onChange: (value: NormDraft) => void
  ingredients: Ingredient[]
  /** ta'minotchi — faqat ko'radi */
  readOnly: boolean
}

/**
 * Tovar oynasidagi "Norma" bo'limi (2026-11-19): namuna — "[64] kg", chiqadiganlar — mahsulot, miqdori va pishganda
 * chiqishi ("1000 g → [655] g", o'sha mahsulotning o'z yozuviga saqlanadi), pastda chiqindi va chiqqanlarning taxminiy
 * narxi (og'irligi bo'yicha teng). Chiqadigan mahsulotlar — faol, shu mahsulot bilan bir o'lchamda (kg / l yoki dona),
 * o'z normasi yo'q, takrorlanmaydi.
 */
export default function YieldNormEditor({ selfId, name, unit, price, priceSize, value, onChange, ingredients, readOnly }: Props) {
  const t = useT()
  const localize = useLocalize()
  const unitOf = (id: ID) => ingredients.find((i) => i.id === id)?.unit

  if (!value) {
    if (readOnly) return null
    return (
      <button type="button" onClick={() => onChange({ qty: '', rows: [normRow()] })} className="btn-ghost flex h-9 items-center gap-2 rounded px-3 text-xs font-bold">
        <Plus size={14} />
        {t.ingredients.normAdd}
      </button>
    )
  }

  const setRow = (key: number, patch: Partial<NormRow>) => onChange({ ...value, rows: value.rows.map((row) => (row.key === key ? { ...row, ...patch } : row)) })
  const sample = toBase(parseQty(value.qty), unit)
  const outBase = value.rows.reduce((sum, row) => {
    const rowUnit = unitOf(row.ingredientId)
    return sum + (rowUnit ? toBase(parseQty(row.qty), rowUnit) : 0)
  }, 0)
  const waste = sample - outBase
  const complete = normError(value, unit, unitOf) === null
  const norm = normOf(value)
  const outputPrice =
    complete && norm && price !== null ? normOutputPrice(price, priceSize, norm, unit, (id) => unitOf(id) ?? unit, unitSize(unit)) : null
  const cooks = sameScale(unit, 'kg')

  return (
    <div className="space-y-2 rounded-card border border-neutral-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-neutral-800">{t.ingredients.norm}</p>
          <p className="text-xs text-neutral-500">{readOnly ? t.ingredients.normAdminOnly : t.ingredients.normHint}</p>
        </div>
        {!readOnly && (
          <button type="button" onClick={() => onChange(null)} className="btn-ghost flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-bold">
            <X size={14} />
            {t.ingredients.normRemove}
          </button>
        )}
      </div>

      {/* namuna: "[64] kg Tovuq" */}
      <div className="flex items-center gap-2">
        <span className="w-16 shrink-0 text-xs font-semibold text-neutral-600">{t.ingredients.normSample}</span>
        <label className="relative w-32 shrink-0">
          <input
            value={value.qty}
            onChange={(event) => onChange({ ...value, qty: event.target.value.replace(/[^\d.,]/g, '').slice(0, 10) })}
            disabled={readOnly}
            inputMode="decimal"
            placeholder="0"
            aria-label={t.ingredients.normSample}
            className={`${inputClass} h-9! pr-10 text-right font-bold tabular-nums`}
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-neutral-400">{t.units[unit]}</span>
        </label>
        <span className="min-w-0 truncate text-sm text-neutral-700">{name}</span>
      </div>

      {/* chiqadiganlar: "→ [Go'sht ▾] [34,5] kg · pishganda 1000 g → [655] g" */}
      {value.rows.map((row) => {
        const selected = ingredients.find((i) => i.id === row.ingredientId)
        const options = ingredients.filter(
          (i) =>
            i.active &&
            i.id !== selfId &&
            i.yieldNorm === null &&
            sameScale(i.unit, unit) &&
            (i.id === row.ingredientId || !value.rows.some((other) => other.ingredientId === i.id)),
        )
        const rowCooks = cooks && (!selected || sameScale(selected.unit, 'kg'))
        const badCook = !cookValid(cookOf(row.cook))
        return (
          <div key={row.key} className="flex flex-wrap items-center gap-2">
            <span className="w-16 shrink-0 text-xs font-semibold text-neutral-600">→ {t.ingredients.normOutput}</span>
            {readOnly ? (
              <span className="min-w-40 flex-1 truncate text-sm text-neutral-800">{selected ? localize(selected.name) : row.ingredientId}</span>
            ) : (
              <IngredientPicker
                value={row.ingredientId}
                onChange={(id) => setRow(row.key, { ingredientId: id, cook: String(ingredients.find((i) => i.id === id)?.cookYield ?? '') })}
                ingredients={options}
                selected={selected}
                className="min-w-40 flex-1"
              />
            )}
            <label className="relative w-28 shrink-0">
              <input
                value={row.qty}
                onChange={(event) => setRow(row.key, { qty: event.target.value.replace(/[^\d.,]/g, '').slice(0, 10) })}
                disabled={readOnly}
                inputMode="decimal"
                placeholder="0"
                aria-label={t.purchase.qty}
                className={`${inputClass} h-9! pr-10 text-right font-bold tabular-nums`}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-neutral-400">{t.units[selected?.unit ?? unit]}</span>
            </label>
            {rowCooks && (
              <span className="flex shrink-0 items-center gap-1.5 text-xs text-neutral-500" title={t.ingredients.cookHint}>
                {t.ingredients.cook}: {formatNumber(COOK_YIELD_BASE)} {t.units[baseUnitOf(unit)]} →
                <input
                  value={row.cook}
                  onChange={(event) => setRow(row.key, { cook: event.target.value.replace(/\D/g, '').slice(0, 5) })}
                  disabled={readOnly || !row.ingredientId}
                  inputMode="numeric"
                  placeholder="—"
                  aria-label={t.ingredients.cook}
                  className={`${inputClass} h-9! w-20! text-right font-bold tabular-nums ${badCook ? 'border-red-400' : ''}`}
                />
                {t.units[baseUnitOf(unit)]}
              </span>
            )}
            {!readOnly && (
              <button
                type="button"
                onClick={() => onChange({ ...value, rows: value.rows.filter((item) => item.key !== row.key) })}
                aria-label={t.purchase.remove}
                title={t.purchase.remove}
                className="btn-icon-danger flex h-9 w-9 shrink-0 items-center justify-center rounded"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )
      })}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        {!readOnly ? (
          <button type="button" onClick={() => onChange({ ...value, rows: [...value.rows, normRow()] })} className="btn-ghost flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-bold">
            <Plus size={14} />
            {t.ingredients.normAddOutput}
          </button>
        ) : (
          <span />
        )}
        <span className="flex flex-wrap gap-x-4 text-xs text-neutral-500 tabular-nums">
          {sample > 0 && (
            <span className={waste < 0 ? 'font-semibold text-red-700' : ''}>
              {t.ingredients.normWaste(formatStock(waste, { unit, packSize: null }, t), `${formatNumber((waste / sample) * 100, 1)}%`)}
            </span>
          )}
          {outputPrice !== null && <span className="font-semibold text-neutral-800">{t.ingredients.normPrice(formatMoney(outputPrice, t), t.units[unit])}</span>}
        </span>
      </div>
    </div>
  )
}

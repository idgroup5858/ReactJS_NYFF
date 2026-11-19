import type { ID, StockUnit, YieldNorm } from '@/domain/types'
import { toBase } from '@/domain/units'

/** Normadagi chiqish qatori: mahsulot, namunadan chiqqan miqdor (matn, kasr) va uning pishganda chiqishi (1000 g dan). */
export type NormRow = { key: number; ingredientId: ID; qty: string; cook: string }
/** Formadagi norma: namuna (matn) va chiqishlar; `null` — normasiz. */
export type NormDraft = { qty: string; rows: NormRow[] } | null

let seq = 0
export const normRow = (ingredientId: ID = '', qty = '', cook = ''): NormRow => ({ key: ++seq, ingredientId, qty, cook })

/** "34,5" → 34.5; bo'sh / noto'g'ri — 0. */
export const parseQty = (text: string): number => {
  const value = Number(text.replace(',', '.'))
  return Number.isFinite(value) && value > 0 ? value : 0
}

/** Maydondagi pishganda chiqishi: bo'sh — `null`, aks holda son (tekshiruv — `cookValid`). */
export const cookOf = (text: string): number | null => (text === '' ? null : Number(text))

/** Pishganda chiqishi to'g'rimi (backend bilan bir xil): bo'sh yoki butun 1…10 000. */
export const cookValid = (cook: number | null): boolean => cook === null || (Number.isInteger(cook) && cook >= 1 && cook <= 10_000)

/** Formadagi normani yuboriladigan ko'rinishga; to'liq bo'lmagan qatorlar — tekshiruvda (`normError`). */
export function normOf(draft: NormDraft): YieldNorm | null {
  if (!draft) return null
  return { qty: parseQty(draft.qty), outputs: draft.rows.map((row) => ({ ingredientId: row.ingredientId, qty: parseQty(row.qty) })) }
}

/**
 * Saqlashdan oldin: xato matni kaliti (`t.ingredients.normErrors`) yoki `null` — namuna > 0, har qatorda mahsulot va
 * miqdor, chiqqanlar jami namunadan ko'p emas. Server ham tekshiradi (o'lcham, zanjir).
 */
export function normError(draft: NormDraft, unit: StockUnit, unitOf: (id: ID) => StockUnit | undefined): 'sample' | 'output' | 'tooMuch' | null {
  if (!draft) return null
  const sample = toBase(parseQty(draft.qty), unit)
  if (sample < 1) return 'sample'
  if (draft.rows.length === 0) return 'output'
  let total = 0
  for (const row of draft.rows) {
    const rowUnit = unitOf(row.ingredientId)
    const base = rowUnit ? toBase(parseQty(row.qty), rowUnit) : 0
    if (!row.ingredientId || base < 1) return 'output'
    total += base
  }
  return total > sample ? 'tooMuch' : null
}

import type { StockUnit, YieldNorm, YieldOutput } from './types.ts'
import { toBase } from './units.ts'

/** Pishganda chiqishi shuncha asosiy birlikdan o'lchanadi: 1000 g xom → 655 g pishgan. */
export const COOK_YIELD_BASE = 1000

/**
 * Kirimdagi miqdor (asosiy birlikda) normaga ko'ra bo'linadi — backend `src/domain/yield-norm.ts` bilan bir xil: 70 kg
 * tovuq, namuna 64 kg → 34,5 kg go'sht + 5 kg qanot ⇒ 37 734 g go'sht + 5 469 g qanot.
 */
export function normSplit(baseQty: number, norm: YieldNorm, inputUnit: StockUnit, unitOf: (ingredientId: string) => StockUnit): YieldOutput[] {
  const sample = toBase(norm.qty, inputUnit)
  return norm.outputs.map((output) => ({
    ingredientId: output.ingredientId,
    qty: Math.round((baseQty * toBase(output.qty, unitOf(output.ingredientId))) / sample),
  }))
}

/**
 * Chiqqan mahsulotning 1 birlik narxi (backend bilan bir xil): kirim summasi chiqqanlarga og'irligi bo'yicha teng —
 * 30 000 so'm / kg tovuq, 64 kg dan 39,5 kg → 30 000 × 64 ÷ 39,5 = 48 608. [lineSize], [outputSize] — hisob birligi
 * hajmi asosiy birlikda (1 kg = 1000; qadoqli — 1 dona).
 */
export function normOutputPrice(
  price: number,
  lineSize: number,
  norm: YieldNorm,
  inputUnit: StockUnit,
  unitOf: (ingredientId: string) => StockUnit,
  outputSize: number,
): number {
  const sample = toBase(norm.qty, inputUnit)
  const out = norm.outputs.reduce((sum, output) => sum + toBase(output.qty, unitOf(output.ingredientId)), 0)
  return Math.round((price * sample * outputSize) / (lineSize * out))
}

/**
 * Retseptdagi **pishgan** miqdor → ombordan ayriladigan xom miqdor (backend bilan bir xil): 1000 g → 655 g bo'lsa
 * 100 g pishgan = 153 g. [cookYield] `null` — o'zi.
 */
export function rawQty(qty: number, cookYield: number | null | undefined): number {
  if (cookYield == null) return qty
  return Math.max(1, Math.round((qty * COOK_YIELD_BASE) / cookYield))
}

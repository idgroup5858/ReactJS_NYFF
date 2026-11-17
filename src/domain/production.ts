import type { StockUnit } from './types.ts'
import { unitSize } from './units.ts'

/** Tayyorlashda sarflangan mahsulot: miqdor asosiy birlikda (g / ml / dona) va uning 1 birlik narxi. */
export interface CostLine {
  /** asosiy birlikda */
  qty: number
  unit: StockUnit
  packSize: number | null
  /** 1 birlik (qadoqli — 1 dona) narxi, so'm; `null` — narxi yozilmagan */
  lastPrice: number | null
}

/**
 * Sarflanganlar tannarxi, so'm (butun) — backend `src/domain/production.ts` bilan bir xil: har biri — miqdor × narx ÷
 * hisob birligi hajmi. Birortasining narxi bo'lmasa — `null` (yarim tannarx noto'g'ri bo'lardi).
 */
export function productionCost(lines: CostLine[]): number | null {
  let total = 0
  for (const line of lines) {
    if (line.lastPrice === null) return null
    total += (line.qty * line.lastPrice) / unitSize(line.unit, line.packSize)
  }
  return Math.round(total)
}

/** Tayyor mahsulotning 1 birlik (qadoqli — 1 dona) narxi, so'm: tannarx ÷ chiqqan miqdor ([baseQty] — asosiy birlikda, > 0). */
export function producedUnitPrice(cost: number, baseQty: number, unit: StockUnit, packSize: number | null): number {
  return Math.round((cost * unitSize(unit, packSize)) / baseQty)
}

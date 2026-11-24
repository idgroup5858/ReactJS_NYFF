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

/**
 * "Chelak (qadoq) bilan" tayyorlash mumkin bo'lgan mahsulot (backend bilan bir xil): kg / l va qadoq hajmi bor — Chesnok
 * sousi, Mayonez Milter. Shunday sarflangan qator ham qadoqda: Milter "4" → 12 000 g. Donali qadoq (tuxum) — donada.
 */
export function packedLine(unit: StockUnit, packSize: number | null): boolean {
  return unit !== 'pcs' && packSize !== null
}

/**
 * "Chelak bilan" tayyorlashda 1 qadoq og'irligi, asosiy birlikda (backend bilan bir xil): sarflangan kg / l lar jami
 * (1 ml = 1 g) ÷ chiqqan qadoq soni; donali (tuxum) kirmaydi. 13 300 g, 5 chelak → 2 660 g.
 */
export function packWeight(lines: { qty: number; unit: StockUnit }[], packs: number): number {
  const total = lines.reduce((sum, line) => sum + (line.unit === 'pcs' ? 0 : line.qty), 0)
  return Math.round(total / packs)
}

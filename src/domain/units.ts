import type { BaseUnit, StockUnit } from './types.ts'

const FACTOR: Record<StockUnit, number> = { kg: 1000, l: 1000, pcs: 1 }
const BASE: Record<StockUnit, BaseUnit> = { kg: 'g', l: 'ml', pcs: 'pcs' }

export function baseUnitOf(unit: StockUnit): BaseUnit {
  return BASE[unit]
}

/**
 * Hisob birligining hajmi asosiy birlikda (backend `src/domain/units.ts` bilan bir xil): qadoq hajmi berilgan bo'lsa —
 * 1 dona (qadoq), masalan 600 g lik ketchup; aks holda 1 kg / l / dona. Kirim, ko'chirish, narx, qoldiq — shu birlikda.
 */
export function unitSize(unit: StockUnit, packSize: number | null = null): number {
  return packSize ?? FACTOR[unit]
}

/** 12.5 kg → 12500 g; qadoq 600 g bo'lsa 10 dona → 6000 g. Asosiy birlik doim butun son. */
export function toBase(qty: number, unit: StockUnit, packSize: number | null = null): number {
  return Math.round(qty * unitSize(unit, packSize))
}

/** 12500 g → 12.5 kg; qadoq 600 g bo'lsa 5400 g → 9 dona */
export function fromBase(qty: number, unit: StockUnit, packSize: number | null = null): number {
  return qty / unitSize(unit, packSize)
}

/** Narx bir hisob birligidan boshqasiga (so'm, butun): 28 000 / kg → 600 g lik qadoq — 16 800 / dona. */
export function convertPrice(price: number, fromSize: number, toSize: number): number {
  return Math.round((price * toSize) / fromSize)
}

/** Qoldiq to'liq qadoqlar va ochilganida qolgani bilan: 5950 g, qadoq 600 g → 9 dona + 550 g. */
export function splitPacks(qty: number, packSize: number): { packs: number; rest: number } {
  const packs = Math.trunc(qty / packSize) || 0 // −0 emas
  return { packs, rest: qty - packs * packSize }
}

import { baseUnitOf, fromBase } from '@/domain/units'
import type { StockUnit } from '@/domain/types'
import type { Dict } from '@/i18n/uz'

/**
 * Uzilmaydigan bo'shliq: raqam guruhlari orasida va raqam bilan birlik ("so'm", "kg") orasida — tor joyda "16 866 /
 * 000 so'm" bo'lib ikki qatorga bo'linmasin. Inputlar raqam bo'lmagan belgilarni (`\D`) olib tashlaydi.
 */
const NBSP = ' '

/** 1234567 → "1 234 567" (bo'shliq bilan, til sozlamasidan qat'i nazar bir xil). */
export function formatNumber(value: number, maxFractionDigits = 0): string {
  const fixed = maxFractionDigits > 0 ? Number(value.toFixed(maxFractionDigits)) : Math.round(value)
  const [int, frac] = String(Math.abs(fixed)).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
  return `${fixed < 0 ? '−' : ''}${grouped}${frac ? `,${frac}` : ''}`
}

export function formatMoney(value: number, t: Dict): string {
  return `${formatNumber(value)}${NBSP}${t.common.soum}`
}

/** Diagramma o'qlari uchun qisqa son: 1 250 000 → "1,3 mln", 850 000 → "850 ming". */
export function formatCompact(value: number, t: Dict): string {
  if (Math.abs(value) >= 1_000_000) return `${formatNumber(value / 1_000_000, 1)}${NBSP}${t.admin.reports.mln}`
  if (Math.abs(value) >= 1_000) return `${formatNumber(value / 1_000)}${NBSP}${t.admin.reports.thousand}`
  return formatNumber(value)
}

/** Asosiy birlikdagi qoldiqni ombor birligida ko'rsatadi: 12500 g → "12,5 kg". */
export function formatStock(baseQty: number, unit: StockUnit, t: Dict): string {
  return `${formatNumber(fromBase(baseQty, unit), 3)}${NBSP}${t.units[unit]}`
}

/** Buyurtma raqami: 7 → "#007" — TV, oshxona va chekda bir xil. */
export function formatOrderNumber(number: number): string {
  return `#${String(number).padStart(3, '0')}`
}

const pad = (value: number) => String(value).padStart(2, '0')

/** "14:05" */
export function formatTime(iso: string): string {
  const date = new Date(iso)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** "23.10.2026 14:05" */
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${formatTime(iso)}`
}

/** Retsept miqdori asosiy birlikda: "120 g", "1 dona". */
export function formatRecipeQty(baseQty: number, unit: StockUnit, t: Dict): string {
  return `${formatNumber(baseQty)}${NBSP}${t.units[baseUnitOf(unit)]}`
}

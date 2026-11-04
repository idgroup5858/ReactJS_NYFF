import { baseUnitOf, fromBase, splitPacks } from '@/domain/units'
import type { OnlineInfo, OrderType, StockUnit } from '@/domain/types'
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
/** Yetkazish narxi: 0 — "Bepul". */
export function formatDeliveryFee(fee: number, t: Dict): string {
  return fee === 0 ? t.admin.delivery.free : formatMoney(fee, t)
}

export function formatCompact(value: number, t: Dict): string {
  if (Math.abs(value) >= 1_000_000) return `${formatNumber(value / 1_000_000, 1)}${NBSP}${t.admin.reports.mln}`
  if (Math.abs(value) >= 1_000) return `${formatNumber(value / 1_000)}${NBSP}${t.admin.reports.thousand}`
  return formatNumber(value)
}

/** Ombor mahsulotining birligi va qadog'i (mahsulot yoki hujjat qatoridagi surat). */
type Counted = { unit: StockUnit; packSize: number | null }

/** Hisob birligi nomi: qadoqsiz — "kg" / "l" / "dona", qadoqli — "dona" (dona bilan sanaladigan mahsulotda — "qadoq"). */
export function countUnit({ unit, packSize }: Counted, t: Dict): string {
  return packSize === null ? t.units[unit] : unit === 'pcs' ? t.units.packOfPcs : t.units.pack
}

/** Birlik qadog'i bilan: "dona (600 g)"; qadoqsiz — "kg". */
export function formatUnit(item: Counted, t: Dict): string {
  if (item.packSize === null) return t.units[item.unit]
  return `${countUnit(item, t)} (${formatNumber(item.packSize)}${NBSP}${t.units[baseUnitOf(item.unit)]})`
}

/**
 * Asosiy birlikdagi qoldiqni ombor birligida ko'rsatadi: 12500 g → "12,5 kg"; qadoqli mahsulotda — to'liq donalar va
 * ochilganida qolgani: 5950 g, 1 dona = 600 g → "9 dona + 550 g" (50 g → "50 g", 6000 g → "10 dona").
 */
export function formatStock(baseQty: number, item: Counted, t: Dict): string {
  if (item.packSize === null) return `${formatNumber(fromBase(baseQty, item.unit), 3)}${NBSP}${t.units[item.unit]}`
  const { packs, rest } = splitPacks(Math.abs(baseQty), item.packSize)
  const parts = [
    packs > 0 || rest === 0 ? `${formatNumber(packs)}${NBSP}${countUnit(item, t)}` : null,
    rest > 0 ? `${formatNumber(rest)}${NBSP}${t.units[baseUnitOf(item.unit)]}` : null,
  ].filter(Boolean)
  return `${baseQty < 0 ? '−' : ''}${parts.join(' + ')}`
}

/** Buyurtma raqami: 7 → "#007" — TV, kassa va chekda bir xil. */
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

/** Mobil buyurtmada mijoz tanlagan to'lov: "Click orqali to'langan" / "Naqd — kuryerga" / "Naqd — filialda". */
export function formatOnlinePayment(online: OnlineInfo, type: OrderType, t: Dict): string {
  if (online.payment === 'click') return t.orders.paidOnline
  return type === 'delivery' ? t.orders.payOnDelivery : t.orders.payOnPickup
}

/** Retsept miqdori asosiy birlikda: "120 g", "1 dona". */
export function formatRecipeQty(baseQty: number, unit: StockUnit, t: Dict): string {
  return `${formatNumber(baseQty)}${NBSP}${t.units[baseUnitOf(unit)]}`
}

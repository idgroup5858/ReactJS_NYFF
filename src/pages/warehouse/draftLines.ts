import type { ID, Ingredient } from '@/domain/types'
import { parseQty } from '@/lib/warehouses'

/** Kirim / ko'chirish formasidagi qator: miqdor matn ko'rinishida (yozilayotganda "12," ham bo'lishi mumkin). */
export interface DraftLine {
  key: string
  ingredientId: ID
  /** ombor birligida (kg / l / dona; qadoqli — qadoqda) */
  qty: string
  /**
   * Faqat donali qadoqli mahsulotda (tuxum, 1 qadoq = 30 dona; kirim va ko'chirish): qadoqdan tashqari dona, raqamlar.
   * Boshqa mahsulotda e'tiborga olinmaydi.
   */
  pieces: string
  /**
   * Faqat kirimda: 1 birlik (qadoqli — 1 dona) narxi, raqamlar. `null` — hali yozilmagan: mahsulotning oxirgi narxi
   * ko'rinadi va shu yuboriladi (mahsulot almashtirilsa yana `null`).
   */
  price: string | null
}

let seq = 0

export function newDraftLine(ingredientId: ID = '', qty = ''): DraftLine {
  seq += 1
  return { key: `draft_${seq}`, ingredientId, qty, pieces: '', price: null }
}

/**
 * Donali qadoqli mahsulot (tuxum: 1 qadoq = 30 dona) — kirim va ko'chirishda ikki maydon: qadoq va dona (2026-11-18).
 * Qadoq hajmi (donada), boshqasida — `null` (ketchup 600 g lik — avvalgidek bitta maydon, donada).
 */
export function piecePack(ingredient: Pick<Ingredient, 'unit' | 'packSize'> | undefined): number | null {
  return ingredient?.unit === 'pcs' ? ingredient.packSize : null
}

/**
 * Qator miqdori ombor birligida (qadoqli — qadoqda) — api ga shunday ketadi. [pack] — `piecePack`: berilsa, qadoq va
 * dona maydonlari qo'shiladi, bo'shi — 0: 1 qadoq + 20 dona (30 talik) → 50/30 qadoq, faqat 50 dona — ham 50/30.
 * Ikkalasi bo'sh yoki noto'g'ri — NaN.
 */
export function lineQty(line: DraftLine, pack: number | null): number {
  if (pack === null) return parseQty(line.qty)
  if (line.qty.trim() === '' && line.pieces.trim() === '') return Number.NaN
  const part = (value: string) => (value.trim() === '' ? 0 : parseQty(value))
  return (part(line.qty) * pack + part(line.pieces)) / pack
}

/**
 * Formaning boshlang'ich qatorlari havoladan ("To'ldirish"): `?item=<id>&qty=<son>` — bitta qator, `?items=<id>:<son>,…`
 * — bir nechta ("Hammasini to'ldirish"). Hech biri yo'q — bitta bo'sh qator.
 */
export function linesFromParams(params: URLSearchParams): DraftLine[] {
  const many = (params.get('items') ?? '')
    .split(',')
    .map((pair) => pair.split(':'))
    .filter(([id]) => !!id)
    .map(([id, qty]) => newDraftLine(id, qty ?? ''))
  return many.length > 0 ? many : [newDraftLine(params.get('item') ?? '', params.get('qty') ?? '')]
}

/**
 * To'liq to'ldirilgan qatorlar (mahsulot tanlangan, miqdor > 0) — api ga yuboriladigan ko'rinishda. [ingredients] —
 * ko'chirishda (donali qadoqda qadoq + dona); tayyorlashda berilmaydi — miqdor qadoqsiz, bitta maydon.
 */
export function readyLines(lines: DraftLine[], ingredients?: Ingredient[]): { ingredientId: ID; qty: number }[] {
  return lines.flatMap((line) => {
    const pack = ingredients ? piecePack(ingredients.find((i) => i.id === line.ingredientId)) : null
    const qty = lineQty(line, pack)
    return line.ingredientId && qty > 0 ? [{ ingredientId: line.ingredientId, qty }] : []
  })
}

/** Kirim qatorining narxi: yozilgani, yozilmagan bo'lsa — mahsulotning oxirgi narxi; bo'sh / noma'lum — `null`. */
export function linePrice(line: DraftLine, ingredient: Pick<Ingredient, 'lastPrice'> | undefined): number | null {
  if (line.price !== null) return line.price === '' ? null : Number(line.price)
  return ingredient?.lastPrice ?? null
}

/**
 * Kirimga yuboriladigan qatorlar narxi bilan va jami summa (web jadvali va bot xabari bilan bir xil). [missingPrice] —
 * to'ldirilgan qatorlardan birining narxi yo'q (yuborib bo'lmaydi).
 */
export function readyPurchase(lines: DraftLine[], ingredients: Ingredient[]) {
  const ready = lines.flatMap((line) => {
    const ingredient = ingredients.find((i) => i.id === line.ingredientId)
    const qty = lineQty(line, piecePack(ingredient))
    if (!line.ingredientId || !(qty > 0)) return []
    return [{ ingredientId: line.ingredientId, qty, price: linePrice(line, ingredient) }]
  })
  return {
    items: ready.flatMap(({ price, ...rest }) => (price === null ? [] : [{ ...rest, price }])),
    missingPrice: ready.some((line) => line.price === null),
    total: Math.round(ready.reduce((sum, line) => sum + line.qty * (line.price ?? 0), 0)),
  }
}

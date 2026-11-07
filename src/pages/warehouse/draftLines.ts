import type { ID, Ingredient } from '@/domain/types'
import { parseQty } from '@/lib/warehouses'

/** Kirim / ko'chirish formasidagi qator: miqdor matn ko'rinishida (yozilayotganda "12," ham bo'lishi mumkin). */
export interface DraftLine {
  key: string
  ingredientId: ID
  qty: string
  /**
   * Faqat kirimda: 1 birlik (qadoqli — 1 dona) narxi, raqamlar. `null` — hali yozilmagan: mahsulotning oxirgi narxi
   * ko'rinadi va shu yuboriladi (mahsulot almashtirilsa yana `null`).
   */
  price: string | null
}

let seq = 0

export function newDraftLine(ingredientId: ID = '', qty = ''): DraftLine {
  seq += 1
  return { key: `draft_${seq}`, ingredientId, qty, price: null }
}

/** To'liq to'ldirilgan qatorlar (mahsulot tanlangan, miqdor > 0) — api ga yuboriladigan ko'rinishda. */
export function readyLines(lines: DraftLine[]): { ingredientId: ID; qty: number }[] {
  return lines.flatMap((line) => {
    const qty = parseQty(line.qty)
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
    const qty = parseQty(line.qty)
    if (!line.ingredientId || !(qty > 0)) return []
    return [{ ingredientId: line.ingredientId, qty, price: linePrice(line, ingredients.find((i) => i.id === line.ingredientId)) }]
  })
  return {
    items: ready.flatMap(({ price, ...rest }) => (price === null ? [] : [{ ...rest, price }])),
    missingPrice: ready.some((line) => line.price === null),
    total: Math.round(ready.reduce((sum, line) => sum + line.qty * (line.price ?? 0), 0)),
  }
}

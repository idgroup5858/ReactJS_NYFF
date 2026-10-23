import type { ID } from '@/domain/types'
import { parseQty } from '@/lib/warehouses'

/** Kirim / ko'chirish formasidagi qator: miqdor matn ko'rinishida (yozilayotganda "12," ham bo'lishi mumkin). */
export interface DraftLine {
  key: string
  ingredientId: ID
  qty: string
}

let seq = 0

export function newDraftLine(ingredientId: ID = '', qty = ''): DraftLine {
  seq += 1
  return { key: `draft_${seq}`, ingredientId, qty }
}

/** To'liq to'ldirilgan qatorlar (mahsulot tanlangan, miqdor > 0) — api ga yuboriladigan ko'rinishda. */
export function readyLines(lines: DraftLine[]): { ingredientId: ID; qty: number }[] {
  return lines.flatMap((line) => {
    const qty = parseQty(line.qty)
    return line.ingredientId && qty > 0 ? [{ ingredientId: line.ingredientId, qty }] : []
  })
}

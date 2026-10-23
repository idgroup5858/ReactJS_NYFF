import type { ID } from '@/domain/types'

/** Savat qatori. Narx bu yerda saqlanmaydi — har doim filialning joriy narxidan olinadi. */
export interface CartLine {
  key: string
  productId: ID
  qty: number
  note: string
}

let seq = 0
const nextKey = () => `line_${++seq}`

/** Taom qo'shish: shu izohli (yoki izohsiz) qator bo'lsa — soni oshadi, aks holda yangi qator. Kassa va kiosk savati. */
export function addProduct(lines: CartLine[], productId: ID, qty = 1, note = ''): CartLine[] {
  const cleanNote = note.trim()
  const same = lines.find((line) => line.productId === productId && line.note === cleanNote)
  if (same) return lines.map((line) => (line === same ? { ...line, qty: line.qty + qty } : line))
  return [...lines, { key: nextKey(), productId, qty, note: cleanNote }]
}

/** Soni 0 ga tushsa qator o'chadi. */
export function changeQty(lines: CartLine[], key: string, delta: number): CartLine[] {
  return lines.flatMap((line) => {
    if (line.key !== key) return [line]
    const qty = line.qty + delta
    return qty > 0 ? [{ ...line, qty }] : []
  })
}

export function setNote(lines: CartLine[], key: string, note: string): CartLine[] {
  return lines.map((line) => (line.key === key ? { ...line, note } : line))
}

export function removeLine(lines: CartLine[], key: string): CartLine[] {
  return lines.filter((line) => line.key !== key)
}

export function cartQty(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.qty, 0)
}

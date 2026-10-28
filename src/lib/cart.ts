import type { ID } from '@/domain/types'

/** Savat qatori. Narx bu yerda saqlanmaydi — har doim filialning joriy narxidan olinadi. */
export interface CartLine {
  key: string
  productId: ID
  qty: number
}

let seq = 0
const nextKey = () => `line_${++seq}`

/** Taom qo'shish: savatda bo'lsa — soni oshadi, aks holda yangi qator. Kassa va kiosk savati. */
export function addProduct(lines: CartLine[], productId: ID, qty = 1): CartLine[] {
  const same = lines.find((line) => line.productId === productId)
  if (same) return lines.map((line) => (line === same ? { ...line, qty: line.qty + qty } : line))
  return [...lines, { key: nextKey(), productId, qty }]
}

/** Soni 0 ga tushsa qator o'chadi. */
export function changeQty(lines: CartLine[], key: string, delta: number): CartLine[] {
  return lines.flatMap((line) => {
    if (line.key !== key) return [line]
    const qty = line.qty + delta
    return qty > 0 ? [{ ...line, qty }] : []
  })
}

export function removeLine(lines: CartLine[], key: string): CartLine[] {
  return lines.filter((line) => line.key !== key)
}

export function cartQty(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.qty, 0)
}

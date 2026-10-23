import { newId } from '../ids.ts'
import type { Db, ID, MovementKind, StockItem, StockMovement, Timestamp } from '../types.ts'

/** Qoldiq o'zgarishi, asosiy birlikda: musbat — kirim, manfiy — chiqim. */
export interface StockDelta {
  ingredientId: ID
  qty: number
}

export function stockItem(db: Db, warehouseId: ID, ingredientId: ID): StockItem | undefined {
  return db.stock.find((s) => s.warehouseId === warehouseId && s.ingredientId === ingredientId)
}

export function stockQty(db: Db, warehouseId: ID, ingredientId: ID): number {
  return stockItem(db, warehouseId, ingredientId)?.qty ?? 0
}

/** Bir xil mahsulot o'zgarishlarini qo'shib, nollarini tashlaydi. */
function mergeDeltas(deltas: StockDelta[]): Map<ID, number> {
  const merged = new Map<ID, number>()
  for (const delta of deltas) merged.set(delta.ingredientId, (merged.get(delta.ingredientId) ?? 0) + delta.qty)
  for (const [id, qty] of merged) if (qty === 0) merged.delete(id)
  return merged
}

/** Omborga o'zgarishlarni qo'llaydi va har bir mahsulot uchun harakat yozadi. Qoldiq manfiyga tushishi mumkin. */
export function applyStockDeltas(
  db: Db,
  warehouseId: ID,
  deltas: StockDelta[],
  kind: MovementKind,
  refId: ID,
  at: Timestamp,
): Db {
  const merged = mergeDeltas(deltas)
  if (merged.size === 0) return db

  const stock = [...db.stock]
  const movements: StockMovement[] = []
  for (const [ingredientId, qty] of merged) {
    const index = stock.findIndex((s) => s.warehouseId === warehouseId && s.ingredientId === ingredientId)
    if (index === -1) stock.push({ warehouseId, ingredientId, qty, minQty: 0 })
    else stock[index] = { ...stock[index], qty: stock[index].qty + qty }
    movements.push({ id: newId('mov'), warehouseId, ingredientId, qty, kind, refId, createdAt: at })
  }
  return { ...db, stock, movements: [...db.movements, ...movements] }
}

/** Taomlar retsepti bo'yicha kerak bo'ladigan mahsulotlar (asosiy birlikda). [sign] = -1 — sotuv uchun chiqim. */
export function recipeDeltas(db: Db, items: { productId: ID; qty: number }[], sign: 1 | -1): StockDelta[] {
  const deltas: StockDelta[] = []
  for (const item of items) {
    const product = db.products.find((p) => p.id === item.productId)
    if (!product) continue
    for (const line of product.recipe) deltas.push({ ingredientId: line.ingredientId, qty: sign * line.qty * item.qty })
  }
  return deltas
}

/** Ogohlantirish: chegarasi qo'yilgan va qoldig'i chegaradan kam mahsulotlar. */
export function lowStockItems(db: Db, warehouseId?: ID): StockItem[] {
  return db.stock.filter((s) => s.minQty > 0 && s.qty < s.minQty && (warehouseId === undefined || s.warehouseId === warehouseId))
}

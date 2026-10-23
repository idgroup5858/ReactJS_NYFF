import { fail } from '../errors.ts'
import { newId } from '../ids.ts'
import { toBase } from '../units.ts'
import type { Db, ID, Ingredient, Purchase, PurchaseItem } from '../types.ts'
import { findOrFail, nextCounter, replaceById, type Mutation } from './common.ts'
import { applyStockDeltas } from './stock.ts'

export interface NewPurchaseInput {
  warehouseId: ID
  /** ombor birligida (kg / l / dona) */
  items: { ingredientId: ID; qty: number }[]
  note?: string
  createdBy: ID
}

export function purchaseTotal(purchase: Purchase): number {
  return purchase.items.reduce((sum, item) => sum + (item.price ?? 0) * item.qty, 0)
}

/**
 * Ta'minotchi kirimni kiritadi: hali omborga qo'shilmaydi. Narx oldingi tasdiqlangan kirimdan avtomatik yoziladi,
 * admin uni tasdiqlashda o'zgartirishi mumkin.
 */
export function createPurchase(db: Db, input: NewPurchaseInput, now: Date): Mutation<Purchase> {
  if (input.items.length === 0) fail('empty_order')
  findOrFail(db.warehouses, input.warehouseId, 'warehouse')
  const items: PurchaseItem[] = input.items.map((line) => {
    const ingredient = findOrFail(db.ingredients, line.ingredientId, 'ingredient')
    if (!(line.qty > 0)) fail('invalid_qty', ingredient.id)
    return { ingredientId: ingredient.id, qty: line.qty, price: ingredient.lastPrice }
  })
  const counter = nextCounter(db, 'purchase')
  const purchase: Purchase = {
    id: newId('pur'),
    number: counter.result,
    warehouseId: input.warehouseId,
    items,
    note: input.note?.trim() ?? '',
    status: 'pending',
    createdBy: input.createdBy,
    createdAt: now.toISOString(),
    decidedBy: null,
    decidedAt: null,
  }
  return { db: { ...counter.db, purchases: [...counter.db.purchases, purchase] }, result: purchase }
}

/**
 * Admin narxlarni kiritib tasdiqlaydi: mahsulotlar omborga qo'shiladi, har bir mahsulotning "oxirgi narxi" yangilanadi.
 * [prices] — mahsulot id → 1 birlik narxi; berilmaganlari kirimdagi narxida qoladi.
 */
export function approvePurchase(db: Db, purchaseId: ID, prices: Record<ID, number>, adminId: ID, now: Date): Mutation<Purchase> {
  const purchase = findOrFail(db.purchases, purchaseId, 'purchase')
  if (purchase.status !== 'pending') fail('already_decided')

  const items = purchase.items.map((item) => {
    const price = prices[item.ingredientId] ?? item.price
    if (price === null || !(price >= 0)) fail('invalid_price', item.ingredientId)
    return { ...item, price }
  })
  const at = now.toISOString()
  const approved: Purchase = { ...purchase, items, status: 'approved', decidedBy: adminId, decidedAt: at }

  const ingredients: Ingredient[] = db.ingredients.map((ingredient) => {
    const item = items.find((i) => i.ingredientId === ingredient.id)
    return item ? { ...ingredient, lastPrice: item.price } : ingredient
  })
  const deltas = items.map((item) => {
    const ingredient = findOrFail(db.ingredients, item.ingredientId, 'ingredient')
    return { ingredientId: item.ingredientId, qty: toBase(item.qty, ingredient.unit) }
  })

  let next: Db = { ...db, ingredients, purchases: replaceById(db.purchases, approved) }
  next = applyStockDeltas(next, purchase.warehouseId, deltas, 'purchase', purchase.id, at)
  return { db: next, result: approved }
}

export function rejectPurchase(db: Db, purchaseId: ID, adminId: ID, now: Date): Mutation<Purchase> {
  const purchase = findOrFail(db.purchases, purchaseId, 'purchase')
  if (purchase.status !== 'pending') fail('already_decided')
  const rejected: Purchase = { ...purchase, status: 'rejected', decidedBy: adminId, decidedAt: now.toISOString() }
  return { db: { ...db, purchases: replaceById(db.purchases, rejected) }, result: rejected }
}

import { fail } from '../errors.ts'
import { newId } from '../ids.ts'
import type { Db, ID, Ingredient, IngredientGroup, LocalizedText, StockItem, StockUnit } from '../types.ts'
import { findOrFail, replaceById, type Mutation } from './common.ts'

export interface IngredientInput {
  id?: ID
  name: LocalizedText
  group: IngredientGroup
  /** faqat yangi mahsulotda — keyin o'zgartirilmaydi (qoldiq va retseptlar shu birlikda hisoblangan) */
  unit: StockUnit
  active: boolean
}

export function saveIngredient(db: Db, input: IngredientInput): Mutation<Ingredient> {
  const name = { uz: input.name.uz.trim(), ru: input.name.ru.trim(), en: input.name.en.trim() }
  if (!name.uz) fail('name_required')
  if (input.id) {
    const current = findOrFail(db.ingredients, input.id, 'ingredient')
    const ingredient: Ingredient = { ...current, name, group: input.group, active: input.active }
    return { db: { ...db, ingredients: replaceById(db.ingredients, ingredient) }, result: ingredient }
  }
  const ingredient: Ingredient = { id: newId('ing'), name, group: input.group, unit: input.unit, lastPrice: null, active: input.active }
  return { db: { ...db, ingredients: [...db.ingredients, ingredient] }, result: ingredient }
}

/** Ogohlantirish chegarasi (asosiy birlikda); 0 — kuzatilmaydi. Qoldiq yozuvi bo'lmasa — 0 qoldiq bilan ochiladi. */
export function setMinQty(db: Db, warehouseId: ID, ingredientId: ID, minQty: number): Mutation<StockItem> {
  findOrFail(db.warehouses, warehouseId, 'warehouse')
  findOrFail(db.ingredients, ingredientId, 'ingredient')
  if (!Number.isInteger(minQty) || minQty < 0) fail('invalid_qty', ingredientId)
  const index = db.stock.findIndex((s) => s.warehouseId === warehouseId && s.ingredientId === ingredientId)
  const item: StockItem = index === -1 ? { warehouseId, ingredientId, qty: 0, minQty } : { ...db.stock[index], minQty }
  const stock = index === -1 ? [...db.stock, item] : db.stock.map((s, i) => (i === index ? item : s))
  return { db: { ...db, stock }, result: item }
}

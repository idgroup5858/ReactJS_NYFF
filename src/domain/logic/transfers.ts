import { fail } from '../errors.ts'
import { newId } from '../ids.ts'
import { toBase } from '../units.ts'
import type { Db, ID, Transfer, TransferItem } from '../types.ts'
import { findOrFail, nextCounter, type Mutation } from './common.ts'
import { applyStockDeltas, stockQty } from './stock.ts'

export interface NewTransferInput {
  fromWarehouseId: ID
  toWarehouseId: ID
  /** ombor birligida (kg / l / dona) */
  items: TransferItem[]
  note?: string
  createdBy: ID
}

/** Ombordan omborga ko'chirish: biridan chiqim, ikkinchisiga kirim — bir vaqtda. */
export function createTransfer(db: Db, input: NewTransferInput, now: Date): Mutation<Transfer> {
  if (input.fromWarehouseId === input.toWarehouseId) fail('same_warehouse')
  if (input.items.length === 0) fail('empty_order')
  findOrFail(db.warehouses, input.fromWarehouseId, 'warehouse')
  findOrFail(db.warehouses, input.toWarehouseId, 'warehouse')

  const baseDeltas = input.items.map((item) => {
    const ingredient = findOrFail(db.ingredients, item.ingredientId, 'ingredient')
    if (!(item.qty > 0)) fail('invalid_qty', ingredient.id)
    return { ingredientId: ingredient.id, qty: toBase(item.qty, ingredient.unit) }
  })
  // bir mahsulot ikki qatorda bo'lsa ham jami qoldiqdan oshmasin
  const needed = new Map<ID, number>()
  for (const delta of baseDeltas) needed.set(delta.ingredientId, (needed.get(delta.ingredientId) ?? 0) + delta.qty)
  for (const [ingredientId, qty] of needed) {
    if (stockQty(db, input.fromWarehouseId, ingredientId) < qty) fail('insufficient_stock', ingredientId)
  }

  const counter = nextCounter(db, 'transfer')
  const at = now.toISOString()
  const transfer: Transfer = {
    id: newId('trf'),
    number: counter.result,
    fromWarehouseId: input.fromWarehouseId,
    toWarehouseId: input.toWarehouseId,
    items: input.items.map((item) => ({ ingredientId: item.ingredientId, qty: item.qty })),
    note: input.note?.trim() ?? '',
    createdBy: input.createdBy,
    createdAt: at,
  }

  let next: Db = { ...counter.db, transfers: [...counter.db.transfers, transfer] }
  next = applyStockDeltas(next, input.fromWarehouseId, baseDeltas.map((d) => ({ ...d, qty: -d.qty })), 'transfer_out', transfer.id, at)
  next = applyStockDeltas(next, input.toWarehouseId, baseDeltas, 'transfer_in', transfer.id, at)
  return { db: next, result: transfer }
}

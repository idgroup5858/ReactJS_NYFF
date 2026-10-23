import { fail } from '../errors.ts'
import type { Db, ID, Warehouse } from '../types.ts'

/**
 * Har bir buyruq bazaning yangi nusxasini va natijani qaytaradi — eski obyekt o'zgarmaydi. Backend ulanganda shu
 * funksiyalar o'rniga HTTP so'rovlar keladi, chaqiruvchi kod esa o'zgarmaydi (`api/` qatlami).
 */
export interface Mutation<T> {
  db: Db
  result: T
}

export function findOrFail<T extends { id: ID }>(items: T[], id: ID, what: string): T {
  return items.find((item) => item.id === id) ?? fail('not_found', `${what} ${id}`)
}

export function branchWarehouse(db: Db, branchId: ID): Warehouse {
  return db.warehouses.find((w) => w.kind === 'branch' && w.branchId === branchId) ?? fail('not_found', `warehouse of ${branchId}`)
}

/** `order:<filial>:<sana>`, `purchase`, `transfer` kabi hisoblagichning keyingi qiymati (1 dan). */
export function nextCounter(db: Db, key: string): Mutation<number> {
  const value = (db.counters[key] ?? 0) + 1
  return { db: { ...db, counters: { ...db.counters, [key]: value } }, result: value }
}

export function replaceById<T extends { id: ID }>(items: T[], next: T): T[] {
  return items.map((item) => (item.id === next.id ? next : item))
}

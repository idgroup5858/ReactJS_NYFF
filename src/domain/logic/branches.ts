import { fail } from '../errors.ts'
import { newId } from '../ids.ts'
import type { Branch, BranchPrice, Db, ID, Warehouse } from '../types.ts'
import { findOrFail, replaceById, type Mutation } from './common.ts'

export interface BranchInput {
  /** berilmasa — yangi filial */
  id?: ID
  name: string
  address: string
  phone: string
  active: boolean
  /** yangi filial uchun: narxlar shu filialdan nusxalanadi; `null` — narxsiz (taomlar sotilmaydi) */
  copyPricesFrom?: ID | null
}

/**
 * Filial qo'shish / tahrirlash. Yangi filialga o'z ombori ochiladi (qoldiq 0) va narxlari tanlangan filialdan
 * nusxalanadi — keyin admin "Narxlar" bo'limida o'zgartiradi.
 */
export function saveBranch(db: Db, input: BranchInput, now: Date): Mutation<Branch> {
  const name = input.name.trim()
  if (!name) fail('name_required')
  const fields = { name, address: input.address.trim(), phone: input.phone.trim(), active: input.active }

  if (input.id) {
    const branch: Branch = { ...findOrFail(db.branches, input.id, 'branch'), ...fields }
    return { db: { ...db, branches: replaceById(db.branches, branch) }, result: branch }
  }

  const branch: Branch = { id: newId('br'), ...fields, createdAt: now.toISOString() }
  const warehouse: Warehouse = { id: newId('wh'), name, kind: 'branch', branchId: branch.id }
  const source = input.copyPricesFrom ? findOrFail(db.branches, input.copyPricesFrom, 'branch').id : null
  const prices: BranchPrice[] = source
    ? db.prices.filter((p) => p.branchId === source).map((p) => ({ ...p, branchId: branch.id }))
    : []
  return {
    db: {
      ...db,
      branches: [...db.branches, branch],
      warehouses: [...db.warehouses, warehouse],
      prices: [...db.prices, ...prices],
    },
    result: branch,
  }
}

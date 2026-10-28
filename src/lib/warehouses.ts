import type { Branch, ID, Warehouse } from '@/domain/types'
import type { Dict } from '@/i18n/uz'

/** Ombor nomi joriy tilda: "Markaziy ombor" yoki "Chilonzor ombori". */
export function warehouseLabel(warehouses: Warehouse[], branches: Branch[], warehouseId: ID, t: Dict): string {
  const warehouse = warehouses.find((w) => w.id === warehouseId)
  if (!warehouse) return '—'
  if (warehouse.kind === 'central') return t.stock.central
  const branch = branches.find((b) => b.id === warehouse.branchId)
  return t.stock.branchWarehouse(branch?.name ?? warehouse.name)
}

/** Markaziy ombor birinchi, keyin faol filiallar omborlari (filiallar tartibida). */
export function activeWarehouses(warehouses: Warehouse[], branches: Branch[]): Warehouse[] {
  const central = warehouses.filter((w) => w.kind === 'central')
  const byBranch = branches
    .filter((b) => b.active)
    .flatMap((b) => warehouses.filter((w) => w.kind === 'branch' && w.branchId === b.id))
  return [...central, ...byBranch]
}

/** "12,5" yoki "12.5" → 12.5; bo'sh yoki noto'g'ri — NaN. */
export function parseQty(value: string): number {
  const normalized = value.replace(',', '.').trim()
  return normalized === '' ? Number.NaN : Number(normalized)
}

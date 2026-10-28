import type { ID } from '@/domain/types'

export const BRANCHES_PATH = '/admin/filiallar'
export const DELIVERY_MAP_PATH = `${BRANCHES_PATH}/xarita`

/** Xarita sahifasi; filial berilsa — darhol uning hududini tahrirlash. */
export const deliveryMapPath = (branchId?: ID) => (branchId ? `${DELIVERY_MAP_PATH}?filial=${branchId}` : DELIVERY_MAP_PATH)

/** Filialning xaritadagi rangi (hudud, pin, ro'yxatdagi belgi) — tartib bo'yicha, filial qo'shilganda boshqalari o'zgarmaydi. */
const BRANCH_COLORS = ['#f59e0b', '#2563eb', '#16a34a', '#db2777', '#7c3aed', '#0891b2', '#ea580c', '#4f46e5']

export function branchColor(branchIds: ID[], branchId: ID): string {
  return BRANCH_COLORS[Math.max(0, branchIds.indexOf(branchId)) % BRANCH_COLORS.length]
}

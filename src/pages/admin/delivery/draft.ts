import type { Branch, ID, LatLng } from '@/domain/types'

/** Xaritani bosganda nima bo'ladi: hududga nuqta qo'shiladi yoki filial joyi ko'chadi. */
export type DrawTool = 'zone' | 'location'

/** Filialning saqlanmagan yetkazib berish sozlamalari (xaritada tahrirlanayotgan paytda). */
export interface DeliveryDraft {
  branchId: ID
  zone: LatLng[]
  /** "Orqaga" uchun hududning oldingi holatlari */
  past: LatLng[][]
  location: LatLng | null
  fee: string
  fallbackBranchId: ID | ''
  onlineEnabled: boolean
  tool: DrawTool
}

export function draftOf(branch: Branch): DeliveryDraft {
  return {
    branchId: branch.id,
    zone: branch.deliveryZone,
    past: [],
    location: branch.location,
    fee: String(branch.deliveryFee),
    fallbackBranchId: branch.fallbackBranchId ?? '',
    onlineEnabled: branch.onlineEnabled,
    // joyi yo'q filialda avval joyini belgilash
    tool: branch.location ? 'zone' : 'location',
  }
}

export const draftFee = (draft: DeliveryDraft) => Number(draft.fee || 0)

export function isDirty(draft: DeliveryDraft, branch: Branch): boolean {
  const saved = [branch.deliveryZone, branch.location, branch.deliveryFee, branch.fallbackBranchId, branch.onlineEnabled]
  const current = [draft.zone, draft.location, draftFee(draft), draft.fallbackBranchId || null, draft.onlineEnabled]
  return JSON.stringify(saved) !== JSON.stringify(current)
}

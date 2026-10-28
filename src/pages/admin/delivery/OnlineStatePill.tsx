import type { BranchOnlineState } from '@/domain/types'
import { useT } from '@/i18n'

const CLASSES: Record<BranchOnlineState, { pill: string; dot: string }> = {
  open: { pill: 'bg-emerald-100 text-emerald-800 ring-emerald-300', dot: 'bg-emerald-500' },
  no_shift: { pill: 'bg-neutral-100 text-neutral-600 ring-neutral-300', dot: 'bg-neutral-400' },
  // smena ochiq, lekin kassa ekrani uzilgan — tuzatish kerak bo'lgan holat
  no_kassa: { pill: 'bg-red-100 text-red-700 ring-red-300', dot: 'bg-red-500' },
  off_hours: { pill: 'bg-sky-100 text-sky-800 ring-sky-300', dot: 'bg-sky-500' },
  paused: { pill: 'bg-amber-100 text-amber-800 ring-amber-300', dot: 'bg-amber-500' },
  inactive: { pill: 'bg-neutral-100 text-neutral-500 ring-neutral-200', dot: 'bg-neutral-300' },
}

/**
 * Filial online buyurtma oladimi (server hisoblaydi): qabul qilinmoqda / smena yopiq / kassa ulanmagan / ish vaqtidan
 * tashqari / to'xtatilgan; tooltip — buyurtmalar qayerga ketadi.
 */
export default function OnlineStatePill({ state }: { state: BranchOnlineState }) {
  const t = useT()
  const { pill, dot } = CLASSES[state]
  return (
    <span title={t.admin.delivery.stateHints[state]} className={`inline-flex cursor-help items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ring-1 ring-inset ${pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {t.admin.delivery.states[state]}
    </span>
  )
}

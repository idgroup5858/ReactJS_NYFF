import type { CourierStatus } from '@/domain/types'
import { useT } from '@/i18n'
import { courierActivity, type CourierActivity } from './courierActivity'

const CLASSES: Record<CourierActivity, { pill: string; dot: string }> = {
  free: { pill: 'bg-emerald-100 text-emerald-800 ring-emerald-300', dot: 'bg-emerald-500' },
  busy: { pill: 'bg-amber-100 text-amber-800 ring-amber-300', dot: 'bg-amber-500' },
  on_the_way: { pill: 'bg-sky-100 text-sky-800 ring-sky-300', dot: 'bg-sky-500' },
  off: { pill: 'bg-neutral-100 text-neutral-600 ring-neutral-300', dot: 'bg-neutral-400' },
  blocked: { pill: 'bg-neutral-100 text-neutral-400 ring-neutral-200', dot: 'bg-neutral-300' },
}

/** Kuryer holati yorlig'i (admin "Xodimlar" va kassa "Dostavka"). */
export default function CourierActivityPill({ courier }: { courier: CourierStatus }) {
  const t = useT()
  const activity = courierActivity(courier)
  const { pill, dot } = CLASSES[activity]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ring-1 ring-inset ${pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {t.courier.activity[activity]}
    </span>
  )
}

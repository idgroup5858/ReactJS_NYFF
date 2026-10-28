import { Bike } from 'lucide-react'
import { useCouriers } from '@/api/queries'
import { courierStage, type CourierStage } from '@/domain/rules'
import type { Order } from '@/domain/types'
import { useT } from '@/i18n'

/** Holat belgilaridagi ranglar oilasidan: kuryer kutilmoqda — sariq, kuryerda — ko'k, yetkazildi — yashil, qaytdi — qizil. */
const STAGE_CLASSES: Record<CourierStage, string> = {
  waiting: 'bg-amber-100 text-amber-900',
  taken: 'bg-sky-100 text-sky-800',
  on_the_way: 'bg-sky-600 text-white',
  delivered: 'bg-emerald-100 text-emerald-800',
  returned: 'bg-red-100 text-red-800',
}

/** Kuryer bosqichi — buyurtma turi belgisi (`OrderTypeBadge`) shaklida. */
export function CourierBadge({ stage }: { stage: CourierStage }) {
  const t = useT()
  return (
    <span className={`inline-flex items-center gap-1 rounded-chip px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${STAGE_CLASSES[stage]}`}>
      <Bike size={12} />
      {t.courier.stages[stage]}
    </span>
  )
}

/**
 * Mobil dostavkaning kuryer holati (kassa): bosqich, kuryer ismi (`/users/couriers`), qaytgan bo'lsa — sababi va
 * izohi; kuryer filialda turganda naqd buyurtma — "kassaga to'laydi". Boshqa buyurtmada — hech narsa.
 */
export function CourierLine({ order }: { order: Order }) {
  const t = useT()
  const couriers = useCouriers().data
  const stage = courierStage(order)
  if (!stage) return null
  const name = order.courierId ? couriers?.find((courier) => courier.id === order.courierId)?.name : undefined
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <CourierBadge stage={stage} />
      {name && <span className="font-semibold">{name}</span>}
      {stage === 'returned' && order.returnReason && (
        <span className="font-semibold text-red-700">
          {t.courier.reasons[order.returnReason]}
          {order.returnNote && ` — ${order.returnNote}`}
        </span>
      )}
      {stage === 'taken' && order.online?.payment === 'cash' && <span className="font-semibold text-amber-700">{t.courier.cashToKassa}</span>}
    </p>
  )
}

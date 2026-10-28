import { useBranches, useCouriers } from '@/api/queries'
import CourierActivityPill from '@/components/order/CourierActivityPill'
import { onDutyCouriers } from '@/components/order/courierActivity'
import { useT } from '@/i18n'

/**
 * Kassa "Dostavka" ro'yxati tepasida: ishdagi kuryerlar holati bilan (qo'lida buyurtma qolganlar ham — "Ishdaman"ni
 * o'chirgan bo'lsa ham); hech kim ishda bo'lmasa — ogohlantirish. Ma'lumot `KassaPage` dagi davriy so'rovdan.
 */
export default function CouriersOnDuty() {
  const t = useT()
  const couriers = useCouriers().data
  const branches = useBranches().data ?? []
  if (!couriers) return null

  const onDuty = onDutyCouriers(couriers).length
  const visible = couriers.filter((c) => c.active && (c.onDuty || c.orders > 0))
  if (onDuty === 0 && visible.length === 0) {
    return <p className="shrink-0 border-b border-amber-200 bg-amber-50 px-5 py-2 text-xs font-semibold text-amber-800">{t.courier.noneOnDuty}</p>
  }

  return (
    <div className="shrink-0 border-b border-neutral-200 bg-neutral-50 px-5 py-2">
      <p className="mb-1.5 text-[10px] font-bold tracking-[0.14em] text-neutral-500 uppercase">{t.courier.onDuty(onDuty)}</p>
      <ul className="flex flex-wrap gap-1.5">
        {visible.map((courier) => (
          <li
            key={courier.id}
            title={courier.orders > 0 ? t.courier.holding(courier.orders, branches.find((b) => b.id === courier.branchId)?.name ?? '—') : undefined}
            className="flex items-center gap-1.5 rounded-full bg-white py-0.5 pr-0.5 pl-2.5 text-xs font-semibold text-neutral-900 ring-1 ring-neutral-200"
          >
            {courier.name}
            <CourierActivityPill courier={courier} />
          </li>
        ))}
      </ul>
    </div>
  )
}

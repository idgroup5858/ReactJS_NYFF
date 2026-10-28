import { useBranches, useCouriers } from '@/api/queries'
import CourierActivityPill from '@/components/order/CourierActivityPill'
import { courierActivity, onDutyCouriers, type CourierActivity } from '@/components/order/courierActivity'
import { Card, CardHeader } from '@/components/ui/Card'
import UserAvatar from '@/components/ui/UserAvatar'
import { useT } from '@/i18n'

/** Tartib: ishlayotganlar tepada (yo'lda, buyurtma olgan, bo'sh), keyin ishda emaslar va bloklanganlar. */
const ORDER: CourierActivity[] = ['on_the_way', 'busy', 'free', 'off', 'blocked']

/**
 * Admin "Xodimlar": kuryerlar hozir ishdami — "Ishda: 2 / 3" va har biri holati bilan (qo'lida nechta buyurtma, qaysi
 * filialdan). "Ishdaman" kuryer ilovasida yoqiladi; socket'da kelmaydi — 30 soniyada yangilanadi.
 */
export default function CouriersCard() {
  const t = useT()
  const couriers = useCouriers({ refetchMs: 30_000 }).data
  const branches = useBranches().data ?? []
  if (!couriers) return null

  const onDuty = onDutyCouriers(couriers).length
  const total = couriers.filter((c) => c.active).length
  const sorted = [...couriers].sort((a, b) => ORDER.indexOf(courierActivity(a)) - ORDER.indexOf(courierActivity(b)) || a.name.localeCompare(b.name))

  return (
    <Card>
      <CardHeader
        title={t.courier.couriers}
        hint={t.courier.couriersHint}
        actions={
          <span className={`rounded-full px-3 py-1 text-sm font-extrabold tabular-nums ${onDuty > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-600'}`}>
            {t.courier.onDutyOf(onDuty, total)}
          </span>
        }
      />
      {couriers.length === 0 ? (
        <p className="px-4 py-3 text-sm text-neutral-500">{t.courier.noCouriers}</p>
      ) : (
        <ul className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((courier) => (
            <li key={courier.id} className={`flex items-center gap-3 rounded-card border border-line px-3 py-2 ${courier.active ? '' : 'opacity-50'}`}>
              <UserAvatar name={courier.name} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-neutral-950">{courier.name}</span>
                {courier.orders > 0 && (
                  <span className="block truncate text-xs text-neutral-500">
                    {t.courier.holding(courier.orders, branches.find((b) => b.id === courier.branchId)?.name ?? '—')}
                  </span>
                )}
              </span>
              <CourierActivityPill courier={courier} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

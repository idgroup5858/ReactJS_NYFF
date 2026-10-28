import { Ban } from 'lucide-react'
import { useBranches } from '@/api/queries'
import { distanceKm } from '@/domain/geo'
import type { DeliveryRoute, ID, LatLng } from '@/domain/types'
import { useT } from '@/i18n'
import { formatDeliveryFee, formatNumber } from '@/lib/format'

/**
 * "Tekshirish" natijasi (server hisoblagan): bosilgan nuqtadan buyurtma qaysi filialga tushadi, nega (hudud ichida /
 * hudud egasi yopiq — yo'naltirildi / hududdan tashqarida) va yetkazish narxi qancha.
 */
export default function RouteResult({ route, point, colorOf }: { route: DeliveryRoute; point: LatLng; colorOf: (branchId: ID) => string }) {
  const t = useT()
  const branches = useBranches().data ?? []
  const d = t.admin.delivery
  const target = branches.find((b) => b.id === route.branchId)
  const zone = branches.find((b) => b.id === route.zoneBranchId)

  if (!target) {
    return (
      <p className="flex gap-2 rounded-card bg-red-50 p-3 text-sm font-semibold text-red-800 ring-1 ring-red-200">
        <Ban size={16} className="mt-0.5 shrink-0" />
        {d.closedAll}
      </p>
    )
  }

  const reason = !zone ? d.outside : route.redirected ? d.redirected(zone.name, d.states[zone.onlineState ?? 'inactive'].toLowerCase()) : d.inZone(zone.name)
  const tone = !zone ? 'bg-sky-50 ring-sky-200' : route.redirected ? 'bg-amber-50 ring-amber-200' : 'bg-emerald-50 ring-emerald-200'
  const km = target.location ? distanceKm(point, target.location) : null

  return (
    <div className={`space-y-2 rounded-card p-3 ring-1 ${tone}`}>
      <p className="flex items-center gap-2 text-sm font-extrabold text-neutral-950">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: colorOf(target.id) }} />
        {d.routeTo(target.name)}
      </p>
      <p className="text-xs leading-relaxed text-neutral-600">{reason}</p>
      <div className="flex items-center justify-between gap-3 border-t border-black/5 pt-2 text-xs">
        <span className="text-neutral-500">{d.fee}</span>
        <span className="font-bold text-neutral-950">{route.fee === null ? d.courierFee : formatDeliveryFee(route.fee, t)}</span>
      </div>
      {km !== null && <p className="text-xs text-neutral-500">{d.distance(formatNumber(km, 1))}</p>}
    </div>
  )
}

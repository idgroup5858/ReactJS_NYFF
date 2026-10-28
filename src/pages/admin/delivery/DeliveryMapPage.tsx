import { MousePointerClick, Pencil, X } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { api } from '@/api'
import { useBranches } from '@/api/queries'
import { useQuery } from '@/api/query'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { Card } from '@/components/ui/Card'
import PageHeader from '@/components/ui/PageHeader'
import { hasZone } from '@/domain/rules'
import type { ID, LatLng } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { formatDeliveryFee } from '@/lib/format'
import { confirmDialog, showToast } from '@/lib/swal'
import DeliveryEditor from './DeliveryEditor'
import DeliveryMap from './DeliveryMap'
import { draftFee, draftOf, isDirty, type DeliveryDraft } from './draft'
import MapsProvider from './MapsProvider'
import OnlineStatePill from './OnlineStatePill'
import { BRANCHES_PATH, branchColor } from './paths'
import RouteResult from './RouteResult'

/**
 * "Tekshirish": nuqta qaysi filialga tushadi — server hozirgi holat (hudud, smena, kassa, ish vaqti) bo'yicha hisoblaydi.
 * Kalit `branches` bilan boshlanadi: filial sozlamalari saqlansa yoki online holati o'zgarsa natija o'zi yangilanadi.
 */
const useDeliveryRoute = (point: LatLng | null) =>
  useQuery(point ? `branches:route:${point.lat},${point.lng}` : null, () => api.delivery.route(point!))

/**
 * Yetkazib berish hududlari (Filiallar → Xarita): chapda filiallar ro'yxati va "Tekshirish" (xaritani bosib, buyurtma
 * qaysi filialga tushishini ko'rish), filial tanlansa — uning hududi, joyi va sozlamalari tahrirlanadi. Tanlangan
 * filial URL da (`?filial=`) — filial kartochkasidan to'g'ridan-to'g'ri ochiladi.
 */
export default function DeliveryMapPage() {
  const t = useT()
  const loaded = useBranches().data
  const branches = loaded ?? []
  const d = t.admin.delivery
  const [params, setParams] = useSearchParams()
  const selected = branches.find((b) => b.id === params.get('filial')) ?? null
  const [draft, setDraft] = useState<DeliveryDraft | null>(() => (selected ? draftOf(selected) : null))
  const [testPoint, setTestPoint] = useState<LatLng | null>(null)

  // boshqa filial tanlansa (yoki filiallar endi yuklandi) qoralama o'shanikiga almashadi
  if ((draft?.branchId ?? null) !== (selected?.id ?? null)) setDraft(selected ? draftOf(selected) : null)

  const branchIds = branches.map((b) => b.id)
  const colorOf = (branchId: ID) => branchColor(branchIds, branchId)
  const shown = branches.filter((b) => b.active || b.id === selected?.id)
  const routeQuery = useDeliveryRoute(testPoint)
  const route = routeQuery.data
  const testTarget = route?.branchId ? (branches.find((b) => b.id === route.branchId) ?? null) : null
  const editing = draft && selected ? draft : null

  const select = (branchId: ID | null) => setParams(branchId ? { filial: branchId } : {}, { replace: true })
  const patch = (next: Partial<DeliveryDraft>) => setDraft((current) => (current ? { ...current, ...next } : current))
  const setZone = (zone: LatLng[]) => setDraft((current) => (current ? { ...current, zone, past: [...current.past, current.zone].slice(-50) } : current))
  const undo = () =>
    setDraft((current) => (current && current.past.length > 0 ? { ...current, zone: current.past[current.past.length - 1], past: current.past.slice(0, -1) } : current))

  const close = async () => {
    if (editing && selected && isDirty(editing, selected) && !(await confirmDialog(d.discardTitle, d.discardText, d.discard))) return
    select(null)
  }

  const save = async () => {
    if (!editing) return
    try {
      await api.branches.saveDelivery(editing.branchId, {
        location: editing.location,
        zone: editing.zone,
        fee: draftFee(editing),
        fallbackBranchId: editing.fallbackBranchId || null,
        onlineEnabled: editing.onlineEnabled,
      })
      showToast(t.common.saved)
      select(null)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  return (
    // katta ekranda sahifa aylanmaydi: xarita header va chekka bo'shliqlardan qolgan balandlikni to'liq egallaydi
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-6.5rem)]">
      <Breadcrumbs items={[{ label: t.admin.branches.title, to: BRANCHES_PATH }, { label: d.title }]} />
      <PageHeader title={d.title} description={d.hint} />

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col gap-4 lg:overflow-y-auto">
          {editing && selected ? (
            <DeliveryEditor
              branch={selected}
              color={colorOf(selected.id)}
              draft={editing}
              others={branches.filter((b) => b.id !== selected.id && b.active)}
              onPatch={patch}
              onUndo={undo}
              onClear={() => setZone([])}
              onSave={() => void save()}
              onClose={() => void close()}
            />
          ) : (
            <>
              <Card className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-taxi text-coal">
                    <MousePointerClick size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-neutral-950">{d.testTitle}</p>
                    <p className="text-xs leading-relaxed text-neutral-500">{d.testHint}</p>
                  </div>
                  {testPoint && (
                    <button type="button" onClick={() => setTestPoint(null)} aria-label={d.clear} title={d.clear} className="btn-icon flex h-8 w-8 shrink-0 items-center justify-center rounded">
                      <X size={15} />
                    </button>
                  )}
                </div>
                {route && testPoint && <RouteResult route={route} point={testPoint} colorOf={colorOf} />}
                {testPoint && !route && routeQuery.error !== null && <p className="text-xs font-semibold text-red-700">{errorMessage(routeQuery.error)}</p>}
              </Card>

              <Card className="divide-y divide-line overflow-hidden">
                {shown.map((branch) => (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => select(branch.id)}
                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-brand-50/60"
                  >
                    <span className="h-3.5 w-3.5 shrink-0 rounded-full shadow ring-2 ring-white" style={{ background: colorOf(branch.id) }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold text-neutral-950">{branch.name}</span>
                      <span className={`block text-xs ${hasZone(branch) ? 'text-neutral-500' : 'font-semibold text-amber-700'}`}>
                        {hasZone(branch) ? `${d.zone} · ${formatDeliveryFee(branch.deliveryFee, t)}` : d.noZone}
                      </span>
                    </span>
                    <OnlineStatePill state={branch.onlineState ?? 'inactive'} />
                    <Pencil size={15} className="shrink-0 text-neutral-400" />
                  </button>
                ))}
              </Card>
            </>
          )}
        </div>

        {/* xarita filiallar kelgach chiziladi — boshlang'ich ko'rinish ularning hududlariga moslanadi */}
        <Card className="relative h-[65vh] overflow-hidden lg:h-auto">
          {loaded && (
            <MapsProvider>
              <DeliveryMap
                branches={shown}
                colorOf={colorOf}
                editing={editing}
                onZone={setZone}
                onLocation={(location) => patch({ location })}
                onSelect={select}
                testPoint={testPoint}
                testTarget={testTarget}
                onTestPoint={setTestPoint}
              />
            </MapsProvider>
          )}
        </Card>
      </div>
    </div>
  )
}

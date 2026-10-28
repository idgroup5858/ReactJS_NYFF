import { Clock, Map as MapIcon, MapPin, MapPinned, Monitor, MonitorSmartphone, Pencil, Phone, Plus, Store, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useOutlet } from 'react-router'
import { api } from '@/api'
import { useBranches, useOverview, useSalesReport, useUsers } from '@/api/queries'
import { Card } from '@/components/ui/Card'
import Field from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import { inputClass } from '@/components/ui/styles'
import Toggle from '@/components/ui/Toggle'
import { hasZone } from '@/domain/rules'
import type { Branch, ID, WorkHours } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { formatDeliveryFee, formatMoney, formatNumber } from '@/lib/format'
import { showToast } from '@/lib/swal'
import { useToday } from '@/lib/useNow'
import OnlineStatePill from './delivery/OnlineStatePill'
import { deliveryMapPath } from './delivery/paths'
import ListPlaceholder from './orders/ListPlaceholder'

const DEFAULT_HOURS: WorkHours = { open: '09:00', close: '23:00' }

/**
 * Filial qo'shish / tahrirlash; yangi filialda menyudagi hamma taom o'sha narxda darhol sotuvda. Ish vaqti — faqat
 * online (mobil) buyurtma qabul qilish vaqti; yarim tundan o'tishi mumkin (18:00–03:00), belgilanmasa — 24/7.
 */
function BranchForm({ branch, onClose }: { branch: Branch | null; onClose: () => void }) {
  const t = useT()
  const [name, setName] = useState(branch?.name ?? '')
  const [address, setAddress] = useState(branch?.address ?? '')
  const [phone, setPhone] = useState(branch?.phone ?? '')
  const [active, setActive] = useState(branch?.active ?? true)
  const [hoursOn, setHoursOn] = useState(!!branch?.workHours)
  const [hours, setHours] = useState<WorkHours>(branch?.workHours ?? DEFAULT_HOURS)

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (hoursOn && hours.open === hours.close) {
      showToast(t.admin.branches.hoursSame, 'error')
      return
    }
    try {
      await api.branches.save({ id: branch?.id, name, address, phone, active, workHours: hoursOn ? hours : null })
      showToast(t.common.saved)
      onClose()
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  return (
    <Modal
      title={branch ? t.admin.branches.edit : t.admin.branches.add}
      onClose={onClose}
      footer={
        <button type="submit" form="branch-form" className="btn-primary h-11 w-full rounded text-sm font-bold">
          {t.common.save}
        </button>
      }
    >
      <form id="branch-form" onSubmit={(event) => void save(event)} className="space-y-3">
        <Field label={t.admin.branches.name} htmlFor="br-name">
          <input id="br-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
        </Field>
        <Field label={t.admin.branches.address} htmlFor="br-address">
          <input id="br-address" value={address} onChange={(event) => setAddress(event.target.value)} className={inputClass} />
        </Field>
        <Field label={t.admin.branches.phone} htmlFor="br-phone">
          <input id="br-phone" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder="+998 __ ___ __ __" className={inputClass} />
        </Field>
        <div className="space-y-2">
          <Toggle checked={hoursOn} onChange={setHoursOn} label={t.admin.branches.workHours} />
          {hoursOn && (
            <div className="grid grid-cols-2 gap-3">
              <Field label={t.admin.branches.opensAt} htmlFor="br-open">
                <input id="br-open" type="time" value={hours.open} onChange={(event) => event.target.value && setHours({ ...hours, open: event.target.value })} className={inputClass} />
              </Field>
              <Field label={t.admin.branches.closesAt} htmlFor="br-close">
                <input id="br-close" type="time" value={hours.close} onChange={(event) => event.target.value && setHours({ ...hours, close: event.target.value })} className={inputClass} />
              </Field>
            </div>
          )}
          <p className="text-xs text-neutral-500">{t.admin.branches.workHoursHint}</p>
        </div>
        <Toggle checked={active} onChange={setActive} label={t.common.active} />
      </form>
    </Modal>
  )
}

/**
 * Filiallar: har biri kartochkada — manzil, telefon, ish vaqti, xodimlar, bugungi tushum, hozirgi buyurtmalar, online
 * buyurtma holati (tezda to'xtatish), yetkazib berish hududi, shu filialning TV va kiosk havolalari. Xarita sahifasi
 * shu yerdan ichma-ich ochiladi.
 */
export default function BranchesPage() {
  const t = useT()
  const outlet = useOutlet()
  const today = useToday()
  const branchesQuery = useBranches()
  const branches = branchesQuery.data ?? []
  const users = useUsers().data ?? []
  const overview = useOverview().data
  const todayReport = useSalesReport({ from: today, to: today, branchId: null }).data
  const [editing, setEditing] = useState<Branch | 'new' | null>(null)

  const setOnline = async (branchId: ID, enabled: boolean) => {
    try {
      await api.branches.setOnline(branchId, enabled)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  if (outlet) return outlet

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.admin.branches.title}
        description={t.admin.branches.hint}
        actions={
          <>
            <Link to={deliveryMapPath()} className="btn-ghost flex h-10 items-center gap-2 rounded px-4 text-xs font-bold">
              <MapIcon size={16} />
              {t.admin.delivery.openMap}
            </Link>
            <button type="button" onClick={() => setEditing('new')} className="btn-primary flex h-10 items-center gap-2 rounded px-4 text-xs font-bold">
              <Plus size={16} />
              {t.admin.branches.add}
            </button>
          </>
        }
      />
      {branches.length === 0 && <ListPlaceholder icon={Store} empty={t.login.noBranches} query={branchesQuery} />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {branches.map((branch) => {
          const revenue = todayReport?.byBranch.find((stat) => stat.branchId === branch.id)?.revenue ?? 0
          const live = overview?.liveOrders.find((item) => item.branchId === branch.id)?.count ?? 0
          const staff = users.filter((u) => u.branchId === branch.id && u.active).length
          const fallback = branches.find((b) => b.id === branch.fallbackBranchId)
          return (
            <Card key={branch.id} className={`space-y-4 p-5 ${branch.active ? '' : 'opacity-60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-extrabold text-neutral-950">{branch.name}</p>
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-neutral-500">
                    <MapPin size={14} className="mt-0.5 shrink-0 text-select" />
                    {branch.address || '—'}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-500">
                    <Phone size={14} className="shrink-0 text-select" />
                    {branch.phone || '—'}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-500" title={t.admin.branches.workHoursHint}>
                    <Clock size={14} className="shrink-0 text-select" />
                    {branch.workHours ? `${branch.workHours.open}–${branch.workHours.close}` : t.admin.branches.allDay}
                  </p>
                </div>
                <button type="button" onClick={() => setEditing(branch)} aria-label={t.common.edit} className="btn-icon flex h-9 w-9 shrink-0 items-center justify-center rounded">
                  <Pencil size={15} />
                </button>
              </div>
              {/* tushum ustuni matnga qarab kengayadi — summa qisilmaydi */}
              <div className="grid grid-cols-[auto_1fr_1fr] gap-2 text-center">
                <div className="rounded-card bg-coal px-3 py-2 text-white">
                  <p className="text-[10px] font-semibold tracking-wider text-white/60 uppercase">{t.admin.branches.today}</p>
                  <p className="text-sm font-extrabold text-taxi tabular-nums">{formatMoney(revenue, t)}</p>
                </div>
                <div className="cursor-help rounded-card bg-neutral-100 px-2 py-2" title={t.admin.branches.activeOrdersHint}>
                  <p className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">{t.admin.branches.activeOrders}</p>
                  <p className="text-sm font-extrabold tabular-nums">{formatNumber(live)}</p>
                </div>
                <div className="rounded-card bg-neutral-100 px-2 py-2">
                  <p className="flex items-center justify-center gap-1 text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
                    <Users size={11} />
                    {t.admin.nav.staff}
                  </p>
                  <p className="text-sm font-extrabold tabular-nums">{staff}</p>
                </div>
              </div>
              {/* yetkazib berish: online qabul qilish (tezda to'xtatish), hudud narxi, zaxira filial, xarita */}
              <div className="space-y-2.5 rounded-card border border-line p-3">
                <div className="flex items-center justify-between gap-2">
                  {branch.active ? (
                    <Toggle checked={branch.onlineEnabled} onChange={(enabled) => void setOnline(branch.id, enabled)} label={t.admin.delivery.online} />
                  ) : (
                    <span className="text-sm font-semibold text-neutral-700">{t.admin.delivery.online}</span>
                  )}
                  <OnlineStatePill state={branch.onlineState ?? 'inactive'} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 text-xs leading-relaxed">
                    <span className={`block font-semibold ${hasZone(branch) ? 'text-neutral-700' : 'text-amber-700'}`}>
                      {hasZone(branch) ? `${t.admin.delivery.zone} · ${formatDeliveryFee(branch.deliveryFee, t)}` : t.admin.delivery.noZone}
                    </span>
                    {fallback && (
                      <span className="block truncate text-neutral-500">
                        {t.admin.delivery.fallback}: {fallback.name}
                      </span>
                    )}
                  </p>
                  <Link to={deliveryMapPath(branch.id)} className="btn-ghost flex h-8 shrink-0 items-center gap-1.5 rounded px-3 text-xs font-semibold">
                    <MapPinned size={14} />
                    {t.admin.delivery.onMap}
                  </Link>
                </div>
              </div>
              {branch.active && (
                <div className="flex gap-2">
                  <Link to={`/tv/${branch.id}`} target="_blank" className="btn-ghost flex h-9 flex-1 items-center justify-center gap-2 rounded text-xs font-semibold">
                    <Monitor size={14} />
                    {t.modes.tv.title}
                  </Link>
                  <Link to={`/kiosk/${branch.id}`} target="_blank" className="btn-ghost flex h-9 flex-1 items-center justify-center gap-2 rounded text-xs font-semibold">
                    <MonitorSmartphone size={14} />
                    {t.modes.kiosk.title}
                  </Link>
                </div>
              )}
            </Card>
          )
        })}
      </div>
      {editing && <BranchForm branch={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

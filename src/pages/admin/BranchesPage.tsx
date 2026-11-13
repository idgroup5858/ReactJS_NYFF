import {
  Clock,
  Map as MapIcon,
  MapPin,
  MapPinned,
  Monitor,
  MonitorSmartphone,
  Pencil,
  Phone,
  Plus,
  ScanFace,
  Store,
  TabletSmartphone,
  Trash2,
  Tv,
  Users,
  WifiOff,
} from 'lucide-react'
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
import type { Dict } from '@/i18n/uz'
import { errorMessage, useT } from '@/i18n'
import { formatDateTime, formatDeliveryFee, formatMoney, formatNumber } from '@/lib/format'
import { confirmDialog, showToast } from '@/lib/swal'
import { minutesSince, useNow, useToday } from '@/lib/useNow'
import { rememberScreenCode, type ScreenKind } from '@/store/screenCodes'
import BranchKeyModal, { type BranchKeyKind } from './BranchKeyModal'
import OnlineStatePill from './delivery/OnlineStatePill'
import { deliveryMapPath } from './delivery/paths'
import ListPlaceholder from './orders/ListPlaceholder'
import ScreenCodeModal from './ScreenCodeModal'

const DEFAULT_HOURS: WorkHours = { open: '09:00', close: '23:00' }

/** HR shu vaqt ichida murojaat qilgan bo'lsa — ishlayapti (HR har 5 daqiqada o'zini bildiradi). */
const HR_FRESH_MINUTES = 15

/** "HR: 3 daqiqa oldin" — filial HR tizimi oxirgi marta qachon murojaat qilgan; `fresh` — yaqinda (ishlayapti). */
function hrSeenText(hrSeenAt: string | null, now: Date, t: Dict): { text: string; fresh: boolean } {
  if (!hrSeenAt) return { text: t.admin.branches.hrNever, fresh: false }
  const minutes = Math.max(0, Math.floor(minutesSince(hrSeenAt, now)))
  const ago =
    minutes < 1
      ? t.admin.branches.agoNow
      : minutes < 60
        ? t.admin.branches.agoMinutes(minutes)
        : minutes < 48 * 60
          ? t.admin.branches.agoHours(Math.floor(minutes / 60))
          : t.admin.branches.agoDays(Math.floor(minutes / 1440))
  return { text: t.admin.branches.hrSeen(ago), fresh: minutes < HR_FRESH_MINUTES }
}

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
      size="lg"
      footer={
        <button type="submit" form="branch-form" className="btn-primary h-9 w-full rounded text-sm font-bold">
          {t.common.save}
        </button>
      }
    >
      {/* eniga keng, past (POS monitori): nomi · manzil · telefon; ish vaqti · ochiladi · yopiladi · faol */}
      <form id="branch-form" onSubmit={(event) => void save(event)} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_1.5fr_1fr]">
          <Field label={t.admin.branches.name} htmlFor="br-name">
            <input id="br-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
          </Field>
          <Field label={t.admin.branches.address} htmlFor="br-address">
            <input id="br-address" value={address} onChange={(event) => setAddress(event.target.value)} className={inputClass} />
          </Field>
          <Field label={t.admin.branches.phone} htmlFor="br-phone">
            <input id="br-phone" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder="+998 __ ___ __ __" className={inputClass} />
          </Field>
        </div>
        {/* "Ish vaqti [09:00] – [23:00]" yoki o'chiq bo'lsa "Ish vaqti · 24/7" — qiymat switch yonida, bo'sh joyda osilib qolmasin */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          <div className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-2">
            <Toggle checked={hoursOn} onChange={setHoursOn} label={t.admin.branches.workHours} />
            {hoursOn ? (
              <span className="flex items-center gap-2">
                <span className="w-28">
                  <input
                    id="br-open"
                    type="time"
                    aria-label={t.admin.branches.opensAt}
                    title={t.admin.branches.opensAt}
                    value={hours.open}
                    onChange={(event) => event.target.value && setHours({ ...hours, open: event.target.value })}
                    className={inputClass}
                  />
                </span>
                <span className="text-neutral-400">–</span>
                <span className="w-28">
                  <input
                    id="br-close"
                    type="time"
                    aria-label={t.admin.branches.closesAt}
                    title={t.admin.branches.closesAt}
                    value={hours.close}
                    onChange={(event) => event.target.value && setHours({ ...hours, close: event.target.value })}
                    className={inputClass}
                  />
                </span>
              </span>
            ) : (
              <span className="rounded-chip bg-neutral-100 px-2 py-0.5 text-xs font-bold text-neutral-600">{t.admin.branches.allDay}</span>
            )}
          </div>
          <Toggle checked={active} onChange={setActive} label={t.common.active} />
        </div>
        <p className="text-xs text-neutral-500">{t.admin.branches.workHoursHint}</p>
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
  const [keyFor, setKeyFor] = useState<{ kind: BranchKeyKind; branch: Branch } | null>(null)
  const [codeFor, setCodeFor] = useState<{ kind: ScreenKind; branch: Branch } | null>(null)
  const now = useNow(30_000)

  const setOnline = async (branchId: ID, enabled: boolean) => {
    try {
      await api.branches.setOnline(branchId, enabled)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  /** FaceID tekshiruvi — terminal yoki HR buzilsa admin darhol o'chiradi (kassirlar PIN bilan kiradi). */
  const setFaceId = async (branchId: ID, enabled: boolean) => {
    try {
      await api.branches.setFaceId(branchId, enabled)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  /** Oshpaz yordamchisi yo'q filial — kassir ham "Tayyor" / "Qaytarish" bosadi. */
  const setCashierReady = async (branchId: ID, enabled: boolean) => {
    try {
      await api.branches.setCashierMarksReady(branchId, enabled)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  /**
   * Admin navbat ekranini / kioskni ochadi — kod so'ralmaydi: filialning joriy kodi (yangilangan bo'lsa ham) oldindan
   * shu brauzerga yoziladi, ekran uni o'qiydi. Kod olinmasa (server javob bermadi) — ekran o'zi so'raydi.
   */
  const openScreen = async (kind: ScreenKind, branch: Branch) => {
    // tab bosish paytida ochiladi — so'rovdan keyin ochilsa brauzer "popup" deb to'sishi mumkin
    const tab = window.open('about:blank', '_blank')
    try {
      const { code } = await api.branches.screenCode(kind, branch.id)
      rememberScreenCode(kind, branch.id, code)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
    const url = `${import.meta.env.BASE_URL}${kind}/${branch.id}`
    if (!tab) {
      window.open(url, '_blank', 'noopener')
      return
    }
    tab.opener = null
    tab.location.href = url
  }

  /** faqat hech ishlatilmagan filial (aks holda server `in_use` — faolsizlantirish kerak) */
  const remove = async (branch: Branch) => {
    if (!(await confirmDialog(t.admin.branches.deleteTitle, `${branch.name}. ${t.admin.branches.deleteText}`, t.common.delete))) return
    try {
      await api.branches.remove(branch.id)
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
          // bir nechta filialda ishlaydigan xodim — har birida sanaladi
          const staff = users.filter((u) => u.branchIds.includes(branch.id) && u.active).length
          const fallback = branches.find((b) => b.id === branch.fallbackBranchId)
          const hr = hrSeenText(branch.hrSeenAt, now, t)
          return (
            <Card key={branch.id} className={`space-y-4 p-5 ${branch.active ? '' : 'opacity-60'}`}>
              {/* nom va tugmalar: sig'sa bir qatorda, tor kartochkada tugmalar nom ostida — manzil doim to'liq kenglikda */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <p className="min-w-0 text-lg font-extrabold text-neutral-950">{branch.name}</p>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => setEditing(branch)} aria-label={t.common.edit} className="btn-icon flex h-8 w-8 shrink-0 items-center justify-center rounded">
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setKeyFor({ kind: 'offline', branch })}
                      aria-label={t.admin.branches.offlineKey}
                      title={t.admin.branches.offlineKey}
                      className="btn-icon flex h-8 w-8 shrink-0 items-center justify-center rounded"
                    >
                      <WifiOff size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setKeyFor({ kind: 'hr', branch })}
                      aria-label={t.admin.branches.hrKey}
                      title={t.admin.branches.hrKey}
                      className="btn-icon flex h-8 w-8 shrink-0 items-center justify-center rounded"
                    >
                      <ScanFace size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCodeFor({ kind: 'tv', branch })}
                      aria-label={t.admin.branches.tvCode}
                      title={t.admin.branches.tvCode}
                      className="btn-icon flex h-8 w-8 shrink-0 items-center justify-center rounded"
                    >
                      <Tv size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCodeFor({ kind: 'kiosk', branch })}
                      aria-label={t.admin.branches.kioskCode}
                      title={t.admin.branches.kioskCode}
                      className="btn-icon flex h-8 w-8 shrink-0 items-center justify-center rounded"
                    >
                      <TabletSmartphone size={15} />
                    </button>
                    <button type="button" onClick={() => void remove(branch)} aria-label={t.common.delete} className="btn-icon-danger flex h-8 w-8 shrink-0 items-center justify-center rounded">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
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
              {/* FaceID: kassir smenani terminalda «Kirish» bosib ochadi, «Chiqish» bosib topshiradi — buzilsa bir bosishda o'chadi */}
              <div className="space-y-1.5 rounded-card border border-line p-3">
                <div className="flex items-center justify-between gap-2">
                  <Toggle checked={branch.faceIdRequired} onChange={(enabled) => void setFaceId(branch.id, enabled)} label={t.admin.branches.faceId} />
                  <span
                    title={branch.hrSeenAt ? formatDateTime(branch.hrSeenAt) : t.admin.branches.hrNeverHint}
                    className={`shrink-0 cursor-help text-xs font-semibold ${hr.fresh ? 'text-emerald-700' : 'text-amber-700'}`}
                  >
                    {hr.text}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-neutral-500">{t.admin.branches.faceIdHint}</p>
              </div>
              {/* oshpaz yordamchisi yo'q filial: "Tayyor" / "Qaytarish" — kassada ham */}
              <div className="space-y-1.5 rounded-card border border-line p-3">
                <Toggle
                  checked={branch.cashierMarksReady}
                  onChange={(enabled) => void setCashierReady(branch.id, enabled)}
                  label={t.admin.branches.cashierReady}
                />
                <p className="text-xs leading-relaxed text-neutral-500">{t.admin.branches.cashierReadyHint}</p>
              </div>
              {branch.active && (
                <div className="flex gap-2">
                  <Link
                    to={`/tv/${branch.id}`}
                    target="_blank"
                    onClick={(event) => {
                      // oddiy bosish — kod bilan; o'rta tugma / "yangi tabda ochish" — oddiy havola (ekran kod so'raydi)
                      event.preventDefault()
                      void openScreen('tv', branch)
                    }}
                    className="btn-ghost flex h-9 flex-1 items-center justify-center gap-2 rounded text-xs font-semibold"
                  >
                    <Monitor size={14} />
                    {t.modes.tv.title}
                  </Link>
                  <Link
                    to={`/kiosk/${branch.id}`}
                    target="_blank"
                    onClick={(event) => {
                      event.preventDefault()
                      void openScreen('kiosk', branch)
                    }}
                    className="btn-ghost flex h-9 flex-1 items-center justify-center gap-2 rounded text-xs font-semibold"
                  >
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
      {keyFor && <BranchKeyModal kind={keyFor.kind} branch={keyFor.branch} onClose={() => setKeyFor(null)} />}
      {codeFor && <ScreenCodeModal kind={codeFor.kind} branch={codeFor.branch} onClose={() => setCodeFor(null)} />}
    </div>
  )
}

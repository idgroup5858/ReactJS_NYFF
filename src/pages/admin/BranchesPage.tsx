import { MapPin, Monitor, MonitorSmartphone, Pencil, Phone, Plus, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { api, useDb } from '@/api'
import { Card } from '@/components/ui/Card'
import Field from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import { inputClass, selectClass } from '@/components/ui/styles'
import Toggle from '@/components/ui/Toggle'
import { activeOrders } from '@/domain/logic/orders'
import { salesReport } from '@/domain/logic/reports'
import type { Branch } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { formatMoney, formatNumber } from '@/lib/format'
import { showToast } from '@/lib/swal'
import { useToday } from '@/lib/useNow'

/** Filial qo'shish / tahrirlash; yangi filialda narxlar qaysi filialdan nusxalanishi tanlanadi. */
function BranchForm({ branch, onClose }: { branch: Branch | null; onClose: () => void }) {
  const t = useT()
  const db = useDb()
  const [name, setName] = useState(branch?.name ?? '')
  const [address, setAddress] = useState(branch?.address ?? '')
  const [phone, setPhone] = useState(branch?.phone ?? '')
  const [active, setActive] = useState(branch?.active ?? true)
  const [copyFrom, setCopyFrom] = useState(db.branches[0]?.id ?? '')

  const save = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await api.branches.save({ id: branch?.id, name, address, phone, active, copyPricesFrom: copyFrom || null })
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
        {!branch && (
          <Field label={t.admin.branches.copyPrices} htmlFor="br-copy" hint={t.admin.branches.copyPricesHint}>
            <select id="br-copy" value={copyFrom} onChange={(event) => setCopyFrom(event.target.value)} className={selectClass}>
              {db.branches.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
              <option value="">{t.admin.branches.noPrices}</option>
            </select>
          </Field>
        )}
        <Toggle checked={active} onChange={setActive} label={t.common.active} />
      </form>
    </Modal>
  )
}

/** Filiallar: har biri kartochkada — manzil, telefon, xodimlar, bugungi tushum, hozirgi buyurtmalar, TV va kiosk havolasi. */
export default function BranchesPage() {
  const t = useT()
  const db = useDb()
  const [editing, setEditing] = useState<Branch | 'new' | null>(null)
  const today = useToday()

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.admin.branches.title}
        description={t.admin.branches.hint}
        actions={
          <button type="button" onClick={() => setEditing('new')} className="btn-primary flex h-10 items-center gap-2 rounded px-4 text-xs font-bold">
            <Plus size={16} />
            {t.admin.branches.add}
          </button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {db.branches.map((branch) => {
          const report = salesReport(db, { from: today, to: today, branchId: branch.id })
          const staff = db.users.filter((u) => u.branchId === branch.id && u.active).length
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
                </div>
                <button type="button" onClick={() => setEditing(branch)} aria-label={t.common.edit} className="btn-icon flex h-9 w-9 shrink-0 items-center justify-center rounded">
                  <Pencil size={15} />
                </button>
              </div>
              {/* tushum ustuni matnga qarab kengayadi — summa qisilmaydi */}
              <div className="grid grid-cols-[auto_1fr_1fr] gap-2 text-center">
                <div className="rounded-card bg-coal px-3 py-2 text-white">
                  <p className="text-[10px] font-semibold tracking-wider text-white/60 uppercase">{t.admin.branches.today}</p>
                  <p className="text-sm font-extrabold text-taxi tabular-nums">{formatMoney(report.revenue, t)}</p>
                </div>
                <div className="rounded-card bg-neutral-100 px-2 py-2">
                  <p className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">{t.admin.branches.activeOrders}</p>
                  <p className="text-sm font-extrabold tabular-nums">{formatNumber(activeOrders(db, branch.id).length)}</p>
                </div>
                <div className="rounded-card bg-neutral-100 px-2 py-2">
                  <p className="flex items-center justify-center gap-1 text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
                    <Users size={11} />
                    {t.admin.nav.staff}
                  </p>
                  <p className="text-sm font-extrabold tabular-nums">{staff}</p>
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

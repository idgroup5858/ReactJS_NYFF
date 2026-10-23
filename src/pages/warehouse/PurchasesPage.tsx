import { ChevronDown, ClipboardList, Send } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { api, useDb } from '@/api'
import { useCurrentUser } from '@/api/session'
import { Card, CardHeader } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { selectClass, textareaClass } from '@/components/ui/styles'
import { purchaseTotal } from '@/domain/logic/purchases'
import type { Purchase, PurchaseStatus } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { formatDateTime, formatMoney } from '@/lib/format'
import { showToast } from '@/lib/swal'
import { activeWarehouses, warehouseLabel } from '@/lib/warehouses'
import { newDraftLine, readyLines, type DraftLine } from './draftLines'
import LinesEditor from './LinesEditor'
import PurchaseDetails, { PurchaseStatusBadge } from './PurchaseDetails'

type Filter = PurchaseStatus | 'all'

/** Ro'yxatdagi kirim: sarlavha (raqam, ombor, holat, summa) bosilsa tarkibi ochiladi. */
export function PurchaseRow({ purchase, defaultOpen = false, children }: { purchase: Purchase; defaultOpen?: boolean; children?: ReactNode }) {
  const t = useT()
  const db = useDb()
  const [open, setOpen] = useState(defaultOpen)
  const author = db.users.find((u) => u.id === purchase.createdBy)
  const decider = db.users.find((u) => u.id === purchase.decidedBy)
  return (
    <li>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left hover:bg-neutral-50">
        <span className="font-extrabold text-neutral-950">{t.purchase.number(purchase.number)}</span>
        <PurchaseStatusBadge status={purchase.status} />
        <span className="text-sm text-neutral-500">{warehouseLabel(db, purchase.warehouseId, t)}</span>
        <span className="flex-1" />
        <span className="text-sm font-bold tabular-nums">{purchase.status === 'rejected' ? '—' : formatMoney(Math.round(purchaseTotal(purchase)), t)}</span>
        <ChevronDown size={16} className={`text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        <span className="w-full text-xs text-neutral-500">
          {formatDateTime(purchase.createdAt)} · {author?.name ?? '—'}
          {purchase.decidedAt && ` · ${t.purchase.decidedBy}: ${decider?.name ?? '—'} (${formatDateTime(purchase.decidedAt)})`}
        </span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-neutral-100 bg-neutral-50/50 px-4 py-3">
          {purchase.note && <p className="text-sm text-neutral-600">{purchase.note}</p>}
          {children ?? <PurchaseDetails purchase={purchase} />}
        </div>
      )}
    </li>
  )
}

/**
 * Kirim (ta'minotchi): kelgan mahsulotlar va miqdori kiritiladi → "tasdiqlashga" ketadi. Admin narxlarni tekshirib
 * tasdiqlagach mahsulotlar omborga qo'shiladi. O'ngda — kirimlar ro'yxati holati bilan.
 */
export default function PurchasesPage() {
  const t = useT()
  const db = useDb()
  const user = useCurrentUser()
  const [params] = useSearchParams()
  const warehouses = activeWarehouses(db)
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '')
  const [lines, setLines] = useState<DraftLine[]>(() => [newDraftLine(params.get('item') ?? '', params.get('qty') ?? '')])
  const [note, setNote] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [busy, setBusy] = useState(false)

  const ready = readyLines(lines)
  const purchases = db.purchases
    .filter((p) => filter === 'all' || p.status === filter)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!user || ready.length === 0 || busy) return
    setBusy(true)
    try {
      await api.purchases.create({ warehouseId, items: ready, note, createdBy: user.id })
      setLines([newDraftLine()])
      setNote('')
      showToast(t.purchase.created)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader title={t.purchase.newTitle} hint={t.purchase.hint} />
        <form onSubmit={(event) => void submit(event)} className="space-y-4 p-4">
          <Field label={t.purchase.warehouse} htmlFor="purchase-warehouse">
            <select id="purchase-warehouse" value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} className={selectClass}>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {warehouseLabel(db, w.id, t)}
                </option>
              ))}
            </select>
          </Field>
          <LinesEditor lines={lines} onChange={setLines} />
          <Field label={t.purchase.note} htmlFor="purchase-note">
            <textarea id="purchase-note" value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={200} placeholder={t.purchase.notePlaceholder} className={textareaClass} />
          </Field>
          <button type="submit" disabled={ready.length === 0 || busy} className="btn-primary flex h-12 w-full items-center justify-center gap-2 rounded text-sm font-bold">
            <Send size={16} />
            {t.purchase.submit}
          </button>
        </form>
      </Card>

      <Card>
        <CardHeader
          title={t.purchase.list}
          actions={
            <SegmentedControl<Filter>
              label={t.purchase.list}
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: t.common.all },
                { value: 'pending', label: t.purchase.statuses.pending },
                { value: 'approved', label: t.purchase.statuses.approved },
                { value: 'rejected', label: t.purchase.statuses.rejected },
              ]}
            />
          }
        />
        {purchases.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={ClipboardList} title={t.purchase.empty} />
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {purchases.map((purchase) => (
              <PurchaseRow key={purchase.id} purchase={purchase} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

import { ArrowLeftRight, ArrowRight, Repeat } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { api, useDb } from '@/api'
import { useCurrentUser } from '@/api/session'
import { Card, CardHeader } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import { selectClass, textareaClass } from '@/components/ui/styles'
import { errorMessage, useLocalize, useT } from '@/i18n'
import { formatDateTime, formatNumber } from '@/lib/format'
import { showToast } from '@/lib/swal'
import { activeWarehouses, warehouseLabel } from '@/lib/warehouses'
import { newDraftLine, readyLines, type DraftLine } from './draftLines'
import LinesEditor from './LinesEditor'

/**
 * Ko'chirish: markaziy ombordan filialga (chiqim) yoki omborlar orasida. Bir vaqtda biridan ayriladi, ikkinchisiga
 * qo'shiladi; mavjud qoldiqdan ko'p ko'chirib bo'lmaydi.
 */
export default function TransfersPage() {
  const t = useT()
  const db = useDb()
  const localize = useLocalize()
  const user = useCurrentUser()
  const [params] = useSearchParams()
  const warehouses = activeWarehouses(db)
  const valid = (id: string | null) => warehouses.find((w) => w.id === id)?.id
  const [from, setFrom] = useState(valid(params.get('from')) ?? warehouses[0]?.id ?? '')
  const [to, setTo] = useState(valid(params.get('to')) ?? warehouses.find((w) => w.id !== from)?.id ?? '')
  const [lines, setLines] = useState<DraftLine[]>(() => [newDraftLine(params.get('item') ?? '', params.get('qty') ?? '')])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const ready = readyLines(lines)
  const transfers = [...db.transfers].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!user || ready.length === 0 || busy) return
    setBusy(true)
    try {
      await api.transfers.create({ fromWarehouseId: from, toWarehouseId: to, items: ready, note, createdBy: user.id })
      setLines([newDraftLine()])
      setNote('')
      showToast(t.transfer.created)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  const warehouseSelect = (id: string, value: string, onChange: (value: string) => void) => (
    <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={selectClass}>
      {warehouses.map((w) => (
        <option key={w.id} value={w.id}>
          {warehouseLabel(db, w.id, t)}
        </option>
      ))}
    </select>
  )

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader title={t.transfer.newTitle} hint={t.transfer.hint} />
        <form onSubmit={(event) => void submit(event)} className="space-y-4 p-4">
          <div className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <Field label={t.transfer.from} htmlFor="transfer-from">
              {warehouseSelect('transfer-from', from, setFrom)}
            </Field>
            <button
              type="button"
              onClick={() => {
                setFrom(to)
                setTo(from)
              }}
              aria-label={t.transfer.swap}
              title={t.transfer.swap}
              className="btn-icon flex h-10 w-10 items-center justify-center justify-self-center rounded"
            >
              <Repeat size={16} />
            </button>
            <Field label={t.transfer.to} htmlFor="transfer-to">
              {warehouseSelect('transfer-to', to, setTo)}
            </Field>
          </div>
          {from === to && <p className="text-sm font-semibold text-red-700">{t.errors.same_warehouse}</p>}
          <LinesEditor lines={lines} onChange={setLines} availableIn={from} />
          <Field label={t.purchase.note} htmlFor="transfer-note">
            <textarea id="transfer-note" value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={200} className={textareaClass} />
          </Field>
          <button type="submit" disabled={ready.length === 0 || from === to || busy} className="btn-primary flex h-12 w-full items-center justify-center gap-2 rounded text-sm font-bold">
            <ArrowLeftRight size={16} />
            {t.transfer.submit}
          </button>
        </form>
      </Card>

      <Card>
        <CardHeader title={t.transfer.list} />
        {transfers.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={ArrowLeftRight} title={t.transfer.empty} />
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {transfers.map((transfer) => {
              const author = db.users.find((u) => u.id === transfer.createdBy)
              return (
                <li key={transfer.id} className="space-y-1.5 px-4 py-3">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-extrabold text-neutral-950">{t.transfer.number(transfer.number)}</span>
                    <span className="flex items-center gap-1.5 font-semibold text-neutral-700">
                      {warehouseLabel(db, transfer.fromWarehouseId, t)}
                      <ArrowRight size={14} className="text-select" />
                      {warehouseLabel(db, transfer.toWarehouseId, t)}
                    </span>
                  </p>
                  <p className="text-sm text-neutral-600">
                    {transfer.items
                      .map((item) => {
                        const ingredient = db.ingredients.find((i) => i.id === item.ingredientId)
                        return ingredient ? `${localize(ingredient.name)} — ${formatNumber(item.qty, 3)} ${t.units[ingredient.unit]}` : item.ingredientId
                      })
                      .join(' · ')}
                  </p>
                  {transfer.note && <p className="text-xs text-neutral-500 italic">{transfer.note}</p>}
                  <p className="text-xs text-neutral-400">
                    {formatDateTime(transfer.createdAt)} · {author?.name ?? '—'}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}

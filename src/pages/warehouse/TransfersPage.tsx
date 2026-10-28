import { ArrowLeftRight, ArrowRight, Repeat } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { api } from '@/api'
import { useBranches, useIngredients, useTransfers, useUsers, useWarehouses } from '@/api/queries'
import { Card, CardHeader } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import Pagination from '@/components/ui/Pagination'
import { selectClass, textareaClass } from '@/components/ui/styles'
import { errorMessage, useLocalize, useT } from '@/i18n'
import { formatDateTime, formatNumber } from '@/lib/format'
import { showToast } from '@/lib/swal'
import { activeWarehouses, warehouseLabel } from '@/lib/warehouses'
import { newDraftLine, readyLines, type DraftLine } from './draftLines'
import LinesEditor from './LinesEditor'
import { usePageState, useServerPage } from './serverPagination'

/**
 * Ko'chirish: markaziy ombordan filialga (chiqim) yoki omborlar orasida. Bir vaqtda biridan ayriladi, ikkinchisiga
 * qo'shiladi; mavjud qoldiqdan ko'p ko'chirib bo'lmaydi.
 */
export default function TransfersPage() {
  const t = useT()
  const localize = useLocalize()
  const [params] = useSearchParams()
  const allWarehouses = useWarehouses().data ?? []
  const branches = useBranches().data ?? []
  const ingredients = useIngredients().data ?? []
  const users = useUsers().data ?? []
  const warehouses = activeWarehouses(allWarehouses, branches)
  const valid = (id: string | null) => warehouses.find((w) => w.id === id)?.id
  // omborlar serverdan keladi: tanlov (yoki `?from=&to=`) yaroqli bo'lmaguncha — markaziy → birinchi boshqa ombor
  const [fromChoice, setFrom] = useState(params.get('from') ?? '')
  const [toChoice, setTo] = useState(params.get('to') ?? '')
  const from = valid(fromChoice) ?? warehouses[0]?.id ?? ''
  const to = valid(toChoice) ?? warehouses.find((w) => w.id !== from)?.id ?? ''
  const [lines, setLines] = useState<DraftLine[]>(() => [newDraftLine(params.get('item') ?? '', params.get('qty') ?? '')])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const ready = readyLines(lines)
  // yangisi birinchi, 10 tadan — server sahifalaydi
  const paging = usePageState()
  const transfers = useTransfers({ page: paging.page, limit: paging.limit })
  const { list, pagination } = useServerPage(transfers.data, paging)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!from || !to || ready.length === 0 || busy) return
    setBusy(true)
    try {
      await api.transfers.create({ fromWarehouseId: from, toWarehouseId: to, items: ready, note })
      setLines([newDraftLine()])
      setNote('')
      paging.reset()
      showToast(t.transfer.created)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  // har tanlovda ikkalasi ham qotiriladi — "qayerdan" o'zgarganda "qayerga" o'zi siljimasin
  const choose = (nextFrom: string, nextTo: string) => {
    setFrom(nextFrom)
    setTo(nextTo)
  }

  const warehouseSelect = (id: string, value: string, onChange: (value: string) => void) => (
    <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={selectClass}>
      {warehouses.map((w) => (
        <option key={w.id} value={w.id}>
          {warehouseLabel(allWarehouses, branches, w.id, t)}
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
              {warehouseSelect('transfer-from', from, (value) => choose(value, to))}
            </Field>
            <button
              type="button"
              onClick={() => choose(to, from)}
              aria-label={t.transfer.swap}
              title={t.transfer.swap}
              className="btn-icon flex h-10 w-10 items-center justify-center justify-self-center rounded"
            >
              <Repeat size={16} />
            </button>
            <Field label={t.transfer.to} htmlFor="transfer-to">
              {warehouseSelect('transfer-to', to, (value) => choose(from, value))}
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
        {!list ? (
          transfers.error ? (
            <div className="p-4">
              <EmptyState icon={ArrowLeftRight} title={errorMessage(transfers.error)} />
            </div>
          ) : null
        ) : list.total === 0 ? (
          <div className="p-4">
            <EmptyState icon={ArrowLeftRight} title={t.transfer.empty} />
          </div>
        ) : (
          <>
            <ul className="divide-y divide-neutral-100">
              {list.items.map((transfer) => {
                const author = users.find((u) => u.id === transfer.createdBy)
                return (
                  <li key={transfer.id} className="space-y-1.5 px-4 py-3">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-extrabold text-neutral-950">{t.transfer.number(transfer.number)}</span>
                      <span className="flex items-center gap-1.5 font-semibold text-neutral-700">
                        {warehouseLabel(allWarehouses, branches, transfer.fromWarehouseId, t)}
                        <ArrowRight size={14} className="text-select" />
                        {warehouseLabel(allWarehouses, branches, transfer.toWarehouseId, t)}
                      </span>
                    </p>
                    <p className="text-sm text-neutral-600">
                      {transfer.items
                        .map((item) => {
                          const ingredient = ingredients.find((i) => i.id === item.ingredientId)
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
            <Pagination {...pagination} />
          </>
        )}
      </Card>
    </div>
  )
}

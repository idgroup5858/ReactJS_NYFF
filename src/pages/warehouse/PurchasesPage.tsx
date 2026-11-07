import { ChevronDown, ClipboardList, PackagePlus } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { api } from '@/api'
import { useBranches, useIngredients, usePurchases, useUsers, useWarehouses } from '@/api/queries'
import { Card, CardHeader } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import Pagination from '@/components/ui/Pagination'
import { selectClass, textareaClass } from '@/components/ui/styles'
import { fullName, purchaseTotal } from '@/domain/rules'
import type { ID, Purchase } from '@/domain/types'
import { errorMessage, useLocalize, useT } from '@/i18n'
import { countUnit, formatDateTime, formatMoney, formatNumber } from '@/lib/format'
import { showToast } from '@/lib/swal'
import { activeWarehouses, warehouseLabel } from '@/lib/warehouses'
import { newDraftLine, readyPurchase, type DraftLine } from './draftLines'
import LinesEditor from './LinesEditor'
import PurchaseDetails, { PurchaseStatusBadge } from './PurchaseDetails'
import { usePageState, useServerPage } from './serverPagination'

/**
 * Ro'yxatdagi kirim: sarlavha (raqam, ombor, summa, kim va qachon, nima keldi) bosilsa tarkibi narxlari bilan ochiladi.
 * Holat belgisi — faqat eski (tasdiq kutayotgan / rad etilgan) kirimlarda: yangilari darhol qabul qilinadi.
 */
export function PurchaseRow({ purchase, defaultOpen = false, children }: { purchase: Purchase; defaultOpen?: boolean; children?: ReactNode }) {
  const t = useT()
  const localize = useLocalize()
  const users = useUsers().data ?? []
  const warehouses = useWarehouses().data ?? []
  const branches = useBranches().data ?? []
  const ingredients = useIngredients().data ?? []
  const [open, setOpen] = useState(defaultOpen)
  const author = users.find((u) => u.id === purchase.createdBy)
  const decider = users.find((u) => u.id === purchase.decidedBy)
  // "Pomidor 12,5 kg · Ketchup 10 dona" — ochmasdan ham nima kelgani ko'rinsin
  const summary = purchase.items
    .map((item) => {
      const ingredient = ingredients.find((i) => i.id === item.ingredientId)
      if (!ingredient) return null
      return `${localize(ingredient.name)} ${formatNumber(item.qty, 3)} ${countUnit({ unit: ingredient.unit, packSize: item.packSize }, t)}`
    })
    .filter(Boolean)
    .join(' · ')
  return (
    <li>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left hover:bg-neutral-50">
        <span className="font-extrabold text-neutral-950">{t.purchase.number(purchase.number)}</span>
        {purchase.status !== 'approved' && <PurchaseStatusBadge status={purchase.status} />}
        <span className="text-sm text-neutral-500">{warehouseLabel(warehouses, branches, purchase.warehouseId, t)}</span>
        <span className="flex-1" />
        <span className="text-sm font-bold tabular-nums">{purchase.status === 'rejected' ? '—' : formatMoney(Math.round(purchaseTotal(purchase)), t)}</span>
        <ChevronDown size={16} className={`text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        <span className="w-full text-xs text-neutral-500">
          {formatDateTime(purchase.createdAt)} · {author ? fullName(author) : '—'}
          {purchase.decidedAt && ` · ${t.purchase.decidedBy}: ${decider ? fullName(decider) : '—'} (${formatDateTime(purchase.decidedAt)})`}
        </span>
        {summary && <span className="w-full truncate text-xs text-neutral-700">{summary}</span>}
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
 * Kirim (ta'minotchi yoki admin): kelgan mahsulotlar, miqdori va 1 birlik narxi (oxirgi narx oldindan yozilgan) →
 * darhol omborga qo'shiladi, admin tasdiqlamaydi; mahsulotning oxirgi narxi shunga yangilanadi, Telegram botga
 * "Yangi kirim" ketadi. O'ngda — kirimlar ro'yxati.
 */
export default function PurchasesPage() {
  const t = useT()
  const [params] = useSearchParams()
  const allWarehouses = useWarehouses().data ?? []
  const branches = useBranches().data ?? []
  const ingredients = useIngredients().data ?? []
  const warehouses = activeWarehouses(allWarehouses, branches)
  // omborlar serverdan keladi: tanlanmaguncha (yoki yuklanguncha) — birinchisi (markaziy)
  const [chosenWarehouse, setWarehouseId] = useState<ID>('')
  const warehouseId = warehouses.find((w) => w.id === chosenWarehouse)?.id ?? warehouses[0]?.id ?? ''
  const [lines, setLines] = useState<DraftLine[]>(() => [newDraftLine(params.get('item') ?? '', params.get('qty') ?? '')])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const ready = readyPurchase(lines, ingredients)
  const canSubmit = ready.items.length > 0 && !ready.missingPrice
  // yangisi birinchi, 10 tadan — server sahifalaydi
  const paging = usePageState()
  const purchases = usePurchases({ page: paging.page, limit: paging.limit })
  const { list, pagination } = useServerPage(purchases.data, paging)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!warehouseId || !canSubmit || busy) return
    setBusy(true)
    try {
      await api.purchases.create({ warehouseId, items: ready.items, note })
      setLines([newDraftLine()])
      setNote('')
      paging.reset()
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
                  {warehouseLabel(allWarehouses, branches, w.id, t)}
                </option>
              ))}
            </select>
          </Field>
          <LinesEditor lines={lines} onChange={setLines} availableIn={warehouseId} mode="purchase" />
          <Field label={t.purchase.note} htmlFor="purchase-note">
            <textarea id="purchase-note" value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={200} placeholder={t.purchase.notePlaceholder} className={textareaClass} />
          </Field>
          {ready.items.length > 0 && (
            <div className="flex items-baseline justify-between gap-3 border-t border-neutral-100 pt-3">
              <span className="text-sm font-bold">{t.purchase.total}</span>
              <span className="text-lg font-extrabold whitespace-nowrap tabular-nums">{formatMoney(ready.total, t)}</span>
            </div>
          )}
          <button type="submit" disabled={!canSubmit || busy} className="btn-primary flex h-12 w-full items-center justify-center gap-2 rounded text-sm font-bold">
            <PackagePlus size={16} />
            {t.purchase.submit}
          </button>
        </form>
      </Card>

      <Card>
        <CardHeader title={t.purchase.list} />
        {!list ? (
          purchases.error ? (
            <div className="p-4">
              <EmptyState icon={ClipboardList} title={errorMessage(purchases.error)} />
            </div>
          ) : null
        ) : list.total === 0 ? (
          <div className="p-4">
            <EmptyState icon={ClipboardList} title={t.purchase.empty} />
          </div>
        ) : (
          <>
            <ul className="divide-y divide-neutral-100">
              {list.items.map((purchase) => (
                <PurchaseRow key={purchase.id} purchase={purchase} />
              ))}
            </ul>
            <Pagination {...pagination} />
          </>
        )}
      </Card>
    </div>
  )
}

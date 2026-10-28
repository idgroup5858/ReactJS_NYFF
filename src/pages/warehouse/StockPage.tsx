import { Check, History, PackageSearch, Pencil, Search, Truck, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { api } from '@/api'
import { useBranches, useIngredients, useStock, useWarehouses } from '@/api/queries'
import { Card } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { inputClass, tdClass, thClass } from '@/components/ui/styles'
import Toggle from '@/components/ui/Toggle'
import ViewToggle from '@/components/ui/ViewToggle'
import { INGREDIENT_GROUPS, type ID, type Ingredient, type IngredientGroup, type StockItem } from '@/domain/types'
import { fromBase, toBase } from '@/domain/units'
import { errorMessage, useLocalize, useT } from '@/i18n'
import { formatMoney, formatNumber, formatStock } from '@/lib/format'
import { showToast } from '@/lib/swal'
import { activeWarehouses, parseQty, warehouseLabel } from '@/lib/warehouses'
import { setWarehouseView, useSettings } from '@/store/settingsStore'
import GroupHeading from './GroupHeading'
import MovementsModal from './MovementsModal'
import { useLastData } from './serverPagination'

type Row = { ingredient: Ingredient; stock: StockItem | undefined; qty: number; min: number; low: boolean }

/** To'ldirish uchun taklif: chegaraning ikki barobarigacha (ombor birligida, yaxlitlangan). */
function suggestedRefill(row: Row): number {
  const missing = Math.max(row.min * 2 - row.qty, row.min)
  const units = fromBase(missing, row.ingredient.unit)
  return row.ingredient.unit === 'pcs' ? Math.ceil(units) : Math.ceil(units * 10) / 10
}

/** Chegarani joyida tahrirlash (ombor birligida). */
function MinEditor({ row, warehouseId, onDone }: { row: Row; warehouseId: ID; onDone: () => void }) {
  const t = useT()
  const [value, setValue] = useState(String(fromBase(row.min, row.ingredient.unit)))
  const save = async () => {
    const qty = parseQty(value)
    if (!(qty >= 0)) return showToast(t.errors.invalid_qty, 'error')
    try {
      await api.ingredients.setMinQty(warehouseId, row.ingredient.id, toBase(qty, row.ingredient.unit))
      showToast(t.stock.minSaved)
      onDone()
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      <input autoFocus value={value} onChange={(event) => setValue(event.target.value)} inputMode="decimal" className={`${inputClass} h-8! w-20!`} />
      <span className="text-xs text-neutral-500">{t.units[row.ingredient.unit]}</span>
      <button type="submit" aria-label={t.common.save} className="btn-primary flex h-8 w-8 items-center justify-center rounded">
        <Check size={14} />
      </button>
      <button type="button" onClick={onDone} aria-label={t.common.cancel} className="btn-icon flex h-8 w-8 items-center justify-center rounded">
        <X size={14} />
      </button>
    </form>
  )
}

type ItemProps = { row: Row; warehouseId: ID; refillTo: string; onHistory: () => void }

/** Qoldiq qiymati oxirgi kirim narxida; narx hali noma'lum bo'lsa — `null`. */
function rowValue(row: Row): number | null {
  const { ingredient } = row
  return ingredient.lastPrice !== null ? Math.round(Math.max(0, fromBase(row.qty, ingredient.unit)) * ingredient.lastPrice) : null
}

/** "Kam" / "Tugagan" belgisi; qoldiq yetarli bo'lsa — hech narsa. */
function LowBadge({ row }: { row: Row }) {
  const t = useT()
  if (!row.low) return null
  const out = row.qty <= 0
  return (
    <span className={`shrink-0 rounded-chip px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase ${out ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'}`}>
      {out ? t.stock.out : t.stock.low}
    </span>
  )
}

/** Ogohlantirish chegarasi — bosilsa joyida tahrirlash ochiladi. */
function MinButton({ row, onEdit }: { row: Row; onEdit: () => void }) {
  const t = useT()
  return (
    <button
      type="button"
      onClick={onEdit}
      title={t.stock.editMin}
      className="group flex cursor-pointer items-center gap-1.5 font-semibold whitespace-nowrap text-neutral-700 tabular-nums hover:text-neutral-950"
    >
      {row.min > 0 ? formatStock(row.min, row.ingredient.unit, t) : '—'}
      <Pencil size={12} className="text-neutral-300 group-hover:text-select" />
    </button>
  )
}

/** Amallar: kam bo'lsa — "To'ldirish" (kartochkada butun kenglikda), har doim — harakatlar tarixi. */
function RowActions({ row, refillTo, onHistory, stretch = false }: Omit<ItemProps, 'warehouseId'> & { stretch?: boolean }) {
  const t = useT()
  return (
    <div className="flex justify-end gap-1.5">
      {row.low && (
        <Link to={refillTo} className={`btn-primary flex h-8 items-center justify-center gap-1.5 rounded px-2.5 text-xs font-bold whitespace-nowrap ${stretch ? 'flex-1' : ''}`}>
          <Truck size={14} />
          {t.stock.refill}
        </Link>
      )}
      <button type="button" onClick={onHistory} title={t.stock.history} aria-label={t.stock.history} className="btn-icon flex h-8 w-8 shrink-0 items-center justify-center rounded">
        <History size={14} />
      </button>
    </div>
  )
}

/** Mahsulot kartochkasi: nomi, holati (faqat kam / tugagan), katta qoldiq, chegara (bosib tahrirlanadi), qiymati, amallar. */
function StockCard({ row, warehouseId, refillTo, onHistory }: ItemProps) {
  const t = useT()
  const localize = useLocalize()
  const [editing, setEditing] = useState(false)
  const value = rowValue(row)

  return (
    <div className={`flex flex-col gap-3 rounded-card border-2 p-3.5 shadow-card ${row.low ? 'border-red-200 bg-red-50' : 'border-transparent bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 leading-snug font-semibold text-neutral-950">{localize(row.ingredient.name)}</p>
        <LowBadge row={row} />
      </div>
      <p className={`text-2xl leading-none font-extrabold tabular-nums ${row.low ? 'text-red-700' : 'text-neutral-950'}`}>{formatStock(row.qty, row.ingredient.unit, t)}</p>
      {editing ? (
        <MinEditor row={row} warehouseId={warehouseId} onDone={() => setEditing(false)} />
      ) : (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
          <dt className="text-neutral-500">{t.stock.min}</dt>
          <dt className="text-right text-neutral-500">{t.stock.value}</dt>
          <dd>
            <MinButton row={row} onEdit={() => setEditing(true)} />
          </dd>
          <dd className="text-right font-semibold whitespace-nowrap text-neutral-700 tabular-nums">{value !== null ? formatMoney(value, t) : '—'}</dd>
        </dl>
      )}
      <div className="mt-auto">
        <RowActions row={row} refillTo={refillTo} onHistory={onHistory} stretch />
      </div>
    </div>
  )
}

/** ixcham jadval katagi — kartochkadagidan pastroq qatorlar */
const cellClass = `${tdClass} py-1.5!`

/** Ixcham ko'rinishdagi qator: nomi + holati, qoldiq, chegara (bosib tahrirlanadi), qiymati, amallar. */
function StockRow({ row, warehouseId, refillTo, onHistory }: ItemProps) {
  const t = useT()
  const localize = useLocalize()
  const [editing, setEditing] = useState(false)
  const value = rowValue(row)

  return (
    <tr className={row.low ? 'bg-red-50/70' : ''}>
      <td className={cellClass}>
        <span className="flex items-center gap-2">
          <span className="font-semibold text-neutral-950">{localize(row.ingredient.name)}</span>
          <LowBadge row={row} />
        </span>
      </td>
      <td className={`${cellClass} text-right font-extrabold tabular-nums ${row.low ? 'text-red-700' : 'text-neutral-950'}`}>{formatStock(row.qty, row.ingredient.unit, t)}</td>
      <td className={cellClass}>{editing ? <MinEditor row={row} warehouseId={warehouseId} onDone={() => setEditing(false)} /> : <MinButton row={row} onEdit={() => setEditing(true)} />}</td>
      <td className={`${cellClass} text-right font-semibold text-neutral-700 tabular-nums`}>{value !== null ? formatMoney(value, t) : '—'}</td>
      <td className={cellClass}>
        <RowActions row={row} refillTo={refillTo} onHistory={onHistory} />
      </td>
    </tr>
  )
}

/**
 * Qoldiqlar: ombor tanlanadi → mahsulotlar guruhlar bo'yicha kartochkalar to'rida yoki ixcham jadvalda (ko'rinish shu
 * qurilmada saqlanadi): qoldiq, ogohlantirish chegarasi (tahrirlanadi), qiymati. Kam qolganlar guruh boshida, "To'ldirish" —
 * ko'chirish (filial) yoki kirim (markaziy) formasi tayyor holda ochiladi.
 */
export default function StockPage() {
  const t = useT()
  const localize = useLocalize()
  const [params, setParams] = useSearchParams()
  const warehousesQuery = useWarehouses()
  const ingredientsQuery = useIngredients()
  const allWarehouses = warehousesQuery.data ?? []
  const branches = useBranches().data ?? []
  const warehouses = activeWarehouses(allWarehouses, branches)
  const warehouseId = warehouses.find((w) => w.id === params.get('wh'))?.id ?? warehouses[0]?.id ?? ''
  const warehouse = warehouses.find((w) => w.id === warehouseId)
  const stockQuery = useStock(warehouseId || undefined, { enabled: !!warehouseId })
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<IngredientGroup | 'all'>('all')
  const [onlyLow, setOnlyLow] = useState(false)
  const [history, setHistory] = useState<ID | null>(null)
  const view = useSettings().warehouseView

  // boshqa ombor tanlanganda uning qoldig'i kelguncha oldingisi turadi (ro'yxat yo'qolib-qaytmasin)
  const stockItems = useLastData(stockQuery.data)

  // mahsulotlar va qoldiq birinchi marta kelguncha ro'yxat ham, ko'rsatkichlar ham chiqmaydi (noldan sakramasin)
  const loaded = ingredientsQuery.data !== undefined && stockItems !== undefined
  const loadError = warehousesQuery.error ?? ingredientsQuery.error ?? stockQuery.error
  // qoldiq yozuvi yo'q mahsulot — qoldiq 0, chegara yo'q
  const stockById = new Map((stockItems ?? []).map((item) => [item.ingredientId, item]))
  const rows: Row[] = (stockItems ? (ingredientsQuery.data ?? []) : [])
    .filter((i) => i.active)
    .map((ingredient) => {
      const stock = stockById.get(ingredient.id)
      const qty = stock?.qty ?? 0
      const min = stock?.minQty ?? 0
      return { ingredient, stock, qty, min, low: min > 0 && qty < min }
    })
  const search = query.trim().toLowerCase()
  const visible = rows
    .filter((row) => group === 'all' || row.ingredient.group === group)
    .filter((row) => !onlyLow || row.low)
    .filter((row) => !search || Object.values(row.ingredient.name).some((name) => name.toLowerCase().includes(search)))
    .sort((a, b) => Number(b.low) - Number(a.low) || localize(a.ingredient.name).localeCompare(localize(b.ingredient.name)))
  const sections = INGREDIENT_GROUPS.map((value) => ({ group: value, rows: visible.filter((row) => row.ingredient.group === value) })).filter(
    (section) => section.rows.length > 0,
  )

  const totalValue = rows.reduce((sum, row) => sum + Math.max(0, fromBase(row.qty, row.ingredient.unit)) * (row.ingredient.lastPrice ?? 0), 0)
  const lowCount = rows.filter((row) => row.low).length

  const refillLink = (row: Row) => {
    const qty = suggestedRefill(row)
    return warehouse?.kind === 'central'
      ? `/ombor/kirim?item=${row.ingredient.id}&qty=${qty}`
      : `/ombor/kochirish?from=${warehouses[0]?.id ?? ''}&to=${warehouseId}&item=${row.ingredient.id}&qty=${qty}`
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.stock.title}
        description={t.stock.hint}
        actions={
          <SegmentedControl
            label={t.stock.warehouse}
            value={warehouseId}
            onChange={(id) => setParams({ wh: id }, { replace: true })}
            options={warehouses.map((w) => ({ value: w.id, label: warehouseLabel(allWarehouses, branches, w.id, t) }))}
          />
        }
      />

      {/* uchtasi sig'masa — keyingi qatorga (yozuv bo'linmaydi) */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,19rem),1fr))] gap-3">
        {[
          { label: t.stock.itemsCount, value: loaded ? formatNumber(rows.length) : '—' },
          { label: t.stock.lowCount, value: loaded ? formatNumber(lowCount) : '—', tone: lowCount > 0 ? 'text-red-700' : '' },
          { label: t.stock.totalValue, value: loaded ? formatMoney(Math.round(totalValue), t) : '—' },
        ].map((stat) => (
          <Card key={stat.label} className="px-4 py-3">
            <p className="text-[11px] font-semibold tracking-[0.1em] whitespace-nowrap text-neutral-500 uppercase">{stat.label}</p>
            <p className={`text-xl font-extrabold tabular-nums ${stat.tone ?? ''}`}>{stat.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 p-3">
          <label className="relative block min-w-52 flex-1">
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.stock.search} className={`${inputClass} pl-9`} />
          </label>
          <select value={group} onChange={(event) => setGroup(event.target.value as IngredientGroup | 'all')} aria-label={t.ingredients.group} className={`${inputClass} w-auto! cursor-pointer`}>
            <option value="all">{t.common.all}</option>
            {INGREDIENT_GROUPS.map((value) => (
              <option key={value} value={value}>
                {t.stock.groups[value]}
              </option>
            ))}
          </select>
          <Toggle checked={onlyLow} onChange={setOnlyLow} label={t.stock.onlyLow} />
          <ViewToggle value={view} onChange={setWarehouseView} />
        </div>
      </Card>

      {!loaded ? (
        loadError ? (
          <Card className="p-4">
            <EmptyState icon={PackageSearch} title={errorMessage(loadError)} />
          </Card>
        ) : null
      ) : visible.length === 0 ? (
        <Card className="p-4">
          <EmptyState icon={PackageSearch} title={t.stock.emptySearch} />
        </Card>
      ) : view === 'list' ? (
        // bitta jadval, guruhlar — sarlavha qatorlari: ustunlar hamma guruhda bir tekis
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200">
                <tr>
                  <th className={thClass}>{t.stock.name}</th>
                  <th className={`${thClass} text-right`}>{t.stock.qty}</th>
                  <th className={thClass}>{t.stock.min}</th>
                  <th className={`${thClass} text-right`}>{t.stock.value}</th>
                  <th className={thClass} />
                </tr>
              </thead>
              {sections.map((section) => (
                <tbody key={section.group} className="divide-y divide-neutral-100 border-b border-neutral-200 last:border-b-0">
                  <tr className="bg-neutral-50">
                    <td colSpan={5} className="px-3 py-1.5">
                      <GroupHeading group={section.group} count={section.rows.length} compact />
                    </td>
                  </tr>
                  {section.rows.map((row) => (
                    <StockRow key={row.ingredient.id} row={row} warehouseId={warehouseId} refillTo={refillLink(row)} onHistory={() => setHistory(row.ingredient.id)} />
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </Card>
      ) : (
        sections.map((section) => (
          <section key={section.group} className="space-y-2.5">
            <GroupHeading group={section.group} count={section.rows.length} />
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
              {section.rows.map((row) => (
                <StockCard
                  key={row.ingredient.id}
                  row={row}
                  warehouseId={warehouseId}
                  refillTo={refillLink(row)}
                  onHistory={() => setHistory(row.ingredient.id)}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {history && <MovementsModal warehouseId={warehouseId} ingredientId={history} onClose={() => setHistory(null)} />}
    </div>
  )
}

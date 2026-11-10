import { Check, Eraser, History, PackageSearch, Pencil, Search, Truck, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { api } from '@/api'
import { useBranches, useIngredients, useStock, useWarehouses } from '@/api/queries'
import { useCurrentUser } from '@/api/session'
import { Card } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { inputClass, tdClass, thClass } from '@/components/ui/styles'
import Toggle from '@/components/ui/Toggle'
import ViewToggle from '@/components/ui/ViewToggle'
import { INGREDIENT_GROUPS, type ID, type Ingredient, type IngredientGroup, type StockItem } from '@/domain/types'
import { fromBase, toBase, unitSize } from '@/domain/units'
import { errorMessage, useLocalize, useT } from '@/i18n'
import { countUnit, formatMoney, formatNumber, formatStock } from '@/lib/format'
import { confirmDialog, showToast } from '@/lib/swal'
import { activeWarehouses, parseQty, warehouseLabel } from '@/lib/warehouses'
import { setWarehouseView, useSettings } from '@/store/settingsStore'
import GroupHeading from './GroupHeading'
import MovementsModal from './MovementsModal'
import { useLastData } from './serverPagination'

/**
 * [min] — chegara, [target] — yozilgan norma (0 — yo'q), asosiy birlikda. [low] — to'ldirish kerak: chegaradan kam yoki
 * qoldiq minus (chegarasiz ham — qoldiq kiritilmasdan sotilgan; chegarasiz 0 — yo'q, ishlatilmayotgan bo'lishi mumkin).
 */
type Row = { ingredient: Ingredient; stock: StockItem | undefined; qty: number; min: number; target: number; low: boolean }

/** Joyida tahrirlanadigan son: ogohlantirish chegarasi yoki to'ldirish normasi. */
type Limit = 'min' | 'target'

/** Ombor birligidagi miqdor (qadoqli mahsulotda — donada). */
const inUnits = (baseQty: number, ingredient: Ingredient) => fromBase(baseQty, ingredient.unit, ingredient.packSize)

/** dona va qadoq — butun, kg / l — 0,1 gacha ([up] — yuqoriga, aks holda pastga) */
function roundUnits(units: number, ingredient: Ingredient, up: boolean): number {
  const step = ingredient.unit === 'pcs' || ingredient.packSize !== null ? 1 : 10
  const round = up ? Math.ceil : Math.floor
  // 1,2 × 10 = 12,000000000000002 — yuqoriga yaxlitlashda 13 bo'lib qolmasin
  return round(Number((units * step).toFixed(6))) / step
}

/** "To'ldirish" qaysi darajagacha (asosiy birlikda): norma → yo'q bo'lsa chegara × 2 → u ham yo'q bo'lsa 10 birlik. */
function refillTarget(row: Row): number {
  if (row.target > 0) return row.target
  if (row.min > 0) return row.min * 2
  return 10 * unitSize(row.ingredient.unit, row.ingredient.packSize)
}

/**
 * To'ldirish uchun taklif, ombor birligida: maqsad − qoldiq (minus ham yopiladi: −3 kg, maqsad 10 kg → 13 kg).
 * [source] — qayerdan olinadi (markaziy ombordagi qoldiq, asosiy birlikda): undan ko'p taklif qilinmaydi; u ham
 * tugagan bo'lsa — kerakli miqdorning o'zi (formada qizil bo'lib ko'rinadi — avval markazga kirim kerak).
 */
function suggestedRefill(row: Row, source: number | undefined): number {
  const wanted = roundUnits(inUnits(Math.max(0, refillTarget(row) - row.qty), row.ingredient), row.ingredient, true)
  if (source === undefined || source <= 0) return wanted
  return Math.min(wanted, roundUnits(inUnits(source, row.ingredient), row.ingredient, false))
}

/** Chegara yoki normani joyida tahrirlash (ombor birligida, qadoqli mahsulotda — donada); normada bo'sh / 0 — avtomatik. */
function LimitEditor({ row, limit, warehouseId, onDone }: { row: Row; limit: Limit; warehouseId: ID; onDone: () => void }) {
  const t = useT()
  const current = limit === 'min' ? row.min : row.target
  const [value, setValue] = useState(String(Number(inUnits(current, row.ingredient).toFixed(3))))
  const save = async () => {
    const qty = limit === 'target' && value.trim() === '' ? 0 : parseQty(value)
    if (!(qty >= 0)) return showToast(t.errors.invalid_qty, 'error')
    const base = toBase(qty, row.ingredient.unit, row.ingredient.packSize)
    try {
      if (limit === 'min') await api.ingredients.setMinQty(warehouseId, row.ingredient.id, base)
      else await api.ingredients.setTargetQty(warehouseId, row.ingredient.id, base)
      showToast(limit === 'min' ? t.stock.minSaved : t.stock.targetSaved)
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
      <input
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        inputMode="decimal"
        aria-label={limit === 'min' ? t.stock.min : t.stock.target}
        className={`${inputClass} w-20!`}
      />
      <span className="text-xs text-neutral-500">{countUnit(row.ingredient, t)}</span>
      <button type="submit" aria-label={t.common.save} className="btn-primary flex h-8 w-8 items-center justify-center rounded">
        <Check size={14} />
      </button>
      <button type="button" onClick={onDone} aria-label={t.common.cancel} className="btn-icon flex h-8 w-8 items-center justify-center rounded">
        <X size={14} />
      </button>
    </form>
  )
}

/** [onReset] — faqat admin: qoldiqni 0 ga tushirish (tasdiqlab) */
type ItemProps = { row: Row; warehouseId: ID; refillTo: string; onHistory: () => void; onReset?: () => void }

/** Qoldiq qiymati oxirgi kirim narxida; narx hali noma'lum bo'lsa — `null`. */
function rowValue(row: Row): number | null {
  const { ingredient } = row
  return ingredient.lastPrice !== null ? Math.round(Math.max(0, inUnits(row.qty, ingredient)) * ingredient.lastPrice) : null
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

/**
 * Ogohlantirish chegarasi yoki to'ldirish normasi — bosilsa joyida tahrirlash ochiladi. Norma yozilmagan bo'lsa —
 * "To'ldirish" yetkazadigan daraja kulrang (chegara × 2 yoki 10 birlik), ustida — qoidasi.
 */
function LimitButton({ row, limit, onEdit }: { row: Row; limit: Limit; onEdit: () => void }) {
  const t = useT()
  const auto = limit === 'target' && row.target === 0
  const value = limit === 'min' ? row.min : row.target || refillTarget(row)
  const title =
    limit === 'min' ? t.stock.editMin : auto ? `${t.stock.targetAuto(row.min > 0 ? t.stock.targetAutoMin : t.stock.targetAutoDefault)}. ${t.stock.editTarget}` : t.stock.editTarget
  return (
    <button
      type="button"
      onClick={onEdit}
      title={title}
      className={`group flex cursor-pointer items-center gap-1.5 font-semibold whitespace-nowrap tabular-nums hover:text-neutral-950 ${auto ? 'text-neutral-400' : 'text-neutral-700'}`}
    >
      {value > 0 ? formatStock(value, row.ingredient, t) : '—'}
      <Pencil size={12} className="text-neutral-300 group-hover:text-select" />
    </button>
  )
}

/**
 * Amallar: kam bo'lsa — "To'ldirish" (kartochkada butun kenglikda), har doim — harakatlar tarixi; admin uchun qoldiq
 * 0 bo'lmasa — "0 ga tushirish".
 */
function RowActions({ row, refillTo, onHistory, onReset, stretch = false }: Omit<ItemProps, 'warehouseId'> & { stretch?: boolean }) {
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
      {onReset && row.qty !== 0 && (
        <button type="button" onClick={onReset} title={t.stock.reset} aria-label={t.stock.reset} className="btn-icon-danger flex h-8 w-8 shrink-0 items-center justify-center rounded">
          <Eraser size={14} />
        </button>
      )}
    </div>
  )
}

/** Mahsulot kartochkasi: nomi, holati (faqat kam / tugagan), katta qoldiq, chegara va norma (bosib tahrirlanadi), qiymati, amallar. */
function StockCard({ row, warehouseId, refillTo, onHistory, onReset }: ItemProps) {
  const t = useT()
  const localize = useLocalize()
  const [editing, setEditing] = useState<Limit | null>(null)
  const value = rowValue(row)

  return (
    <div className={`flex flex-col gap-3 rounded-card border-2 p-3.5 shadow-card ${row.low ? 'border-red-200 bg-red-50' : 'border-transparent bg-surface dark:border-line'}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 leading-snug font-semibold text-neutral-950">{localize(row.ingredient.name)}</p>
        <LowBadge row={row} />
      </div>
      <p className={`text-2xl leading-none font-extrabold tabular-nums ${row.low ? 'text-red-700' : 'text-neutral-950'}`}>{formatStock(row.qty, row.ingredient, t)}</p>
      {editing ? (
        <div className="space-y-1">
          <p className="text-xs text-neutral-500">{editing === 'min' ? t.stock.min : t.stock.target}</p>
          <LimitEditor row={row} limit={editing} warehouseId={warehouseId} onDone={() => setEditing(null)} />
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
          <dt className="text-neutral-500">{t.stock.min}</dt>
          <dt className="text-right text-neutral-500">{t.stock.target}</dt>
          <dd>
            <LimitButton row={row} limit="min" onEdit={() => setEditing('min')} />
          </dd>
          <dd className="flex justify-end">
            <LimitButton row={row} limit="target" onEdit={() => setEditing('target')} />
          </dd>
          <dt className="mt-1.5 text-neutral-500">{t.stock.value}</dt>
          <dd className="mt-1.5 text-right font-semibold whitespace-nowrap text-neutral-700 tabular-nums">{value !== null ? formatMoney(value, t) : '—'}</dd>
        </dl>
      )}
      <div className="mt-auto">
        <RowActions row={row} refillTo={refillTo} onHistory={onHistory} onReset={onReset} stretch />
      </div>
    </div>
  )
}

/** ixcham jadval katagi — kartochkadagidan pastroq qatorlar */
const cellClass = `${tdClass} py-1.5!`

/** Ixcham ko'rinishdagi qator: nomi + holati, qoldiq, chegara va norma (bosib tahrirlanadi), qiymati, amallar. */
function StockRow({ row, warehouseId, refillTo, onHistory, onReset }: ItemProps) {
  const t = useT()
  const localize = useLocalize()
  const [editing, setEditing] = useState<Limit | null>(null)
  const value = rowValue(row)
  const limitCell = (limit: Limit) =>
    editing === limit ? (
      <LimitEditor row={row} limit={limit} warehouseId={warehouseId} onDone={() => setEditing(null)} />
    ) : (
      <LimitButton row={row} limit={limit} onEdit={() => setEditing(limit)} />
    )

  return (
    <tr className={row.low ? 'bg-red-50/70' : ''}>
      <td className={cellClass}>
        <span className="flex items-center gap-2">
          <span className="font-semibold text-neutral-950">{localize(row.ingredient.name)}</span>
          <LowBadge row={row} />
        </span>
      </td>
      <td className={`${cellClass} text-right font-extrabold whitespace-nowrap tabular-nums ${row.low ? 'text-red-700' : 'text-neutral-950'}`}>{formatStock(row.qty, row.ingredient, t)}</td>
      <td className={cellClass}>{limitCell('min')}</td>
      <td className={cellClass}>{limitCell('target')}</td>
      <td className={`${cellClass} text-right font-semibold text-neutral-700 tabular-nums`}>{value !== null ? formatMoney(value, t) : '—'}</td>
      <td className={cellClass}>
        <RowActions row={row} refillTo={refillTo} onHistory={onHistory} onReset={onReset} />
      </td>
    </tr>
  )
}

/**
 * Qoldiqlar: ombor tanlanadi → mahsulotlar guruhlar bo'yicha kartochkalar to'rida yoki ixcham jadvalda (ko'rinish shu
 * qurilmada saqlanadi): qoldiq, ogohlantirish chegarasi va to'ldirish normasi (tahrirlanadi), qiymati. Kam qolgan /
 * minusdagilar guruh boshida, "To'ldirish" (bittasi) va "Hammasini to'ldirish" (ko'rinib turgan kamlarning hammasi bitta
 * hujjatda) — ko'chirish (filial, markazdan; markazda bori bilan cheklanadi) yoki kirim (markaziy) formasi tayyor holda.
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
  // filialni to'ldirish — markazdan: markazda bori taklif qilinadi
  const centralId = (warehouses.find((w) => w.kind === 'central') ?? warehouses[0])?.id ?? ''
  const fromCentral = warehouse?.kind !== 'central' && !!centralId && centralId !== warehouseId
  const centralStock = useStock(centralId || undefined, { enabled: fromCentral }).data
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<IngredientGroup | 'all'>('all')
  const [onlyLow, setOnlyLow] = useState(false)
  const [history, setHistory] = useState<ID | null>(null)
  const view = useSettings().warehouseView
  // qoldiqni 0 ga tushirish — faqat admin (ta'minotchiga tugmalar ko'rinmaydi, server ham 403)
  const isAdmin = useCurrentUser()?.role === 'admin'

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
      return { ingredient, stock, qty, min, target: stock?.targetQty ?? 0, low: (min > 0 && qty < min) || qty < 0 }
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

  const totalValue = rows.reduce((sum, row) => sum + Math.max(0, inUnits(row.qty, row.ingredient)) * (row.ingredient.lastPrice ?? 0), 0)
  const lowCount = rows.filter((row) => row.low).length

  // markazdagi qoldiq (yuklanmagan — cheklanmaydi; yozuvi yo'q — 0)
  const centralQty = (ingredientId: ID) =>
    fromCentral && centralStock ? (centralStock.find((item) => item.ingredientId === ingredientId)?.qty ?? 0) : undefined
  /** formaga qatorlar: `items=<id>:<son>,…` (taklif 0 — miqdor bo'sh) */
  const refillLink = (list: Row[]) => {
    const items = list
      .map((row) => {
        const qty = suggestedRefill(row, centralQty(row.ingredient.id))
        return `${row.ingredient.id}:${qty > 0 ? qty : ''}`
      })
      .join(',')
    return fromCentral ? `/ombor/kochirish?from=${centralId}&to=${warehouseId}&items=${items}` : `/ombor/kirim?items=${items}`
  }
  // "Hammasini to'ldirish" — ko'rinib turganlardan (guruh / qidiruv filtri bilan) to'ldirish kerak bo'lganlari
  const visibleLow = visible.filter((row) => row.low)

  // "Omborni 0 qilish" — filtrga qaramay butun ombor (server ham shunday: faolsiz mahsulotlar ham) — son shundan
  const nonZeroCount = (stockItems ?? []).filter((item) => item.qty !== 0).length
  /** [row] — bitta mahsulot; berilmasa — butun ombor. Tasdiqlangach server natijasi toast'da. */
  const reset = async (row?: Row) => {
    const confirmed = row
      ? await confirmDialog(t.stock.resetTitle(localize(row.ingredient.name)), t.stock.resetText(formatStock(row.qty, row.ingredient, t)), t.stock.resetConfirm)
      : await confirmDialog(
          t.stock.resetWarehouseTitle(warehouseLabel(allWarehouses, branches, warehouseId, t)),
          // filial omborida — offline kassa sotuvlari 0 dan keyin kelsa, yana minusga tushiradi
          warehouse?.kind === 'central' ? t.stock.resetWarehouseText(nonZeroCount) : `${t.stock.resetWarehouseText(nonZeroCount)} ${t.stock.resetOfflineNote}`,
          t.stock.resetConfirm,
        )
    if (!confirmed) return
    try {
      const { count } = await api.stock.reset(warehouseId, row?.ingredient.id)
      showToast(count > 0 ? t.stock.resetDone(count) : t.stock.resetNothing, count > 0 ? 'success' : 'info')
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
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
          {isAdmin && loaded && nonZeroCount > 0 && (
            <button
              type="button"
              onClick={() => void reset()}
              className="btn-icon-danger flex h-10 items-center justify-center gap-2 rounded px-3 text-xs font-bold whitespace-nowrap"
            >
              <Eraser size={16} />
              {t.stock.resetWarehouse}
            </button>
          )}
          {visibleLow.length > 0 && (
            <Link to={refillLink(visibleLow)} className="btn-primary flex h-10 items-center justify-center gap-2 rounded px-3 text-xs font-bold whitespace-nowrap">
              <Truck size={16} />
              {t.stock.refillAll(visibleLow.length)}
            </Link>
          )}
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
                  <th className={thClass}>{t.stock.target}</th>
                  <th className={`${thClass} text-right`}>{t.stock.value}</th>
                  <th className={thClass} />
                </tr>
              </thead>
              {sections.map((section) => (
                <tbody key={section.group} className="divide-y divide-neutral-100 border-b border-neutral-200 last:border-b-0">
                  <tr className="bg-neutral-50">
                    <td colSpan={6} className="px-3 py-1.5">
                      <GroupHeading group={section.group} count={section.rows.length} compact />
                    </td>
                  </tr>
                  {section.rows.map((row) => (
                    <StockRow
                      key={row.ingredient.id}
                      row={row}
                      warehouseId={warehouseId}
                      refillTo={refillLink([row])}
                      onHistory={() => setHistory(row.ingredient.id)}
                      onReset={isAdmin ? () => void reset(row) : undefined}
                    />
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
                  refillTo={refillLink([row])}
                  onHistory={() => setHistory(row.ingredient.id)}
                  onReset={isAdmin ? () => void reset(row) : undefined}
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

import { ChefHat } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { api } from '@/api'
import { useIngredients, useProductions, useStock, useUsers, useWarehouses } from '@/api/queries'
import { Card, CardHeader } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import Pagination from '@/components/ui/Pagination'
import { inputClass, labelClass, textareaClass } from '@/components/ui/styles'
import Toggle from '@/components/ui/Toggle'
import { packedLine, packWeight, producedUnitPrice, productionCost } from '@/domain/production'
import { fullName } from '@/domain/rules'
import type { ID, Production } from '@/domain/types'
import { baseUnitOf, toBase } from '@/domain/units'
import { errorMessage, useLocalize, useT } from '@/i18n'
import { countUnit, formatDateTime, formatMoney, formatNumber, formatStock, formatUnit } from '@/lib/format'
import { showToast } from '@/lib/swal'
import { parseQty } from '@/lib/warehouses'
import { newDraftLine, readyLines, type DraftLine } from './draftLines'
import IngredientPicker from './IngredientPicker'
import LinesEditor from './LinesEditor'
import { usePageState, useServerPage } from './serverPagination'

/**
 * Tayyorlash (markaziy omborda): oshpaz katlet yasadi — nima tayyorlangani va nechta chiqqani, nima qancha sarflangani
 * (oshpaz aytgan haqiqiy miqdor, qadoqsiz: go'sht — kg, tuxum — dona). Saqlanganda sarflanganlar ayriladi, tayyor
 * mahsulot qo'shiladi, uning narxi tannarxdan yangilanadi. Tayyor mahsulot tanlanganda "sarflandi" ro'yxati (bo'sh
 * bo'lsa) oldingi tayyorlashdagi mahsulotlar bilan ochiladi — faqat miqdorlarni yozish qoladi.
 *
 * "Chelak (qadoq) bilan" (2026-11-24) — Chesnok sousi kabi qadoqli kg / l mahsulotda switch: chiqqani chelak sonida,
 * qadoqli sarflangan (Mayonez Milter) ham chelakda; 1 chelak og'irligi — sarflangan kg / l lar jami ÷ chelak soni, tovar
 * qadog'i shunga yangilanadi. Katlet kabi qadoqsiz mahsulotda switch yo'q — forma avvalgidek. Switch holati shu
 * mahsulotning oxirgi tayyorlashidan tiklanadi.
 */
export default function ProductionPage() {
  const t = useT()
  const localize = useLocalize()
  const central = useWarehouses().data?.find((w) => w.kind === 'central')
  const allIngredients = useIngredients().data ?? []
  const users = useUsers().data ?? []
  const stock = useStock(central?.id, { enabled: !!central }).data
  const [productId, setProductId] = useState<ID>('')
  const [qty, setQty] = useState('')
  const [lines, setLines] = useState<DraftLine[]>(() => [newDraftLine()])
  const [note, setNote] = useState('')
  const [packed, setPacked] = useState(false)
  const [busy, setBusy] = useState(false)
  // oxirgi tanlangan tayyor mahsulot — kechikkan javob switchni boshqa mahsulotniki bilan almashtirmasin
  const chosenRef = useRef<ID>('')

  const ingredientOf = (id: ID) => allIngredients.find((i) => i.id === id)
  const product = ingredientOf(productId)
  // chelak bilan — faqat qadoqli kg / l tayyor mahsulotda (katletda switch ko'rinmaydi)
  const packable = !!product && packedLine(product.unit, product.packSize)
  const chelak = packable && packed
  const produced = parseQty(qty)
  const ready = readyLines(lines)
  const chosen = new Set(lines.map((line) => line.ingredientId).filter(Boolean))
  // tayyor mahsulot sifatida — "sarflandi" da tanlanmaganlar
  const productChoices = allIngredients.filter((i) => i.active && !chosen.has(i.id))
  const productStock = product && stock ? (stock.find((s) => s.ingredientId === product.id)?.qty ?? 0) : null

  // sarflanganlar asosiy birlikda (server ham shunday hisoblaydi): chelak bilan — qadoqli kg / l (Milter) qadoqda
  const consumed = ready.flatMap((line) => {
    const ingredient = ingredientOf(line.ingredientId)
    if (!ingredient) return []
    const size = chelak && packedLine(ingredient.unit, ingredient.packSize) ? ingredient.packSize : null
    return [{ ingredient, qty: toBase(line.qty, ingredient.unit, size) }]
  })
  // taxminiy tannarx — sarflanganlarning oxirgi narxidan
  const costLines = consumed.map(({ ingredient, qty }) => ({ qty, unit: ingredient.unit, packSize: ingredient.packSize, lastPrice: ingredient.lastPrice }))
  const cost = costLines.length > 0 ? productionCost(costLines) : null
  // chelak bilan: sarflangan kg / l lar jami va shu safargi 1 chelak og'irligi
  const weights = consumed.map(({ ingredient, qty }) => ({ qty, unit: ingredient.unit }))
  const packTotal = weights.reduce((sum, line) => sum + (line.unit === 'pcs' ? 0 : line.qty), 0)
  const packSize = chelak && produced > 0 && packTotal > 0 ? packWeight(weights, produced) : null
  const outputSize = chelak ? packSize : null
  const producedBase = product && produced > 0 && (!chelak || (packSize ?? 0) >= 1) ? toBase(produced, product.unit, outputSize) : 0
  const priceSize = chelak ? packSize : (product?.packSize ?? null)
  const unitPrice = product && cost !== null && producedBase > 0 ? producedUnitPrice(cost, producedBase, product.unit, priceSize) : null

  const paging = usePageState()
  const productions = useProductions({ page: paging.page, limit: paging.limit })
  const { list, pagination } = useServerPage(productions.data, paging)

  const chooseProduct = async (id: ID) => {
    setProductId(id)
    chosenRef.current = id
    const filled = lines.some((line) => line.ingredientId)
    try {
      const last = await api.productions.last(id)
      if (chosenRef.current !== id) return
      // switch — shu mahsulotning oxirgi tayyorlashidagidek (chelak bilan bo'lgan bo'lsa — yoqiq)
      setPacked(last?.packSize != null)
      // so'rov paytida ro'yxat to'ldirilgan bo'lsa — tegilmaydi
      if (last && !filled) setLines((current) => (current.some((line) => line.ingredientId) ? current : last.items.map((item) => newDraftLine(item.ingredientId))))
    } catch {
      // oldingisi topilmasa — ro'yxat bo'sh qoladi, switch o'chiq
      if (chosenRef.current === id) setPacked(false)
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!product || !(produced > 0) || !(producedBase > 0) || ready.length === 0 || busy) return
    setBusy(true)
    try {
      await api.productions.create({ ingredientId: product.id, qty: produced, items: ready, note, ...(chelak && { packed: true }) })
      chosenRef.current = ''
      setProductId('')
      setPacked(false)
      setQty('')
      setLines([newDraftLine()])
      setNote('')
      paging.reset()
      showToast(t.production.created)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  /** "Go'sht — 48 kg" — hujjatdagidek: qadoqsiz; chelak bilan (qadoq hajmi yozilgan) — "Mayonez Milter — 4 dona (3 000 g)" */
  const lineText = (ingredientId: ID, amount: number, packSize: number | null = null) => {
    const ingredient = ingredientOf(ingredientId)
    if (!ingredient) return ingredientId
    const unit = packSize !== null ? formatUnit({ unit: ingredient.unit, packSize }, t) : t.units[ingredient.unit]
    return `${localize(ingredient.name)} — ${formatNumber(amount, 3)} ${unit}`
  }
  const costText = (production: Production) => {
    const made = ingredientOf(production.ingredientId)
    if (production.cost === null) return null
    // chelak bilan — o'sha safargi chelakka; qadoqsiz — tovarning hozirgi hisob birligiga (avvalgidek)
    const size = production.packSize ?? made?.packSize ?? null
    const base = made ? toBase(production.qty, made.unit, production.packSize) : 0
    const each =
      made && base > 0
        ? ` · ${t.production.perUnit(formatMoney(producedUnitPrice(production.cost, base, made.unit, size), t), formatUnit({ unit: made.unit, packSize: size }, t))}`
        : ''
    return `${t.production.cost}: ${formatMoney(production.cost, t)}${each}`
  }

  return (
    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader title={t.production.newTitle} hint={t.production.hint} />
        <form onSubmit={(event) => void submit(event)} className="space-y-4 p-4">
          {!central && <p className="text-sm font-semibold text-red-700">{t.production.noCentral}</p>}
          <Field label={t.production.product} hint={t.production.productHint}>
            <div className="grid grid-cols-[minmax(0,1fr)_9rem] gap-2">
              <IngredientPicker value={productId} onChange={(id) => void chooseProduct(id)} ingredients={productChoices} selected={product} />
              <label className="relative">
                <input
                  value={qty}
                  onChange={(event) => setQty(event.target.value.replace(/[^\d.,]/g, ''))}
                  inputMode="decimal"
                  placeholder={t.production.qty}
                  aria-label={t.production.qty}
                  className={`${inputClass} pr-12 text-right font-bold tabular-nums`}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-neutral-400">
                  {product ? (chelak ? countUnit(product, t) : t.units[product.unit]) : ''}
                </span>
              </label>
            </div>
            {product && (
              <p className="mt-1 px-1 text-xs text-neutral-500">
                {t.production.inStock}: {productStock !== null ? formatStock(productStock, product, t) : '—'}
              </p>
            )}
            {packable && (
              <div className="mt-2 px-1">
                <Toggle checked={packed} onChange={setPacked} label={t.production.packed} />
                <p className="mt-0.5 pl-10 text-xs text-neutral-500">{t.production.packedHint}</p>
              </div>
            )}
          </Field>
          <div>
            <p className={labelClass}>{t.production.consumed}</p>
            <p className="mb-2 text-xs text-neutral-500">{t.production.consumedHint}</p>
            <LinesEditor lines={lines} onChange={setLines} availableIn={central?.id ?? ''} mode="production" excludeId={productId || undefined} packed={chelak} />
          </div>
          {product && chelak && packSize !== null && (
            // "Jami 13 300 g → 1 dona = 2 660 g" — saqlanganda tovar qadog'i shunga yangilanadi
            <p className="rounded bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-950 tabular-nums">
              {t.production.packTotal(
                `${formatNumber(packTotal)} ${t.units[baseUnitOf(product.unit)]}`,
                countUnit(product, t),
                `${formatNumber(packSize)} ${t.units[baseUnitOf(product.unit)]}`,
              )}
            </p>
          )}
          {costLines.length > 0 && (
            <p className="rounded bg-neutral-100 px-3 py-2 text-sm">
              {cost === null ? (
                <span className="font-semibold text-amber-700">{t.production.costUnknown}</span>
              ) : (
                <>
                  <span className="text-neutral-600">{t.production.cost}: </span>
                  <b className="text-neutral-950 tabular-nums">{formatMoney(cost, t)}</b>
                  {product && unitPrice !== null && (
                    <span className="text-neutral-600 tabular-nums">
                      {' '}
                      · {t.production.perUnit(formatMoney(unitPrice, t), formatUnit({ unit: product.unit, packSize: priceSize }, t))}
                    </span>
                  )}
                </>
              )}
            </p>
          )}
          <Field label={t.purchase.note} htmlFor="production-note">
            <textarea id="production-note" value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={200} className={textareaClass} />
          </Field>
          <button
            type="submit"
            disabled={!central || !product || !(produced > 0) || !(producedBase > 0) || ready.length === 0 || busy}
            className="btn-primary flex h-12 w-full items-center justify-center gap-2 rounded text-sm font-bold"
          >
            <ChefHat size={16} />
            {t.production.submit}
          </button>
        </form>
      </Card>

      <Card>
        <CardHeader title={t.production.list} />
        {!list ? (
          productions.error ? (
            <div className="p-4">
              <EmptyState icon={ChefHat} title={errorMessage(productions.error)} />
            </div>
          ) : null
        ) : list.total === 0 ? (
          <div className="p-4">
            <EmptyState icon={ChefHat} title={t.production.empty} />
          </div>
        ) : (
          <>
            <ul className="divide-y divide-neutral-100">
              {list.items.map((production) => {
                const author = users.find((u) => u.id === production.createdBy)
                const costLine = costText(production)
                return (
                  <li key={production.id} className="space-y-1.5 px-4 py-3">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-extrabold text-neutral-950">{t.production.number(production.number)}</span>
                      <span className="font-semibold text-emerald-700">+ {lineText(production.ingredientId, production.qty, production.packSize)}</span>
                    </p>
                    <p className="text-sm text-neutral-600">
                      <span className="text-neutral-500">{t.production.consumed}: </span>
                      {production.items.map((item) => lineText(item.ingredientId, item.qty, item.packSize ?? null)).join(' · ')}
                    </p>
                    {costLine && <p className="text-xs text-neutral-600 tabular-nums">{costLine}</p>}
                    {production.note && <p className="text-xs text-neutral-500 italic">{production.note}</p>}
                    <p className="text-xs text-neutral-400">
                      {formatDateTime(production.createdAt)} · {author ? fullName(author) : '—'}
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

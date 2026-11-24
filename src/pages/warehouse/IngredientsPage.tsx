import { ChevronDown, ChevronUp, Layers, PackageSearch, Pencil, Plus, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api } from '@/api'
import { useIngredientGroups, useIngredients, useProducts } from '@/api/queries'
import { useCurrentUser } from '@/api/session'
import { Card } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import FormFooter from '@/components/ui/FormFooter'
import Field from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import { inputClass, selectClass, tdClass, thClass } from '@/components/ui/styles'
import Toggle from '@/components/ui/Toggle'
import ViewToggle from '@/components/ui/ViewToggle'
import { STOCK_UNITS, type ID, type Ingredient, type IngredientUsage, type LocalizedText, type StockUnit } from '@/domain/types'
import { errorMessage, useLocalize, useT } from '@/i18n'
import { baseUnitOf, convertPrice, sameScale, unitSize } from '@/domain/units'
import { countUnit, formatMoney, formatNumber, formatUnit } from '@/lib/format'
import { confirmDialog, showToast } from '@/lib/swal'
import { setWarehouseView, useSettings } from '@/store/settingsStore'
import { COOK_YIELD_BASE } from '@/domain/yieldNorm'
import ConsumableBadge from './ConsumableBadge'
import GroupHeading from './GroupHeading'
import { compareIngredients, groupSections, sortGroups } from './groupSections'
import IngredientGroupsModal from './IngredientGroupsModal'
import UnitChangeWarning from './UnitChangeWarning'
import { cookOf, cookValid, normError, normOf, normRow, type NormDraft } from './normDraft'
import YieldNormEditor from './YieldNormEditor'

/**
 * `packSize` — qadoq hajmi asosiy birlikda (faqat raqamlar; bo'sh — qadoqsiz). `price` — kiritilgan narx (faqat
 * raqamlar; bo'sh — narxsiz), `priceSize` — u qaysi hisob birligi uchun kiritilgan (asosiy birlikda: 1 kg = 1000).
 */
type Draft = {
  name: LocalizedText
  /** guruh id'si; yangi mahsulotda bo'sh — ro'yxatdagi birinchi guruh */
  group: ID
  unit: StockUnit
  packSize: string
  price: string
  priceSize: number
  consumable: boolean
  active: boolean
  /** norma (faqat admin o'zgartiradi): namuna va chiqadiganlar; `null` — normasiz */
  norm: NormDraft
  /** pishganda chiqishi — 1000 g dan necha g (faqat raqamlar; bo'sh — pishmaydi) */
  cook: string
}

/** Mahsulotning normasi formaga: chiqadiganlarning pishganda chiqishi — ularning o'z yozuvidan. */
const normDraftOf = (ingredient: Ingredient, all: Ingredient[]): NormDraft =>
  ingredient.yieldNorm && {
    qty: String(ingredient.yieldNorm.qty),
    rows: ingredient.yieldNorm.outputs.map((output) =>
      normRow(output.ingredientId, String(output.qty), String(all.find((i) => i.id === output.ingredientId)?.cookYield ?? '')),
    ),
  }

/** Maydondagi qadoq hajmi: bo'sh yoki 0 — qadoqsiz. */
const packOf = (draft: Draft): number | null => (Number(draft.packSize) > 0 ? Number(draft.packSize) : null)

/** Mahsulot biror joyda sonlari bilan turibdimi — hech qayerda bo'lmasa birlik ogohlantirishsiz o'zgaradi. */
const isUsed = (usage: IngredientUsage): boolean =>
  usage.products.length > 0 || usage.stock.length > 0 || usage.purchases + usage.transfers + usage.pendingPurchases > 0

/**
 * Ombor mahsulotini qo'shish / tahrirlash oynasi: nomlar 3 tilda, guruh, birlik (tahrirda — faqat admin), qadoq hajmi
 * (600 g lik ketchup — kirim va qoldiq donada), 1 birlik (qadoqli — 1 dona) narxi (admin ham, ta'minotchi ham — 2026-11-15;
 * har kirimda kirim narxiga yangilanadi). Qadoq hajmi o'zgarsa narx yangi birlikka o'zi o'giriladi (28 000 / kg →
 * 16 800 / dona) — kiritilgan narxdan, oraliq qiymatlardan emas (yozilayotgan "6" → "60" → "600" yaxlitlashni yig'masin).
 *
 * Birlik tahrirda kg / l ↔ dona o'zgarsa — narx bo'shaydi (28 000 / kg dan "28 / dona" ma'nosiz), saqlashda mahsulot
 * ishlatilgan bo'lsa avval ogohlantirish oynasi (`UnitChangeWarning`): sonlar o'zgarmaydi, qayerlarni qayta tekshirish
 * kerakligi ko'rsatiladi, "Birlikni o'zgartirish" bosilgach saqlanadi. kg ↔ l — sonlar to'g'ri, ogohlantirishsiz.
 */
function IngredientForm({ ingredient, onClose }: { ingredient: Ingredient | null; onClose: () => void }) {
  const t = useT()
  const localize = useLocalize()
  const isAdmin = useCurrentUser()?.role === 'admin'
  const allIngredients = useIngredients().data ?? []
  const groups = sortGroups(useIngredientGroups().data ?? [])
  const [saving, setSaving] = useState(false)
  /** ishlatilgan mahsulot birligi o'zgarayotganda — ogohlantirish (bu paytda forma yashirinadi, kiritilgani saqlanadi) */
  const [warning, setWarning] = useState<IngredientUsage | null>(null)
  const [draft, setDraft] = useState<Draft>(
    ingredient
      ? {
          name: ingredient.name,
          group: ingredient.group,
          unit: ingredient.unit,
          packSize: ingredient.packSize !== null ? String(ingredient.packSize) : '',
          price: ingredient.lastPrice !== null ? String(ingredient.lastPrice) : '',
          priceSize: unitSize(ingredient.unit, ingredient.packSize),
          consumable: ingredient.consumable,
          active: ingredient.active,
          norm: normDraftOf(ingredient, allIngredients),
          cook: ingredient.cookYield !== null ? String(ingredient.cookYield) : '',
        }
      : {
          name: { uz: '', ru: '', en: '' },
          group: '',
          unit: 'kg',
          packSize: '',
          price: '',
          priceSize: unitSize('kg'),
          consumable: false,
          active: true,
          norm: null,
          cook: '',
        },
  )
  const setName = (lang: keyof LocalizedText, value: string) => setDraft({ ...draft, name: { ...draft.name, [lang]: value } })
  /** tanlangan guruh; yangi mahsulotda (yoki guruh shu payt o'chirilgan bo'lsa) — ro'yxatdagi birinchisi */
  const group = groups.some((g) => g.id === draft.group) ? draft.group : (groups[0]?.id ?? draft.group)
  const size = unitSize(draft.unit, packOf(draft))
  /** hozirgi birlikdagi narx (ko'rsatiladi va yuboriladi) */
  const price = draft.price === '' ? '' : String(convertPrice(Number(draft.price), draft.priceSize, size))
  const count = countUnit({ unit: draft.unit, packSize: packOf(draft) }, t)
  /** shu mahsulot boshqa mahsulot normasidan chiqadi (go'sht — tovuqdan) — o'zining normasi bo'lmaydi */
  const source = ingredient ? allIngredients.find((i) => i.yieldNorm?.outputs.some((output) => output.ingredientId === ingredient.id)) : undefined
  /** o'zining "pishganda chiqishi" — kg / l da, normasiz mahsulotda (butun tovuq omborga tushmaydi) */
  const cookable = draft.unit !== 'pcs' && draft.norm === null
  const ownCook = cookable ? cookOf(draft.cook) : null

  /** chiqadiganlarning pishganda chiqishi — ularning o'z yozuviga saqlanadi (o'zgarganlari) */
  const outputCooks = (): { output: Ingredient; cook: number | null }[] =>
    (draft.norm?.rows ?? []).flatMap((row) => {
      const output = allIngredients.find((i) => i.id === row.ingredientId)
      if (!output || !sameScale(output.unit, 'kg')) return []
      const cook = cookOf(row.cook)
      return cook === output.cookYield ? [] : [{ output, cook }]
    })

  const submit = async () => {
    setSaving(true)
    try {
      const { name, unit, active, consumable } = draft
      // admin ham, ta'minotchi ham (2026-11-15); bo'sh — narxsiz
      const lastPrice = price === '' ? null : Number(price)
      // 0 — serverda `invalid_qty` (bo'sh — qadoqsiz)
      const packSize = draft.packSize === '' ? null : Number(draft.packSize)
      // norma va pishganda chiqishi — faqat admin (ta'minotchi yubormaydi — o'zgarmaydi)
      if (isAdmin) {
        for (const { output, cook } of outputCooks()) {
          const { id, name, group, unit, active, packSize } = output
          await api.ingredients.save({ id, name, group, unit, active, packSize, cookYield: cook })
        }
      }
      const extra = isAdmin ? { yieldNorm: normOf(draft.norm), cookYield: ownCook } : {}
      await api.ingredients.save({ id: ingredient?.id, name, group, unit, active, consumable, packSize, lastPrice, ...extra })
      showToast(t.common.saved)
      onClose()
    } catch (error) {
      showToast(errorMessage(error), 'error')
      setSaving(false)
    }
  }

  /**
   * Pishganda chiqishi yo'qdan bor (yoki aksincha) bo'layotgan mahsulot retseptlarda bo'lsa — retseptdagi son ma'nosi
   * o'zgaradi (xom ↔ pishgan): tasdiq so'raladi. `false` — bekor qilindi.
   */
  const confirmCookChanges = async (): Promise<boolean> => {
    const changes = [
      ...(ingredient && (ownCook === null) !== (ingredient.cookYield === null) ? [{ output: ingredient, cook: ownCook }] : []),
      ...outputCooks().filter(({ output, cook }) => (cook === null) !== (output.cookYield === null)),
    ]
    for (const { output, cook } of changes) {
      const usage = await api.ingredients.usage(output.id)
      if (usage.products.length === 0) continue
      const products = usage.products.map((p) => localize(p.name)).join(', ')
      const text = cook === null ? t.ingredients.cookWarnOff(localize(output.name), products) : t.ingredients.cookWarnOn(localize(output.name), products)
      if (!(await confirmDialog(t.ingredients.cookWarnTitle, text, t.common.save))) return false
    }
    return true
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (isAdmin) {
      const error = normError(draft.norm, draft.unit, (id) => allIngredients.find((i) => i.id === id)?.unit)
      if (error) {
        showToast(t.ingredients.normErrors[error], 'error')
        return
      }
      if (!cookValid(ownCook) || outputCooks().some(({ cook }) => !cookValid(cook))) {
        showToast(t.ingredients.cookInvalid, 'error')
        return
      }
      setSaving(true)
      try {
        const confirmed = await confirmCookChanges()
        setSaving(false)
        if (!confirmed) return
      } catch (error) {
        showToast(errorMessage(error), 'error')
        setSaving(false)
        return
      }
    }
    if (ingredient && !sameScale(ingredient.unit, draft.unit)) {
      setSaving(true)
      try {
        // har safar serverdan — retsept / qoldiq hozirgisi bo'lsin
        const usage = await api.ingredients.usage(ingredient.id)
        if (isUsed(usage)) {
          setWarning(usage)
          setSaving(false)
          return
        }
      } catch (error) {
        showToast(errorMessage(error), 'error')
        setSaving(false)
        return
      }
    }
    await submit()
  }

  /**
   * Birlik: yangi mahsulotda — kiritilgan narx o'zgarmaydi (birlikni tuzatish). Tahrirda kg / l ↔ dona — narx bo'shaydi
   * (eski birlikdagi narx yangisiga o'tmaydi), asl birlikka (yoki kg ↔ l) qaytilsa — asl narx; kg ↔ l — narx qoladi.
   */
  const changeUnit = (unit: StockUnit) => {
    // kg / l ↔ dona: normadagi chiqishlar endi boshqa o'lchamda — norma o'chadi (server ham shunday qiladi)
    const norm = sameScale(unit, draft.unit) ? draft.norm : null
    if (!ingredient || sameScale(unit, draft.unit)) setDraft({ ...draft, unit, norm, price, priceSize: unitSize(unit, packOf(draft)) })
    else if (sameScale(unit, ingredient.unit)) {
      const original = ingredient.lastPrice !== null ? String(ingredient.lastPrice) : ''
      setDraft({ ...draft, unit, norm, price: original, priceSize: unitSize(ingredient.unit, ingredient.packSize) })
    } else setDraft({ ...draft, unit, norm, price: '', priceSize: unitSize(unit, packOf(draft)) })
  }

  /** faqat hech qayerda ishlatilmagan mahsulot (aks holda server `in_use` — faolsizlantirish kerak) */
  const remove = async (current: Ingredient) => {
    if (!(await confirmDialog(t.ingredients.deleteTitle, `${localize(current.name)}. ${t.ingredients.deleteText}`, t.common.delete))) return
    try {
      await api.ingredients.remove(current.id)
      onClose()
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  if (ingredient && warning) {
    return (
      <UnitChangeWarning
        ingredient={ingredient}
        next={{ unit: draft.unit, packSize: packOf(draft) }}
        priceEmpty={price === ''}
        usage={warning}
        saving={saving}
        onConfirm={() => void submit()}
        onCancel={() => setWarning(null)}
      />
    )
  }

  return (
    <Modal
      title={ingredient ? t.ingredients.edit : t.ingredients.add}
      onClose={onClose}
      size="lg"
      footer={<FormFooter formId="ingredient-form" saving={saving} onDelete={ingredient ? () => void remove(ingredient) : undefined} />}
    >
      {/* eniga keng, past (POS monitori): 3 tildagi nom bir qatorda; guruh · birlik · qadoq · narx */}
      <form id="ingredient-form" onSubmit={(event) => void save(event)} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t.common.nameUz} htmlFor="ing-uz">
            <input id="ing-uz" autoFocus value={draft.name.uz} onChange={(event) => setName('uz', event.target.value)} className={inputClass} />
          </Field>
          <Field label={t.common.nameRu} htmlFor="ing-ru">
            <input id="ing-ru" value={draft.name.ru} onChange={(event) => setName('ru', event.target.value)} className={inputClass} />
          </Field>
          <Field label={t.common.nameEn} htmlFor="ing-en">
            <input id="ing-en" value={draft.name.en} onChange={(event) => setName('en', event.target.value)} className={inputClass} />
          </Field>
        </div>
        <div className="grid items-start gap-3 sm:grid-cols-4">
          <Field label={t.ingredients.group} htmlFor="ing-group">
            <select id="ing-group" value={group} onChange={(event) => setDraft({ ...draft, group: event.target.value })} className={selectClass}>
              {groups.map((option) => (
                <option key={option.id} value={option.id}>
                  {localize(option.name)}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={t.ingredients.unit}
            htmlFor="ing-unit"
            hint={ingredient ? (isAdmin ? t.ingredients.unitHint : t.ingredients.unitAdminOnly) : undefined}
          >
            <select
              id="ing-unit"
              value={draft.unit}
              disabled={!!ingredient && !isAdmin}
              onChange={(event) => changeUnit(event.target.value as StockUnit)}
              className={selectClass}
            >
              {STOCK_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {t.units[unit]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.ingredients.packSize(draft.unit === 'pcs' ? t.units.packOfPcs : t.units.pack)} htmlFor="ing-pack" hint={t.ingredients.packSizeHint}>
            <div className="relative">
              <input
                id="ing-pack"
                value={draft.packSize === '' ? '' : formatNumber(Number(draft.packSize))}
                onChange={(event) => setDraft({ ...draft, packSize: event.target.value.replace(/\D/g, '').slice(0, 7) })}
                inputMode="numeric"
                placeholder="—"
                className={`${inputClass} pr-12 text-right font-bold tabular-nums`}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-neutral-400">{t.units[baseUnitOf(draft.unit)]}</span>
            </div>
          </Field>
          <Field label={t.ingredients.price(count)} htmlFor="ing-price" hint={t.ingredients.priceHint}>
            <input
              id="ing-price"
              value={price === '' ? '' : formatNumber(Number(price))}
              onChange={(event) => setDraft({ ...draft, price: event.target.value.replace(/\D/g, '').slice(0, 9), priceSize: size })}
              inputMode="numeric"
              placeholder="—"
              className={`${inputClass} text-right font-bold tabular-nums`}
            />
          </Field>
        </div>
        {/* "Faol" yonida — sarf materiali (salfetka, yuvish vositalari): izohi o'ngda, oyna balandligi o'smasin */}
        <div className="flex flex-wrap items-start gap-x-6 gap-y-2">
          <Toggle checked={draft.active} onChange={(active) => setDraft({ ...draft, active })} label={t.common.active} />
          <div className="min-w-0 flex-1">
            <Toggle checked={draft.consumable} onChange={(consumable) => setDraft({ ...draft, consumable })} label={t.ingredients.consumable} />
            <p className="mt-0.5 pl-10 text-xs text-neutral-500">{t.ingredients.consumableHint}</p>
          </div>
          {/* pishganda chiqishi (1000 g → 655 g) — kg / l da; ta'minotchi faqat ko'radi */}
          {cookable && (isAdmin || draft.cook !== '') && (
            <div className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
                {t.ingredients.cook}: {formatNumber(COOK_YIELD_BASE)} {t.units[baseUnitOf(draft.unit)]} →
                <input
                  value={draft.cook}
                  onChange={(event) => setDraft({ ...draft, cook: event.target.value.replace(/\D/g, '').slice(0, 5) })}
                  disabled={!isAdmin}
                  inputMode="numeric"
                  placeholder="—"
                  aria-label={t.ingredients.cook}
                  className={`${inputClass} h-9! w-20! text-right font-bold tabular-nums ${cookValid(ownCook) ? '' : 'border-red-400'}`}
                />
                {t.units[baseUnitOf(draft.unit)]}
              </span>
              <p className="mt-0.5 text-xs text-neutral-500">{t.ingredients.cookHint}</p>
            </div>
          )}
        </div>
        {/* norma: 64 kg tovuq → 34,5 kg go'sht + 5 kg qanot (kirimda chiqqanlari omborga); boshqa normadan chiqadigan
            mahsulotda (go'sht) — qayerdan kelishi */}
        {source ? (
          <p className="text-xs text-neutral-500">{t.ingredients.normFrom(localize(source.name))}</p>
        ) : (
          <YieldNormEditor
            selfId={ingredient?.id}
            name={localize(draft.name)}
            unit={draft.unit}
            price={price === '' ? null : Number(price)}
            priceSize={size}
            value={draft.norm}
            onChange={(norm) => setDraft({ ...draft, norm })}
            ingredients={allIngredients}
            readOnly={!isAdmin}
          />
        )}
      </form>
    </Modal>
  )
}

/** ixcham jadval katagi — kartochkadagidan pastroq qatorlar */
const cellClass = `${tdClass} py-1.5!`

/** "3 ta taomda" — taomlar (retseptlar) ro'yxati faqat adminga ochiq, shuning uchun faqat admin uchun chiziladi. */
function RecipeUsage({ ingredientId }: { ingredientId: ID }) {
  const t = useT()
  const products = useProducts().data ?? []
  return t.ingredients.usedIn(products.filter((p) => p.recipe.some((line) => line.ingredientId === ingredientId)).length)
}

/** Nom ostida: "Kirimda → Go'sht, Qanot" (norma) va / yoki "pishganda 65,5%"; ikkalasi ham yo'q — hech narsa. */
function YieldNote({ ingredient, all, className = '' }: { ingredient: Ingredient; all: Ingredient[]; className?: string }) {
  const t = useT()
  const localize = useLocalize()
  const nameOf = (id: ID) => {
    const found = all.find((i) => i.id === id)
    return found ? localize(found.name) : id
  }
  const parts = [
    ingredient.yieldNorm && t.ingredients.normInto(ingredient.yieldNorm.outputs.map((output) => nameOf(output.ingredientId)).join(', ')),
    ingredient.cookYield !== null && t.ingredients.cookShort(`${formatNumber(ingredient.cookYield / 10, 1)}%`),
  ].filter(Boolean)
  if (parts.length === 0) return null
  return <span className={`text-xs font-semibold text-emerald-700 ${className}`}>{parts.join(' · ')}</span>
}

const iconButton = 'btn-icon inline-flex h-8 w-8 shrink-0 items-center justify-center rounded'

/**
 * Guruh ichida ↑ / ↓ (faqat admin, 2026-11-24) — «Qoldiqlar» va tanlash ro'yxati ham shu tartibda. Guruh chetida va
 * qidiruv yozilganda ([locked]) o'chiq: qidiruvda ko'ringan qo'shni guruhdagi haqiqiy qo'shni bo'lmasligi mumkin.
 */
function MoveButtons({ id, first, last, locked }: { id: ID; first: boolean; last: boolean; locked: boolean }) {
  const t = useT()
  const move = async (direction: -1 | 1) => {
    try {
      await api.ingredients.move(id, direction)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }
  return (
    <>
      <button type="button" disabled={locked || first} onClick={() => void move(-1)} aria-label={t.common.up} title={t.common.up} className={iconButton}>
        <ChevronUp size={14} />
      </button>
      <button type="button" disabled={locked || last} onClick={() => void move(1)} aria-label={t.common.down} title={t.common.down} className={iconButton}>
        <ChevronDown size={14} />
      </button>
    </>
  )
}

/**
 * Ombor mahsulotlari ro'yxati (kartochkalar yoki ixcham jadval — ko'rinish shu qurilmada saqlanadi): retseptlar va
 * kirimlarda ishlatiladi. Ta'minotchi ham, admin ham qo'sha oladi; "Retseptlarda" va ↑ / ↓ — faqat admin.
 */
export default function IngredientsPage() {
  const t = useT()
  const localize = useLocalize()
  const isAdmin = useCurrentUser()?.role === 'admin'
  const ingredients = useIngredients()
  const groupsQuery = useIngredientGroups()
  const view = useSettings().warehouseView
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Ingredient | 'new' | null>(null)
  /** guruhlar oynasi — faqat admin (2026-11-23) */
  const [groupsOpen, setGroupsOpen] = useState(false)
  const search = query.trim().toLowerCase()
  const loadError = (!ingredients.data && ingredients.error) || (!groupsQuery.data && groupsQuery.error)

  const list = (ingredients.data ?? [])
    .filter((i) => !search || Object.values(i.name).some((name) => name.toLowerCase().includes(search)))
    .sort(compareIngredients)
  const sections = groupSections(groupsQuery.data ?? [], list, (i) => i.group)
  /** ↑ / ↓ tugmalari — faqat admin; qidiruv yozilganda o'chiq */
  const moveButtons = (items: Ingredient[], index: number) =>
    isAdmin && <MoveButtons id={items[index].id} first={index === 0} last={index === items.length - 1} locked={!!search} />

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.ingredients.title}
        description={t.ingredients.hint}
        actions={
          <>
            {isAdmin && (
              <button type="button" onClick={() => setGroupsOpen(true)} className="btn-ghost flex h-10 items-center gap-2 rounded px-4 text-xs font-bold">
                <Layers size={16} />
                {t.groups.button}
              </button>
            )}
            <button type="button" onClick={() => setEditing('new')} className="btn-primary flex h-10 items-center gap-2 rounded px-4 text-xs font-bold">
              <Plus size={16} />
              {t.ingredients.add}
            </button>
          </>
        }
      />
      <Card className="flex flex-wrap items-center justify-between gap-3 p-3">
        <label className="relative block w-full max-w-md">
          <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.stock.search} className={`${inputClass} pl-9`} />
        </label>
        <ViewToggle value={view} onChange={setWarehouseView} />
      </Card>

      {loadError ? (
        <Card className="p-4">
          <EmptyState icon={PackageSearch} title={errorMessage(loadError)} />
        </Card>
      ) : view === 'list' && sections.length > 0 ? (
        // bitta jadval, guruhlar — sarlavha qatorlari: ustunlar hamma guruhda bir tekis
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200">
                <tr>
                  <th className={thClass}>{t.stock.name}</th>
                  <th className={thClass}>{t.ingredients.unit}</th>
                  <th className={`${thClass} text-right`}>{t.purchase.lastPrice}</th>
                  {isAdmin && <th className={thClass}>{t.ingredients.recipes}</th>}
                  <th className={thClass} />
                </tr>
              </thead>
              {sections.map((section) => (
                <tbody key={section.group.id} className="divide-y divide-neutral-100 border-b border-neutral-200 last:border-b-0">
                  <tr className="bg-neutral-50">
                    <td colSpan={isAdmin ? 5 : 4} className="px-3 py-1.5">
                      <GroupHeading group={section.group} count={section.items.length} compact />
                    </td>
                  </tr>
                  {section.items.map((ingredient, index) => (
                    <tr key={ingredient.id} className={ingredient.active ? '' : 'opacity-50'}>
                      <td className={cellClass}>
                        <span className="font-semibold text-neutral-950">{localize(ingredient.name)}</span>
                        {ingredient.consumable && <ConsumableBadge />}
                        <span className="ml-2 text-xs text-neutral-400">{[ingredient.name.ru, ingredient.name.en].filter(Boolean).join(' · ')}</span>
                        <YieldNote ingredient={ingredient} all={ingredients.data ?? []} className="ml-2" />
                      </td>
                      <td className={`${cellClass} whitespace-nowrap text-neutral-600`}>{formatUnit(ingredient, t)}</td>
                      <td className={`${cellClass} text-right font-bold text-neutral-950 tabular-nums`}>{ingredient.lastPrice !== null ? formatMoney(ingredient.lastPrice, t) : '—'}</td>
                      {isAdmin && (
                        <td className={`${cellClass} text-neutral-500`}>
                          <RecipeUsage ingredientId={ingredient.id} />
                        </td>
                      )}
                      <td className={`${cellClass} text-right`}>
                        <div className="inline-flex gap-1">
                          {moveButtons(section.items, index)}
                          <button type="button" onClick={() => setEditing(ingredient)} aria-label={t.common.edit} title={t.common.edit} className={iconButton}>
                            <Pencil size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </Card>
      ) : (
        // guruhlar bo'yicha kartochkalar to'ri
        sections.map((section) => (
          <section key={section.group.id} className="space-y-2.5">
            <GroupHeading group={section.group} count={section.items.length} />
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
              {section.items.map((ingredient, index) => (
                <div key={ingredient.id} className={`flex flex-col gap-2 rounded-card bg-surface p-3.5 shadow-card dark:ring-1 dark:ring-line ${ingredient.active ? '' : 'opacity-50'}`}>
                  <div>
                    <p className="leading-snug font-semibold text-neutral-950">
                      {localize(ingredient.name)}
                      {ingredient.consumable && <ConsumableBadge />}
                    </p>
                    <p className="text-xs text-neutral-400">{[ingredient.name.ru, ingredient.name.en].filter(Boolean).join(' · ')}</p>
                    <YieldNote ingredient={ingredient} all={ingredients.data ?? []} className="block" />
                  </div>
                  {/* oxirgi narx ombor birligi uchun: "128 000 so'm / kg", qadoqli — "16 800 so'm / dona (600 g)";
                      sig'masa birlik keyingi qatorga tushadi (narx ham, birlik ham o'zi bo'linmaydi) */}
                  <p className="mt-auto text-lg font-extrabold text-neutral-950 tabular-nums" title={t.purchase.lastPrice}>
                    <span className="whitespace-nowrap">{ingredient.lastPrice !== null ? formatMoney(ingredient.lastPrice, t) : '—'}</span>{' '}
                    <span className="text-xs font-semibold whitespace-nowrap text-neutral-500">/ {formatUnit(ingredient, t)}</span>
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    {/* ta'minotchida bo'sh — tahrirlash tugmasi o'ngda qoladi */}
                    <p className="min-w-0 text-xs text-neutral-500">{isAdmin && <RecipeUsage ingredientId={ingredient.id} />}</p>
                    <div className="flex shrink-0 gap-1">
                      {moveButtons(section.items, index)}
                      <button type="button" onClick={() => setEditing(ingredient)} aria-label={t.common.edit} title={t.common.edit} className={iconButton}>
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
      {editing && <IngredientForm ingredient={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {groupsOpen && <IngredientGroupsModal onClose={() => setGroupsOpen(false)} />}
    </div>
  )
}

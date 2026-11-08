import { PackageSearch, Pencil, Plus, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api } from '@/api'
import { useIngredients, useProducts } from '@/api/queries'
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
import {
  INGREDIENT_GROUPS,
  STOCK_UNITS,
  type ID,
  type Ingredient,
  type IngredientGroup,
  type IngredientUsage,
  type LocalizedText,
  type StockUnit,
} from '@/domain/types'
import { errorMessage, useLocalize, useT } from '@/i18n'
import { baseUnitOf, convertPrice, sameScale, unitSize } from '@/domain/units'
import { countUnit, formatMoney, formatNumber, formatUnit } from '@/lib/format'
import { confirmDialog, showToast } from '@/lib/swal'
import { setWarehouseView, useSettings } from '@/store/settingsStore'
import GroupHeading from './GroupHeading'
import UnitChangeWarning from './UnitChangeWarning'

/**
 * `packSize` — qadoq hajmi asosiy birlikda (faqat raqamlar; bo'sh — qadoqsiz). `price` — kiritilgan narx (faqat
 * raqamlar; bo'sh — narxsiz), `priceSize` — u qaysi hisob birligi uchun kiritilgan (asosiy birlikda: 1 kg = 1000).
 */
type Draft = {
  name: LocalizedText
  group: IngredientGroup
  unit: StockUnit
  packSize: string
  price: string
  priceSize: number
  active: boolean
}

/** Maydondagi qadoq hajmi: bo'sh yoki 0 — qadoqsiz. */
const packOf = (draft: Draft): number | null => (Number(draft.packSize) > 0 ? Number(draft.packSize) : null)

/** Mahsulot biror joyda sonlari bilan turibdimi — hech qayerda bo'lmasa birlik ogohlantirishsiz o'zgaradi. */
const isUsed = (usage: IngredientUsage): boolean =>
  usage.products.length > 0 || usage.stock.length > 0 || usage.purchases + usage.transfers + usage.pendingPurchases > 0

/**
 * Ombor mahsulotini qo'shish / tahrirlash oynasi: nomlar 3 tilda, guruh, birlik (tahrirda — faqat admin), qadoq hajmi
 * (600 g lik ketchup — kirim va qoldiq donada), 1 birlik (qadoqli — 1 dona) narxi (bu yerda faqat admin; ta'minotchi
 * ko'radi — u narxni kirimda yozadi, oxirgi narx shunga yangilanadi). Qadoq hajmi o'zgarsa narx yangi birlikka o'zi o'giriladi (28 000 / kg →
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
          active: ingredient.active,
        }
      : { name: { uz: '', ru: '', en: '' }, group: 'vegetables', unit: 'kg', packSize: '', price: '', priceSize: unitSize('kg'), active: true },
  )
  const setName = (lang: keyof LocalizedText, value: string) => setDraft({ ...draft, name: { ...draft.name, [lang]: value } })
  const size = unitSize(draft.unit, packOf(draft))
  /** hozirgi birlikdagi narx (ko'rsatiladi va yuboriladi) */
  const price = draft.price === '' ? '' : String(convertPrice(Number(draft.price), draft.priceSize, size))
  const count = countUnit({ unit: draft.unit, packSize: packOf(draft) }, t)

  const submit = async () => {
    setSaving(true)
    try {
      const { name, group, unit, active } = draft
      // ta'minotchi narxni o'zgartirmaydi — yuborilmaydi (qadoq hajmi o'zgarsa server o'zi qayta hisoblaydi)
      const lastPrice = isAdmin ? (price === '' ? null : Number(price)) : undefined
      // 0 — serverda `invalid_qty` (bo'sh — qadoqsiz)
      const packSize = draft.packSize === '' ? null : Number(draft.packSize)
      await api.ingredients.save({ id: ingredient?.id, name, group, unit, active, packSize, lastPrice })
      showToast(t.common.saved)
      onClose()
    } catch (error) {
      showToast(errorMessage(error), 'error')
      setSaving(false)
    }
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
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
    if (!ingredient || sameScale(unit, draft.unit)) setDraft({ ...draft, unit, price, priceSize: unitSize(unit, packOf(draft)) })
    else if (sameScale(unit, ingredient.unit)) {
      const original = ingredient.lastPrice !== null ? String(ingredient.lastPrice) : ''
      setDraft({ ...draft, unit, price: original, priceSize: unitSize(ingredient.unit, ingredient.packSize) })
    } else setDraft({ ...draft, unit, price: '', priceSize: unitSize(unit, packOf(draft)) })
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
            <select id="ing-group" value={draft.group} onChange={(event) => setDraft({ ...draft, group: event.target.value as IngredientGroup })} className={selectClass}>
              {INGREDIENT_GROUPS.map((group) => (
                <option key={group} value={group}>
                  {t.stock.groups[group]}
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
          <Field label={t.ingredients.price(count)} htmlFor="ing-price" hint={isAdmin ? t.ingredients.priceHint : t.ingredients.priceAdminOnly}>
            <input
              id="ing-price"
              value={price === '' ? '' : formatNumber(Number(price))}
              onChange={(event) => setDraft({ ...draft, price: event.target.value.replace(/\D/g, '').slice(0, 9), priceSize: size })}
              disabled={!isAdmin}
              inputMode="numeric"
              placeholder="—"
              className={`${inputClass} text-right font-bold tabular-nums`}
            />
          </Field>
        </div>
        <Toggle checked={draft.active} onChange={(active) => setDraft({ ...draft, active })} label={t.common.active} />
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

/**
 * Ombor mahsulotlari ro'yxati (kartochkalar yoki ixcham jadval — ko'rinish shu qurilmada saqlanadi): retseptlar va
 * kirimlarda ishlatiladi. Ta'minotchi ham, admin ham qo'sha oladi; "Retseptlarda" — faqat admin ko'radi.
 */
export default function IngredientsPage() {
  const t = useT()
  const localize = useLocalize()
  const isAdmin = useCurrentUser()?.role === 'admin'
  const ingredients = useIngredients()
  const view = useSettings().warehouseView
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Ingredient | 'new' | null>(null)
  const search = query.trim().toLowerCase()

  const list = (ingredients.data ?? [])
    .filter((i) => !search || Object.values(i.name).some((name) => name.toLowerCase().includes(search)))
    .sort((a, b) => localize(a.name).localeCompare(localize(b.name)))
  const sections = INGREDIENT_GROUPS.map((group) => ({ group, items: list.filter((i) => i.group === group) })).filter((section) => section.items.length > 0)

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.ingredients.title}
        description={t.ingredients.hint}
        actions={
          <button type="button" onClick={() => setEditing('new')} className="btn-primary flex h-10 items-center gap-2 rounded px-4 text-xs font-bold">
            <Plus size={16} />
            {t.ingredients.add}
          </button>
        }
      />
      <Card className="flex flex-wrap items-center justify-between gap-3 p-3">
        <label className="relative block w-full max-w-md">
          <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.stock.search} className={`${inputClass} pl-9`} />
        </label>
        <ViewToggle value={view} onChange={setWarehouseView} />
      </Card>

      {!ingredients.data && ingredients.error ? (
        <Card className="p-4">
          <EmptyState icon={PackageSearch} title={errorMessage(ingredients.error)} />
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
                <tbody key={section.group} className="divide-y divide-neutral-100 border-b border-neutral-200 last:border-b-0">
                  <tr className="bg-neutral-50">
                    <td colSpan={isAdmin ? 5 : 4} className="px-3 py-1.5">
                      <GroupHeading group={section.group} count={section.items.length} compact />
                    </td>
                  </tr>
                  {section.items.map((ingredient) => (
                    <tr key={ingredient.id} className={ingredient.active ? '' : 'opacity-50'}>
                      <td className={cellClass}>
                        <span className="font-semibold text-neutral-950">{localize(ingredient.name)}</span>
                        <span className="ml-2 text-xs text-neutral-400">{[ingredient.name.ru, ingredient.name.en].filter(Boolean).join(' · ')}</span>
                      </td>
                      <td className={`${cellClass} whitespace-nowrap text-neutral-600`}>{formatUnit(ingredient, t)}</td>
                      <td className={`${cellClass} text-right font-bold text-neutral-950 tabular-nums`}>{ingredient.lastPrice !== null ? formatMoney(ingredient.lastPrice, t) : '—'}</td>
                      {isAdmin && (
                        <td className={`${cellClass} text-neutral-500`}>
                          <RecipeUsage ingredientId={ingredient.id} />
                        </td>
                      )}
                      <td className={`${cellClass} text-right`}>
                        <button
                          type="button"
                          onClick={() => setEditing(ingredient)}
                          aria-label={t.common.edit}
                          title={t.common.edit}
                          className="btn-icon inline-flex h-8 w-8 items-center justify-center rounded"
                        >
                          <Pencil size={14} />
                        </button>
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
          <section key={section.group} className="space-y-2.5">
            <GroupHeading group={section.group} count={section.items.length} />
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
              {section.items.map((ingredient) => (
                <div key={ingredient.id} className={`flex flex-col gap-2 rounded-card bg-surface p-3.5 shadow-card dark:ring-1 dark:ring-line ${ingredient.active ? '' : 'opacity-50'}`}>
                  <div>
                    <p className="leading-snug font-semibold text-neutral-950">{localize(ingredient.name)}</p>
                    <p className="text-xs text-neutral-400">{[ingredient.name.ru, ingredient.name.en].filter(Boolean).join(' · ')}</p>
                  </div>
                  {/* oxirgi narx ombor birligi uchun: "128 000 so'm / kg", qadoqli — "16 800 so'm / dona (600 g)";
                      sig'masa birlik keyingi qatorga tushadi (narx ham, birlik ham o'zi bo'linmaydi) */}
                  <p className="mt-auto text-lg font-extrabold text-neutral-950 tabular-nums" title={t.purchase.lastPrice}>
                    <span className="whitespace-nowrap">{ingredient.lastPrice !== null ? formatMoney(ingredient.lastPrice, t) : '—'}</span>{' '}
                    <span className="text-xs font-semibold whitespace-nowrap text-neutral-500">/ {formatUnit(ingredient, t)}</span>
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    {/* ta'minotchida bo'sh — tahrirlash tugmasi o'ngda qoladi */}
                    <p className="text-xs text-neutral-500">{isAdmin && <RecipeUsage ingredientId={ingredient.id} />}</p>
                    <button
                      type="button"
                      onClick={() => setEditing(ingredient)}
                      aria-label={t.common.edit}
                      title={t.common.edit}
                      className="btn-icon flex h-8 w-8 shrink-0 items-center justify-center rounded"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
      {editing && <IngredientForm ingredient={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

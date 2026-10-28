import { PackageSearch, Pencil, Plus, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api } from '@/api'
import { useIngredients, useProducts } from '@/api/queries'
import { useCurrentUser } from '@/api/session'
import { Card } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import { inputClass, selectClass, tdClass, thClass } from '@/components/ui/styles'
import Toggle from '@/components/ui/Toggle'
import ViewToggle from '@/components/ui/ViewToggle'
import { INGREDIENT_GROUPS, STOCK_UNITS, type ID, type Ingredient, type IngredientGroup, type LocalizedText, type StockUnit } from '@/domain/types'
import { errorMessage, useLocalize, useT } from '@/i18n'
import { formatMoney, formatNumber } from '@/lib/format'
import { showToast } from '@/lib/swal'
import { setWarehouseView, useSettings } from '@/store/settingsStore'
import GroupHeading from './GroupHeading'

/** `price` — 1 birlik narxi, faqat raqamlar; bo'sh — narxsiz */
type Draft = { name: LocalizedText; group: IngredientGroup; unit: StockUnit; price: string; active: boolean }

/**
 * Ombor mahsulotini qo'shish / tahrirlash oynasi: nomlar 3 tilda, guruh, birlik (faqat yangi mahsulotda), 1 birlik
 * narxi (faqat admin; ta'minotchi ko'radi — narxni kirim tasdiqlashda ham admin kiritadi).
 */
function IngredientForm({ ingredient, onClose }: { ingredient: Ingredient | null; onClose: () => void }) {
  const t = useT()
  const isAdmin = useCurrentUser()?.role === 'admin'
  const [draft, setDraft] = useState<Draft>(
    ingredient
      ? {
          name: ingredient.name,
          group: ingredient.group,
          unit: ingredient.unit,
          price: ingredient.lastPrice !== null ? String(ingredient.lastPrice) : '',
          active: ingredient.active,
        }
      : { name: { uz: '', ru: '', en: '' }, group: 'vegetables', unit: 'kg', price: '', active: true },
  )
  const setName = (lang: keyof LocalizedText, value: string) => setDraft({ ...draft, name: { ...draft.name, [lang]: value } })

  const save = async (event: FormEvent) => {
    event.preventDefault()
    try {
      const { price, ...fields } = draft
      // ta'minotchi narxni o'zgartirmaydi — yuborilmaydi (o'zgarmaydi)
      const lastPrice = isAdmin ? (price === '' ? null : Number(price)) : undefined
      await api.ingredients.save({ id: ingredient?.id, ...fields, lastPrice })
      showToast(t.common.saved)
      onClose()
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  return (
    <Modal
      title={ingredient ? t.ingredients.edit : t.ingredients.add}
      onClose={onClose}
      footer={
        <button type="submit" form="ingredient-form" className="btn-primary h-11 w-full rounded text-sm font-bold">
          {t.common.save}
        </button>
      }
    >
      <form id="ingredient-form" onSubmit={(event) => void save(event)} className="space-y-3">
        <Field label={t.common.nameUz} htmlFor="ing-uz">
          <input id="ing-uz" autoFocus value={draft.name.uz} onChange={(event) => setName('uz', event.target.value)} className={inputClass} />
        </Field>
        <Field label={t.common.nameRu} htmlFor="ing-ru">
          <input id="ing-ru" value={draft.name.ru} onChange={(event) => setName('ru', event.target.value)} className={inputClass} />
        </Field>
        <Field label={t.common.nameEn} htmlFor="ing-en">
          <input id="ing-en" value={draft.name.en} onChange={(event) => setName('en', event.target.value)} className={inputClass} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t.ingredients.group} htmlFor="ing-group">
            <select id="ing-group" value={draft.group} onChange={(event) => setDraft({ ...draft, group: event.target.value as IngredientGroup })} className={selectClass}>
              {INGREDIENT_GROUPS.map((group) => (
                <option key={group} value={group}>
                  {t.stock.groups[group]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.ingredients.unit} htmlFor="ing-unit" hint={ingredient ? t.ingredients.unitLocked : undefined}>
            <select
              id="ing-unit"
              value={draft.unit}
              disabled={!!ingredient}
              onChange={(event) => setDraft({ ...draft, unit: event.target.value as StockUnit })}
              className={selectClass}
            >
              {STOCK_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {t.units[unit]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={t.ingredients.price(t.units[draft.unit])} htmlFor="ing-price" hint={isAdmin ? t.ingredients.priceHint : t.ingredients.priceAdminOnly}>
          <input
            id="ing-price"
            value={draft.price === '' ? '' : formatNumber(Number(draft.price))}
            onChange={(event) => setDraft({ ...draft, price: event.target.value.replace(/\D/g, '').slice(0, 9) })}
            disabled={!isAdmin}
            inputMode="numeric"
            placeholder="—"
            className={`${inputClass} text-right font-bold tabular-nums`}
          />
        </Field>
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
                      <td className={`${cellClass} text-neutral-600`}>{t.units[ingredient.unit]}</td>
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
                <div key={ingredient.id} className={`flex flex-col gap-2 rounded-card bg-white p-3.5 shadow-card ${ingredient.active ? '' : 'opacity-50'}`}>
                  <div>
                    <p className="leading-snug font-semibold text-neutral-950">{localize(ingredient.name)}</p>
                    <p className="text-xs text-neutral-400">{[ingredient.name.ru, ingredient.name.en].filter(Boolean).join(' · ')}</p>
                  </div>
                  {/* oxirgi narx ombor birligi uchun: "128 000 so'm / kg" */}
                  <p className="mt-auto text-lg font-extrabold whitespace-nowrap text-neutral-950 tabular-nums" title={t.purchase.lastPrice}>
                    {ingredient.lastPrice !== null ? formatMoney(ingredient.lastPrice, t) : '—'}
                    <span className="text-xs font-semibold text-neutral-500"> / {t.units[ingredient.unit]}</span>
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

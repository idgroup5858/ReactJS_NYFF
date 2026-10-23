import { Pencil, Plus, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api, useDb } from '@/api'
import { Card } from '@/components/ui/Card'
import Field from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import { inputClass, selectClass } from '@/components/ui/styles'
import Toggle from '@/components/ui/Toggle'
import { INGREDIENT_GROUPS, STOCK_UNITS, type Ingredient, type IngredientGroup, type LocalizedText, type StockUnit } from '@/domain/types'
import { errorMessage, useLocalize, useT } from '@/i18n'
import { formatMoney } from '@/lib/format'
import { showToast } from '@/lib/swal'

type Draft = { name: LocalizedText; group: IngredientGroup; unit: StockUnit; active: boolean }

/** Ombor mahsulotini qo'shish / tahrirlash oynasi: nomlar 3 tilda, guruh, birlik (faqat yangi mahsulotda). */
function IngredientForm({ ingredient, onClose }: { ingredient: Ingredient | null; onClose: () => void }) {
  const t = useT()
  const [draft, setDraft] = useState<Draft>(
    ingredient
      ? { name: ingredient.name, group: ingredient.group, unit: ingredient.unit, active: ingredient.active }
      : { name: { uz: '', ru: '', en: '' }, group: 'vegetables', unit: 'kg', active: true },
  )
  const setName = (lang: keyof LocalizedText, value: string) => setDraft({ ...draft, name: { ...draft.name, [lang]: value } })

  const save = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await api.ingredients.save({ id: ingredient?.id, ...draft })
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
        <Toggle checked={draft.active} onChange={(active) => setDraft({ ...draft, active })} label={t.common.active} />
      </form>
    </Modal>
  )
}

/** Ombor mahsulotlari ro'yxati: retseptlar va kirimlarda ishlatiladi. Ta'minotchi ham, admin ham qo'sha oladi. */
export default function IngredientsPage() {
  const t = useT()
  const db = useDb()
  const localize = useLocalize()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Ingredient | 'new' | null>(null)
  const search = query.trim().toLowerCase()

  const usage = (id: string) => db.products.filter((p) => p.recipe.some((line) => line.ingredientId === id)).length
  const list = db.ingredients
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
      <Card className="p-3">
        <label className="relative block max-w-md">
          <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.stock.search} className={`${inputClass} pl-9`} />
        </label>
      </Card>

      {/* guruhlar bo'yicha kartochkalar to'ri — uzun jadvalni aylantirib o'tirmaslik uchun */}
      {sections.map((section) => (
        <section key={section.group} className="space-y-2.5">
          <h3 className="text-[11px] font-bold tracking-[0.14em] text-neutral-500 uppercase">
            {t.stock.groups[section.group]} <span className="tabular-nums">· {section.items.length}</span>
          </h3>
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
                  <p className="text-xs text-neutral-500">{t.ingredients.usedIn(usage(ingredient.id))}</p>
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
      ))}
      {editing && <IngredientForm ingredient={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

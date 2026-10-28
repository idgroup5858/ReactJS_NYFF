import { Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api } from '@/api'
import { useBranches, useCategories, useIngredients } from '@/api/queries'
import Field from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import { inputClass, selectClass } from '@/components/ui/styles'
import Toggle from '@/components/ui/Toggle'
import { INGREDIENT_GROUPS, type ID, type LocalizedText, type Product } from '@/domain/types'
import { baseUnitOf } from '@/domain/units'
import { errorMessage, useLocalize, useT } from '@/i18n'
import { formatNumber } from '@/lib/format'
import { showToast } from '@/lib/swal'
import ImagePicker from './ImagePicker'

type RecipeDraft = { key: number; ingredientId: ID; qty: string }

let seq = 0
const recipeRow = (ingredientId: ID = '', qty = ''): RecipeDraft => ({ key: ++seq, ingredientId, qty })

/**
 * Taom qo'shish / tahrirlash: kategoriya, nomi 3 tilda, rasmi, narxi (barcha filiallarda bir xil), qaysi faol
 * filiallarda sotuvda, retsepti (mahsulot + miqdor asosiy birlikda: g / ml / dona) va faolligi — hammasi bitta
 * so'rovda saqlanadi.
 */
export default function ProductForm({ product, categoryId, onClose }: { product: Product | null; categoryId: ID; onClose: () => void }) {
  const t = useT()
  const localize = useLocalize()
  const categories = useCategories().data ?? []
  const branches = (useBranches().data ?? []).filter((b) => b.active)
  const allIngredients = useIngredients().data ?? []
  const [category, setCategory] = useState(product?.categoryId ?? categoryId)
  const [name, setName] = useState<LocalizedText>(product?.name ?? { uz: '', ru: '', en: '' })
  const [image, setImage] = useState(product?.image ?? '')
  const [active, setActive] = useState(product?.active ?? true)
  const [recipe, setRecipe] = useState<RecipeDraft[]>(() => (product ? product.recipe.map((line) => recipeRow(line.ingredientId, String(line.qty))) : [recipeRow()]))
  // faqat raqamlar; bo'sh yoki 0 — server `invalid_price` qaytaradi
  const [price, setPrice] = useState(product && product.price > 0 ? String(product.price) : '')
  // nofaol filiallar ham ro'yxatda qoladi — ular bu yerda ko'rinmaydi, lekin belgisi o'chib ketmasin
  const [unavailable, setUnavailable] = useState<ID[]>(product?.unavailableBranchIds ?? [])
  const [saving, setSaving] = useState(false)
  const ingredients = allIngredients.filter((i) => i.active || recipe.some((line) => line.ingredientId === i.id))

  const updateLine = (key: number, patch: Partial<RecipeDraft>) => setRecipe(recipe.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  const setSoldIn = (branchId: ID, sold: boolean) =>
    setUnavailable(sold ? unavailable.filter((id) => id !== branchId) : [...unavailable, branchId])

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      await api.menu.saveProduct({
        id: product?.id,
        categoryId: category,
        name,
        image,
        active,
        price: Number(price),
        unavailableBranchIds: unavailable,
        recipe: recipe.filter((line) => line.ingredientId).map((line) => ({ ingredientId: line.ingredientId, qty: Number(line.qty) })),
      })
      showToast(t.common.saved)
      onClose()
    } catch (error) {
      showToast(errorMessage(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={product ? t.admin.menu.editProduct : t.admin.menu.addProduct}
      onClose={onClose}
      size="xl"
      footer={
        <button type="submit" form="product-form" disabled={saving} className="btn-primary h-11 w-full rounded text-sm font-bold">
          {t.common.save}
        </button>
      }
    >
      <form id="product-form" onSubmit={(event) => void save(event)} className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-3">
          <Field label={t.admin.menu.category} htmlFor="prd-category">
            <select id="prd-category" value={category} onChange={(event) => setCategory(event.target.value)} className={selectClass}>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {localize(item.name)}
                </option>
              ))}
            </select>
          </Field>
          {(['uz', 'ru', 'en'] as const).map((lang) => (
            <Field key={lang} label={lang === 'uz' ? t.common.nameUz : lang === 'ru' ? t.common.nameRu : t.common.nameEn} htmlFor={`prd-${lang}`}>
              <input id={`prd-${lang}`} autoFocus={lang === 'uz'} value={name[lang]} onChange={(event) => setName({ ...name, [lang]: event.target.value })} className={inputClass} />
            </Field>
          ))}
          <Toggle checked={active} onChange={setActive} label={t.common.active} />
        </div>

        <div className="space-y-3">
          <Field label={t.common.image}>
            <ImagePicker value={image} onChange={setImage} folder="products" />
          </Field>
          <Field label={t.admin.menu.price} htmlFor="prd-price" hint={t.admin.menu.priceHint}>
            <input
              id="prd-price"
              value={price === '' ? '' : formatNumber(Number(price))}
              onChange={(event) => setPrice(event.target.value.replace(/\D/g, '').slice(0, 9))}
              inputMode="numeric"
              className={`${inputClass} text-right font-bold tabular-nums`}
            />
          </Field>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-neutral-600">{t.admin.menu.soldIn}</p>
            <p className="text-xs text-neutral-500">{t.admin.menu.soldInHint}</p>
            {branches.map((branch) => (
              <div key={branch.id}>
                <Toggle checked={!unavailable.includes(branch.id)} onChange={(sold) => setSoldIn(branch.id, sold)} label={branch.name} />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2 md:col-span-2 lg:col-span-1">
          <p className="text-xs font-semibold text-neutral-600">{t.menu.recipe}</p>
          <p className="text-xs text-neutral-500">{t.admin.menu.recipeHint}</p>
          {recipe.map((line) => {
            const ingredient = allIngredients.find((i) => i.id === line.ingredientId)
            return (
              <div key={line.key} className="flex items-center gap-2">
                <select value={line.ingredientId} onChange={(event) => updateLine(line.key, { ingredientId: event.target.value })} aria-label={t.purchase.chooseIngredient} className={`${selectClass} min-w-0 flex-1`}>
                  <option value="">{t.purchase.chooseIngredient}</option>
                  {INGREDIENT_GROUPS.map((group) => {
                    const items = ingredients.filter((i) => i.group === group)
                    return items.length === 0 ? null : (
                      <optgroup key={group} label={t.stock.groups[group]}>
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {localize(item.name)}
                          </option>
                        ))}
                      </optgroup>
                    )
                  })}
                </select>
                <label className="relative w-28 shrink-0">
                  <input
                    value={line.qty}
                    onChange={(event) => updateLine(line.key, { qty: event.target.value.replace(/\D/g, '').slice(0, 6) })}
                    inputMode="numeric"
                    aria-label={t.purchase.qty}
                    className={`${inputClass} pr-11 text-right font-bold tabular-nums`}
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-neutral-400">
                    {ingredient ? t.units[baseUnitOf(ingredient.unit)] : ''}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setRecipe(recipe.filter((item) => item.key !== line.key))}
                  aria-label={t.purchase.remove}
                  className="btn-icon-danger flex h-10 w-10 shrink-0 items-center justify-center rounded"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })}
          <button type="button" onClick={() => setRecipe([...recipe, recipeRow()])} className="btn-ghost flex h-10 w-full items-center justify-center gap-2 rounded text-xs font-bold">
            <Plus size={16} />
            {t.purchase.addLine}
          </button>
        </div>
      </form>
    </Modal>
  )
}

import { ChevronDown, ChevronUp, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { api, useDb } from '@/api'
import { Card, CardHeader } from '@/components/ui/Card'
import FoodImage from '@/components/ui/FoodImage'
import PageHeader from '@/components/ui/PageHeader'
import Toggle from '@/components/ui/Toggle'
import { branchPrice } from '@/domain/logic/orders'
import type { Category, ID, Product } from '@/domain/types'
import { errorMessage, useLocalize, useT } from '@/i18n'
import { formatMoney, formatRecipeQty } from '@/lib/format'
import { showToast } from '@/lib/swal'
import CategoryForm from './CategoryForm'
import ProductForm from './ProductForm'

const iconButton = 'btn-icon flex h-8 w-8 items-center justify-center rounded'

/**
 * Menyu boshqaruvi: chapda kategoriyalar (tartib, faollik, tahrir), o'ngda tanlangan kategoriya taomlari — retsepti,
 * filial narxlari, tartibi va faolligi. Narxlarni o'zgartirish — "Narxlar" bo'limida.
 */
export default function MenuAdminPage() {
  const t = useT()
  const db = useDb()
  const localize = useLocalize()
  const categories = [...db.categories].sort((a, b) => a.sortOrder - b.sortOrder)
  const [selectedId, setSelectedId] = useState<ID | null>(null)
  const categoryId = categories.some((c) => c.id === selectedId) ? (selectedId as ID) : (categories[0]?.id ?? '')
  const [categoryForm, setCategoryForm] = useState<Category | 'new' | null>(null)
  const [productForm, setProductForm] = useState<Product | 'new' | null>(null)
  const [openRecipe, setOpenRecipe] = useState<ID | null>(null)
  const branches = db.branches.filter((b) => b.active)

  const products = db.products.filter((p) => p.categoryId === categoryId).sort((a, b) => a.sortOrder - b.sortOrder)

  const attempt = async (action: () => Promise<unknown>) => {
    try {
      await action()
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t.admin.menu.title} description={t.admin.menu.hint} />
      <div className="grid items-start gap-5 lg:grid-cols-[310px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title={t.admin.menu.categories}
            actions={
              <button type="button" onClick={() => setCategoryForm('new')} className="btn-primary flex h-8 items-center gap-1.5 rounded px-3 text-xs font-bold">
                <Plus size={14} />
                {t.common.add}
              </button>
            }
          />
          <ul className="space-y-1.5 p-2">
            {categories.map((category, index) => {
              const count = db.products.filter((p) => p.categoryId === category.id).length
              const selected = category.id === categoryId
              return (
                <li
                  key={category.id}
                  className={`flex items-center gap-2 rounded-card border-2 p-1.5 transition-colors ${selected ? 'border-select bg-brand-50' : 'border-transparent hover:bg-neutral-50'} ${category.active ? '' : 'opacity-50'}`}
                >
                  <button type="button" onClick={() => setSelectedId(category.id)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left">
                    <FoodImage src={category.image} alt="" className="h-11 w-11 shrink-0 rounded" />
                    <span className="min-w-0">
                      <span className="block text-sm leading-tight font-bold">{localize(category.name)}</span>
                      <span className="block text-xs text-neutral-500">{t.menu.items(count)}</span>
                    </span>
                  </button>
                  <button type="button" disabled={index === 0} onClick={() => void attempt(() => api.menu.moveCategory(category.id, -1))} aria-label={t.common.up} className={iconButton}>
                    <ChevronUp size={14} />
                  </button>
                  <button type="button" disabled={index === categories.length - 1} onClick={() => void attempt(() => api.menu.moveCategory(category.id, 1))} aria-label={t.common.down} className={iconButton}>
                    <ChevronDown size={14} />
                  </button>
                  <button type="button" onClick={() => setCategoryForm(category)} aria-label={t.common.edit} className={iconButton}>
                    <Pencil size={14} />
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title={localize(categories.find((c) => c.id === categoryId)?.name ?? { uz: '', ru: '', en: '' })}
            hint={t.admin.menu.productsHint}
            actions={
              <button type="button" onClick={() => setProductForm('new')} className="btn-primary flex h-8 items-center gap-1.5 rounded px-3 text-xs font-bold">
                <Plus size={14} />
                {t.admin.menu.addProduct}
              </button>
            }
          />
          <ul className="divide-y divide-neutral-100">
            {products.map((product, index) => (
              <li key={product.id} className={product.active ? '' : 'bg-neutral-50'}>
                {/* ma'lumot va amallar — joy yetmasa amallar ostki qatorga tushadi (nom qisilmaydi) */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                  <div className="flex min-w-[15rem] flex-[1_1_15rem] items-center gap-3">
                    <FoodImage src={product.image} alt="" className={`h-14 w-14 shrink-0 rounded ${product.active ? '' : 'opacity-50 grayscale'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-neutral-950">{localize(product.name)}</p>
                      <p className="text-xs text-neutral-400">{[product.name.ru, product.name.en].filter(Boolean).join(' · ')}</p>
                      <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-neutral-600">
                        {branches.map((branch) => {
                          const price = branchPrice(db, branch.id, product.id)
                          return (
                            <span key={branch.id} className="whitespace-nowrap">
                              {branch.name}: <span className={`font-semibold tabular-nums ${price === null ? 'text-red-700' : 'text-neutral-950'}`}>{price !== null ? formatMoney(price, t) : t.menu.unavailable}</span>
                            </span>
                          )
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setOpenRecipe(openRecipe === product.id ? null : product.id)}
                      className="btn-ghost h-8 rounded px-3 text-xs font-semibold"
                      aria-expanded={openRecipe === product.id}
                    >
                      {t.menu.recipe} · {product.recipe.length}
                    </button>
                    <Toggle
                      checked={product.active}
                      hideLabel
                      label={t.common.active}
                      onChange={(active) => void attempt(() => api.menu.saveProduct({ ...product, active }))}
                    />
                    <span className="flex gap-1">
                      <button type="button" disabled={index === 0} onClick={() => void attempt(() => api.menu.moveProduct(product.id, -1))} aria-label={t.common.up} className={iconButton}>
                        <ChevronUp size={14} />
                      </button>
                      <button type="button" disabled={index === products.length - 1} onClick={() => void attempt(() => api.menu.moveProduct(product.id, 1))} aria-label={t.common.down} className={iconButton}>
                        <ChevronDown size={14} />
                      </button>
                      <button type="button" onClick={() => setProductForm(product)} aria-label={t.common.edit} className={iconButton}>
                        <Pencil size={14} />
                      </button>
                    </span>
                  </div>
                </div>
                {openRecipe === product.id && (
                  <ul className="grid gap-x-6 border-t border-neutral-100 bg-neutral-50/60 px-4 py-2 sm:grid-cols-2">
                    {product.recipe.map((line) => {
                      const ingredient = db.ingredients.find((i) => i.id === line.ingredientId)
                      if (!ingredient) return null
                      return (
                        <li key={line.ingredientId} className="flex justify-between gap-3 border-b border-dashed border-neutral-200 py-1.5 text-sm last:border-b-0">
                          <span className="text-neutral-700">{localize(ingredient.name)}</span>
                          <span className="font-semibold tabular-nums">{formatRecipeQty(line.qty, ingredient.unit, t)}</span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            ))}
            {products.length === 0 && <li className="px-4 py-10 text-center text-sm text-neutral-500">{t.admin.menu.noProducts}</li>}
          </ul>
        </Card>
      </div>

      {categoryForm && <CategoryForm category={categoryForm === 'new' ? null : categoryForm} onClose={() => setCategoryForm(null)} />}
      {productForm && <ProductForm product={productForm === 'new' ? null : productForm} categoryId={categoryId} onClose={() => setProductForm(null)} />}
    </div>
  )
}

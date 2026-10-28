import { ChevronDown, ChevronUp, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { api, type ProductInput } from '@/api'
import { useBranches, useCategories, useIngredients, useProducts } from '@/api/queries'
import { Card, CardHeader } from '@/components/ui/Card'
import FoodImage from '@/components/ui/FoodImage'
import PageHeader from '@/components/ui/PageHeader'
import Toggle from '@/components/ui/Toggle'
import type { Category, ID, Product } from '@/domain/types'
import { errorMessage, useLocalize, useT } from '@/i18n'
import { formatMoney, formatRecipeQty } from '@/lib/format'
import { showToast } from '@/lib/swal'
import CategoryForm from './CategoryForm'
import ProductForm from './ProductForm'

const iconButton = 'btn-icon flex h-8 w-8 items-center justify-center rounded'

/** Taomni ro'yxatdan turib bitta maydonini o'zgartirib saqlash (qolgani — o'sha holicha). */
const productInput = (product: Product, patch: Partial<ProductInput>): ProductInput => ({
  id: product.id,
  categoryId: product.categoryId,
  name: product.name,
  image: product.image,
  recipe: product.recipe,
  price: product.price,
  unavailableBranchIds: product.unavailableBranchIds,
  active: product.active,
  ...patch,
})

/**
 * Menyu boshqaruvi: chapda kategoriyalar (tartib, faollik, tahrir), o'ngda tanlangan kategoriya taomlari — narxi
 * (barcha filiallarda bir xil), retsepti, tartibi va faolligi. Har bir faol filial uchun tugmacha — taomni shu
 * filialda vaqtincha sotuvdan olish.
 */
export default function MenuAdminPage() {
  const t = useT()
  const localize = useLocalize()
  const categoriesQuery = useCategories()
  const productsQuery = useProducts()
  const branches = (useBranches().data ?? []).filter((b) => b.active)
  const ingredients = useIngredients().data ?? []
  const allProducts = productsQuery.data ?? []
  const categories = [...(categoriesQuery.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
  const [selectedId, setSelectedId] = useState<ID | null>(null)
  const categoryId = categories.some((c) => c.id === selectedId) ? (selectedId as ID) : (categories[0]?.id ?? '')
  const [categoryForm, setCategoryForm] = useState<Category | 'new' | null>(null)
  const [productForm, setProductForm] = useState<Product | 'new' | null>(null)
  const [openRecipe, setOpenRecipe] = useState<ID | null>(null)
  // yuklanguncha bo'sh ro'yxat o'rnida "taom yo'q" chiqmasin; yuklab bo'lmasa — xato matni
  const loaded = categoriesQuery.data !== undefined && productsQuery.data !== undefined
  const loadError = (!categoriesQuery.data && categoriesQuery.error) || (!productsQuery.data && productsQuery.error)

  const products = allProducts.filter((p) => p.categoryId === categoryId).sort((a, b) => a.sortOrder - b.sortOrder)

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
              const count = allProducts.filter((p) => p.categoryId === category.id).length
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
              <button type="button" disabled={!categoryId} onClick={() => setProductForm('new')} className="btn-primary flex h-8 items-center gap-1.5 rounded px-3 text-xs font-bold">
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
                      <p className="mt-1 text-sm font-bold text-neutral-950 tabular-nums">{formatMoney(product.price, t)}</p>
                    </div>
                  </div>
                  <div className="ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
                    {/* filialda vaqtincha sotuvdan olish — har faol filialga bittadan */}
                    <span className="mr-2 flex flex-wrap gap-x-5 gap-y-2">
                      {branches.map((branch) => {
                        const others = product.unavailableBranchIds.filter((id) => id !== branch.id)
                        return (
                          <Toggle
                            key={branch.id}
                            checked={!product.unavailableBranchIds.includes(branch.id)}
                            label={branch.name}
                            onChange={(sold) =>
                              void attempt(() => api.menu.saveProduct(productInput(product, { unavailableBranchIds: sold ? others : [...others, branch.id] })))
                            }
                          />
                        )
                      })}
                    </span>
                    {/* qolgan amallar birga — joy yetmasa filial tugmachalaridan keyin butunligicha keyingi qatorga o'tadi */}
                    <span className="flex items-center gap-3">
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
                        onChange={(active) => void attempt(() => api.menu.saveProduct(productInput(product, { active })))}
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
                    </span>
                  </div>
                </div>
                {openRecipe === product.id && (
                  <ul className="grid gap-x-6 border-t border-neutral-100 bg-neutral-50/60 px-4 py-2 sm:grid-cols-2">
                    {product.recipe.map((line) => {
                      const ingredient = ingredients.find((i) => i.id === line.ingredientId)
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
            {products.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-neutral-500">{loadError ? errorMessage(loadError) : loaded ? t.admin.menu.noProducts : '\u00a0'}</li>
            )}
          </ul>
        </Card>
      </div>

      {categoryForm && <CategoryForm category={categoryForm === 'new' ? null : categoryForm} onClose={() => setCategoryForm(null)} />}
      {productForm && <ProductForm product={productForm === 'new' ? null : productForm} categoryId={categoryId} onClose={() => setProductForm(null)} />}
    </div>
  )
}

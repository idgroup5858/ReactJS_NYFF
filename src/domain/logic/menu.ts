import { fail } from '../errors.ts'
import { newId } from '../ids.ts'
import type { BranchPrice, Category, Db, ID, LocalizedText, Product, RecipeLine } from '../types.ts'
import { findOrFail, replaceById, type Mutation } from './common.ts'

/** O'zbekcha nom majburiy; ruscha / inglizcha bo'sh qolsa ekranda o'zbekchasi ko'rinadi. */
function cleanName(name: LocalizedText): LocalizedText {
  const clean = { uz: name.uz.trim(), ru: name.ru.trim(), en: name.en.trim() }
  if (!clean.uz) fail('name_required')
  return clean
}

export interface CategoryInput {
  id?: ID
  name: LocalizedText
  image: string
  /** ikonka manzili; bo'sh satr — ikonkasiz */
  icon: string
  active: boolean
}

export function saveCategory(db: Db, input: CategoryInput): Mutation<Category> {
  const fields = { name: cleanName(input.name), image: input.image.trim(), icon: input.icon.trim(), active: input.active }
  if (input.id) {
    const category: Category = { ...findOrFail(db.categories, input.id, 'category'), ...fields }
    return { db: { ...db, categories: replaceById(db.categories, category) }, result: category }
  }
  const sortOrder = Math.max(0, ...db.categories.map((c) => c.sortOrder)) + 1
  const category: Category = { id: newId('cat'), ...fields, sortOrder }
  return { db: { ...db, categories: [...db.categories, category] }, result: category }
}

export interface ProductInput {
  id?: ID
  categoryId: ID
  name: LocalizedText
  image: string
  recipe: RecipeLine[]
  active: boolean
}

/** Taom: retseptda kamida bitta mahsulot bo'lishi shart (sotuvda ombordan nima ayrilishi aniq bo'lsin). */
export function saveProduct(db: Db, input: ProductInput): Mutation<Product> {
  const name = cleanName(input.name)
  findOrFail(db.categories, input.categoryId, 'category')
  const merged = new Map<ID, number>()
  for (const line of input.recipe) {
    findOrFail(db.ingredients, line.ingredientId, 'ingredient')
    if (!Number.isInteger(line.qty) || line.qty < 1) fail('invalid_qty', line.ingredientId)
    merged.set(line.ingredientId, (merged.get(line.ingredientId) ?? 0) + line.qty)
  }
  if (merged.size === 0) fail('recipe_required')
  const recipe = [...merged].map(([ingredientId, qty]) => ({ ingredientId, qty }))
  const fields = { categoryId: input.categoryId, name, image: input.image.trim(), recipe, active: input.active }

  if (input.id) {
    const product: Product = { ...findOrFail(db.products, input.id, 'product'), ...fields }
    return { db: { ...db, products: replaceById(db.products, product) }, result: product }
  }
  const sortOrder = Math.max(0, ...db.products.map((p) => p.sortOrder)) + 1
  const product: Product = { id: newId('prd'), ...fields, sortOrder }
  return { db: { ...db, products: [...db.products, product] }, result: product }
}

/** [siblings] ichida [id] ni qo'shnisi bilan almashtiradi; chetda bo'lsa o'zgarmaydi. */
function swapSortOrder<T extends { id: ID; sortOrder: number }>(items: T[], siblings: T[], id: ID, direction: -1 | 1): T[] {
  const sorted = [...siblings].sort((a, b) => a.sortOrder - b.sortOrder)
  const index = sorted.findIndex((item) => item.id === id)
  const target = sorted[index]
  const other = sorted[index + direction]
  if (!target || !other) return items
  return items.map((item) => {
    if (item.id === target.id) return { ...item, sortOrder: other.sortOrder }
    if (item.id === other.id) return { ...item, sortOrder: target.sortOrder }
    return item
  })
}

/** Kategoriyani bir pog'ona yuqoriga (-1) yoki pastga (+1) — kassa va kioskda shu tartibda chiqadi. */
export function moveCategory(db: Db, id: ID, direction: -1 | 1): Mutation<null> {
  findOrFail(db.categories, id, 'category')
  return { db: { ...db, categories: swapSortOrder(db.categories, db.categories, id, direction) }, result: null }
}

/** Taom faqat o'z kategoriyasi ichida suriladi. */
export function moveProduct(db: Db, id: ID, direction: -1 | 1): Mutation<null> {
  const product = findOrFail(db.products, id, 'product')
  const siblings = db.products.filter((p) => p.categoryId === product.categoryId)
  return { db: { ...db, products: swapSortOrder(db.products, siblings, id, direction) }, result: null }
}

export interface PriceInput {
  branchId: ID
  productId: ID
  /** `null` — narx o'chiriladi: taom shu filialda umuman sotilmaydi */
  price: number | null
  available: boolean
}

/** Filial narxi: yozuv bo'lmasa qo'shiladi, `price = null` bo'lsa o'chiriladi. */
export function setBranchPrice(db: Db, input: PriceInput): Mutation<BranchPrice | null> {
  findOrFail(db.branches, input.branchId, 'branch')
  findOrFail(db.products, input.productId, 'product')
  const rest = db.prices.filter((p) => !(p.branchId === input.branchId && p.productId === input.productId))
  if (input.price === null) return { db: { ...db, prices: rest }, result: null }
  if (!Number.isInteger(input.price) || input.price <= 0) fail('invalid_price')
  const price: BranchPrice = { branchId: input.branchId, productId: input.productId, price: input.price, available: input.available }
  return { db: { ...db, prices: [...rest, price] }, result: price }
}

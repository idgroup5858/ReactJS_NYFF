import { OTHER_GROUP, type ID, type Ingredient, type IngredientGroup } from '@/domain/types'

export type GroupSection<T> = { group: IngredientGroup; items: T[] }

/** Guruhlar sahifadagi tartibda (`sortOrder` — admin suradi). */
export const sortGroups = (groups: IngredientGroup[]): IngredientGroup[] => [...groups].sort((a, b) => a.sortOrder - b.sortOrder)

/** Mahsulotlar guruh ichida admin surgan tartibda: `sortOrder`, teng bo'lsa — `id` (server ham shunday saralaydi). */
export const compareIngredients = (a: Ingredient, b: Ingredient): number =>
  a.sortOrder - b.sortOrder || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/**
 * Guruhlar tartibida bo'limlar, bo'shlari tashlanadi. Ro'yxatda yo'q guruhdagi mahsulot (bo'lmasligi kerak — server
 * guruhni bog'lab saqlaydi; guruh shu payt o'chirilgan bo'lishi mumkin) — "Boshqa" ga.
 */
export function groupSections<T>(groups: IngredientGroup[], items: T[], groupOf: (item: T) => ID): GroupSection<T>[] {
  const sorted = sortGroups(groups)
  const known = new Set(sorted.map((group) => group.id))
  const idOf = (item: T) => (known.has(groupOf(item)) ? groupOf(item) : OTHER_GROUP)
  return sorted.map((group) => ({ group, items: items.filter((item) => idOf(item) === group.id) })).filter((section) => section.items.length > 0)
}

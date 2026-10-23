import type { Category } from '@/domain/types'

/** Kategoriya ikonkalari (public/images/icons — Microsoft Fluent Emoji 3D, MIT). Admin shu to'plamdan tanlaydi. */
export const CATEGORY_ICONS = [
  'hamburger',
  'hot-dog',
  'burrito',
  'stuffed-flatbread',
  'falafel',
  'french-fries',
  'poultry-leg',
  'fried-shrimp',
  'pizza',
  'sandwich',
  'taco',
  'cut-of-meat',
  'bacon',
  'hot-pepper',
  'green-salad',
  'cooked-rice',
  'bento-box',
  'croissant',
  'pancakes',
  'popcorn',
  'doughnut',
  'cookie',
  'shortcake',
  'soft-ice-cream',
  'cup-with-straw',
  'beverage-box',
  'bubble-tea',
  'hot-beverage',
].map((name) => `/images/icons/${name}.png`)

/** Boshlang'ich kategoriyalarning ikonkasi — ikonka maydoni qo'shilishidan oldin saqlangan bazalar uchun ham. */
const DEFAULT_ICONS: Record<string, string> = {
  burgers: 'hamburger',
  hotdogs: 'hot-dog',
  lavash: 'burrito',
  shawarma: 'stuffed-flatbread',
  snacks: 'french-fries',
  drinks: 'cup-with-straw',
}

/** Kategoriya ikonkasi; yo'q bo'lsa `null` (unda rasmi ko'rsatiladi). */
export function categoryIcon(category: Category): string | null {
  if (category.icon !== undefined) return category.icon || null
  const name = DEFAULT_ICONS[category.id]
  return name ? `/images/icons/${name}.png` : null
}

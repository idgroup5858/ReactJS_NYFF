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

/** Kategoriya ikonkasi; bo'sh satr — ikonkasiz, `null` (unda rasmi ko'rsatiladi). */
export function categoryIcon(category: Pick<Category, 'icon'>): string | null {
  return category.icon || null
}

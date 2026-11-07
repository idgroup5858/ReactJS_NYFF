import type { IngredientGroup } from '@/domain/types'

/** Ombor guruhlari ikonkasi (public/images/icons — Microsoft Fluent Emoji 3D, MIT): qoldiq va mahsulotlar sahifasida. */
export const GROUP_ICONS: Record<IngredientGroup, string> = {
  bread: '/images/icons/bread.png',
  meat: '/images/icons/cut-of-meat.png',
  vegetables: '/images/icons/tomato.png',
  sauces: '/images/icons/canned-food.png',
  drinks: '/images/icons/cup-with-straw.png',
  coffee: '/images/icons/hot-beverage.png',
  cleaning: '/images/icons/sponge.png',
  other: '/images/icons/basket.png',
}

import type { IngredientGroup } from '@/domain/types'

/** Ombor guruhlari ikonkasi (public/images/icons — Microsoft Fluent Emoji 3D, MIT): qoldiq va mahsulotlar sahifasida. */
export const GROUP_ICONS: Record<IngredientGroup, string> = {
  bread: '/images/icons/bread.png',
  meat: '/images/icons/cut-of-meat.png',
  seafood: '/images/icons/shrimp.png',
  dairy: '/images/icons/cheese-wedge.png',
  vegetables: '/images/icons/tomato.png',
  fruits: '/images/icons/lemon.png',
  frozen: '/images/icons/ice.png',
  sauces: '/images/icons/canned-food.png',
  grocery: '/images/icons/salt.png',
  sweets: '/images/icons/chocolate-bar.png',
  drinks: '/images/icons/cup-with-straw.png',
  coffee: '/images/icons/hot-beverage.png',
  packaging: '/images/icons/takeout-box.png',
  cleaning: '/images/icons/sponge.png',
  other: '/images/icons/basket.png',
}

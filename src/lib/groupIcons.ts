import { CATEGORY_ICONS } from './categoryIcons'

/**
 * Ombor guruhi ikonkalari (public/images/icons — Microsoft Fluent Emoji 3D, MIT): admin guruh oynasida shulardan
 * tanlaydi. Avval ombor mavzusidagilar (2026-11-23 gacha qattiq yozilgan 8 ta guruhniki va olib tashlangan guruhlarniki
 * — sut, shirinlik, muzlatilgan, meva, bakaleya, dengiz, qadoq), keyin menyu ikonkalari.
 */
const WAREHOUSE_ICONS = [
  'bread',
  'cut-of-meat',
  'tomato',
  'canned-food',
  'cup-with-straw',
  'hot-beverage',
  'sponge',
  'basket',
  'cheese-wedge',
  'chocolate-bar',
  'ice',
  'lemon',
  'salt',
  'shrimp',
  'takeout-box',
].map((name) => `/images/icons/${name}.png`)

export const GROUP_ICONS = [...WAREHOUSE_ICONS, ...CATEGORY_ICONS.filter((icon) => !WAREHOUSE_ICONS.includes(icon))]

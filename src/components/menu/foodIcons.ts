import {
  Beef,
  CakeSlice,
  Coffee,
  Cookie,
  Croissant,
  CupSoda,
  Donut,
  Drumstick,
  Flame,
  Ham,
  Hamburger,
  IceCreamCone,
  Milk,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  Shrimp,
  Soup,
  Utensils,
  createLucideIcon,
  type LucideIcon,
} from 'lucide-react'

// lucide'da yo'q taomlar — o'sha uslubda (24×24, chiziqli)
export const HotDog = createLucideIcon('hot-dog', [
  ['rect', { x: '2', y: '10', width: '20', height: '4', rx: '2', key: 'sausage' }],
  ['path', { d: 'M5 10c0-1.7 1.3-3 3-3h8c1.7 0 3 1.3 3 3', key: 'bun-top' }],
  ['path', { d: 'M5 14c0 1.7 1.3 3 3 3h8c1.7 0 3-1.3 3-3', key: 'bun-bottom' }],
])

export const Wrap = createLucideIcon('wrap', [
  ['rect', { x: '2.5', y: '8.5', width: '19', height: '7', rx: '3.5', transform: 'rotate(-45 12 12)', key: 'roll' }],
  ['path', { d: 'M15.6 6.4a2 2 0 0 1 2 2', key: 'curl' }],
  ['path', { d: 'M9.5 14.5 7 17', key: 'fold' }],
])

export const Shawarma = createLucideIcon('shawarma', [
  ['path', { d: 'M7 5h10l-3.5 16h-3z', key: 'cone' }],
  ['path', { d: 'M8.4 11h7.2', key: 'paper' }],
  ['path', { d: 'M7 5c1-1.5 2.3-1.5 3.3 0 1-1.5 2.4-1.5 3.4 0 1-1.5 2.3-1.5 3.3 0', key: 'filling' }],
])

export const Fries = createLucideIcon('fries', [
  ['path', { d: 'M5 10h14l-2 11H7z', key: 'box' }],
  ['path', { d: 'M8 10 7 3', key: 'f1' }],
  ['path', { d: 'M11 10V2', key: 'f2' }],
  ['path', { d: 'M14 10l1-7', key: 'f3' }],
  ['path', { d: 'M17 10l2-5', key: 'f4' }],
])

/** 3D ikonka nomi (public/images/icons/<nom>.png) → shu taomning chiziqli ikonkasi. Admin bitta ikonka tanlaydi. */
export const LINE_ICONS: Record<string, LucideIcon> = {
  hamburger: Hamburger,
  'hot-dog': HotDog,
  burrito: Wrap,
  'stuffed-flatbread': Shawarma,
  falafel: Salad,
  'french-fries': Fries,
  'poultry-leg': Drumstick,
  'fried-shrimp': Shrimp,
  pizza: Pizza,
  sandwich: Sandwich,
  taco: Wrap,
  'cut-of-meat': Beef,
  bacon: Ham,
  'hot-pepper': Flame,
  'green-salad': Salad,
  'cooked-rice': Soup,
  'bento-box': Utensils,
  croissant: Croissant,
  pancakes: CakeSlice,
  popcorn: Popcorn,
  doughnut: Donut,
  cookie: Cookie,
  shortcake: CakeSlice,
  'soft-ice-cream': IceCreamCone,
  'cup-with-straw': CupSoda,
  'beverage-box': Milk,
  'bubble-tea': CupSoda,
  'hot-beverage': Coffee,
}

/** Ikonka manzilidan chiziqli ikonka; topilmasa — umumiy "idish-tovoq". */
export function lineIconFor(iconPath: string | null): LucideIcon {
  const name = iconPath?.match(/([^/]+)\.png$/)?.[1]
  return (name && LINE_ICONS[name]) || Utensils
}

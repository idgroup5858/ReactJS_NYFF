import type {
  Branch,
  BranchPrice,
  Category,
  Db,
  Ingredient,
  IngredientGroup,
  LocalizedText,
  Product,
  StockItem,
  StockUnit,
  User,
  Warehouse,
} from '../domain/types.ts'
import { toBase } from '../domain/units.ts'
import { seedActivity } from './history.ts'

/** Sxema o'zgarsa oshiriladi — localStorage dagi eski baza tashlanib, shu boshlang'ich ma'lumot yoziladi. */
export const DB_VERSION = 2

const t = (uz: string, ru: string, en: string): LocalizedText => ({ uz, ru, en })

// ───────────────────────── Tashkilot ─────────────────────────

export const BRANCH_CHILONZOR = 'br_chilonzor'
export const BRANCH_YUNUSOBOD = 'br_yunusobod'
export const WAREHOUSE_CENTRAL = 'wh_central'

const BRANCHES: Omit<Branch, 'createdAt'>[] = [
  { id: BRANCH_CHILONZOR, name: 'Chilonzor', address: "Toshkent, Chilonzor tumani, Bunyodkor ko'chasi 12", phone: '+998 71 200 11 22', active: true },
  { id: BRANCH_YUNUSOBOD, name: 'Yunusobod', address: "Toshkent, Yunusobod tumani, Amir Temur ko'chasi 108", phone: '+998 71 200 33 44', active: true },
]

const WAREHOUSES: Warehouse[] = [
  { id: WAREHOUSE_CENTRAL, name: 'Markaziy ombor', kind: 'central', branchId: null },
  { id: 'wh_chilonzor', name: 'Chilonzor ombori', kind: 'branch', branchId: BRANCH_CHILONZOR },
  { id: 'wh_yunusobod', name: 'Yunusobod ombori', kind: 'branch', branchId: BRANCH_YUNUSOBOD },
]

const USERS: Omit<User, 'createdAt' | 'active'>[] = [
  { id: 'usr_admin', name: 'Admin', role: 'admin', branchId: null, pin: '0000' },
  { id: 'usr_supplier', name: 'Bekzod', role: 'supplier', branchId: null, pin: '5555' },
  { id: 'usr_cashier_c1', name: 'Dilnoza', role: 'cashier', branchId: BRANCH_CHILONZOR, pin: '1234' },
  { id: 'usr_cashier_c2', name: 'Sardor', role: 'cashier', branchId: BRANCH_CHILONZOR, pin: '4321' },
  { id: 'usr_kitchen_c', name: 'Oshxona (Chilonzor)', role: 'kitchen', branchId: BRANCH_CHILONZOR, pin: '1111' },
  { id: 'usr_cashier_y1', name: 'Malika', role: 'cashier', branchId: BRANCH_YUNUSOBOD, pin: '1234' },
  { id: 'usr_cashier_y2', name: 'Jasur', role: 'cashier', branchId: BRANCH_YUNUSOBOD, pin: '4321' },
  { id: 'usr_kitchen_y', name: 'Oshxona (Yunusobod)', role: 'kitchen', branchId: BRANCH_YUNUSOBOD, pin: '1111' },
]

// ───────────────────────── Ombor mahsulotlari ─────────────────────────

/**
 * id, nom, ombor birligi, oxirgi narx (1 kg / l / dona), markaziy ombordagi qoldiq, har bir filialdagi qoldiq,
 * filial uchun ogohlantirish chegarasi — hammasi ombor birligida. Markaziy ombor chegarasi filialnikidan 4 barobar.
 */
type IngredientRow = [id: string, name: LocalizedText, unit: StockUnit, price: number, central: number, branch: number, min: number]

const INGREDIENT_GROUPS: [IngredientGroup, IngredientRow[]][] = [
  ['bread', [
    ['bun-burger', t('Burger noni', 'Булочка для бургера', 'Burger bun'), 'pcs', 2500, 600, 120, 40],
    ['bun-hotdog', t('Hot-dog noni', 'Булочка для хот-дога', 'Hot dog bun'), 'pcs', 1800, 500, 100, 30],
    ['bun-french', t('Fransuzcha hot-dog noni', 'Булочка для французского хот-дога', 'French hot dog bun'), 'pcs', 2500, 300, 60, 20],
    ['lavash-bread', t('Lavash', 'Лаваш', 'Lavash flatbread'), 'pcs', 2000, 600, 150, 40],
    ['pita', t('Pita noni', 'Пита', 'Pita bread'), 'pcs', 2200, 400, 100, 30],
  ]],
  ['meat', [
    ['beef-mince', t("Mol go'shti qiymasi", 'Говяжий фарш', 'Ground beef'), 'kg', 115000, 80, 20, 6],
    ['beef-meat', t("Mol go'shti (shaurma uchun)", 'Говядина для шаурмы', 'Beef for shawarma'), 'kg', 125000, 90, 25, 8],
    ['chicken-fillet', t('Tovuq filesi', 'Куриное филе', 'Chicken fillet'), 'kg', 52000, 100, 25, 8],
    ['sausage', t('Sosiska', 'Сосиска', 'Sausage'), 'pcs', 3500, 600, 120, 40],
    ['sausage-big', t('Katta sosiska', 'Большая сосиска', 'Jumbo sausage'), 'pcs', 6000, 300, 60, 20],
    ['egg', t('Tuxum', 'Яйцо', 'Egg'), 'pcs', 1500, 360, 90, 30],
  ]],
  ['dairy', [
    ['cheddar', t('Pishloq (chedder)', 'Сыр чеддер', 'Cheddar cheese'), 'kg', 140000, 30, 6, 2],
    ['mozzarella', t('Mozzarella', 'Моцарелла', 'Mozzarella'), 'kg', 120000, 25, 5, 2],
  ]],
  ['vegetables', [
    ['tomato', t('Pomidor', 'Помидоры', 'Tomatoes'), 'kg', 14000, 120, 25, 8],
    ['cucumber', t('Bodring', 'Огурцы', 'Cucumbers'), 'kg', 12000, 100, 20, 6],
    ['pickles', t('Tuzlangan bodring', 'Маринованные огурцы', 'Pickles'), 'kg', 30000, 40, 8, 3],
    ['onion', t('Piyoz', 'Лук', 'Onion'), 'kg', 5000, 80, 15, 5],
    ['lettuce', t('Salat bargi', 'Листья салата', 'Lettuce'), 'kg', 35000, 20, 4, 1.5],
    ['cabbage', t('Karam', 'Капуста', 'Cabbage'), 'kg', 6000, 60, 12, 4],
    ['korean-carrot', t('Koreyscha sabzi', 'Морковь по-корейски', 'Korean carrot salad'), 'kg', 25000, 40, 8, 3],
    ['kimchi', t('Kimchi', 'Кимчи', 'Kimchi'), 'kg', 60000, 20, 4, 1.5],
    ['jalapeno', t('Jalapeno qalampiri', 'Перец халапеньо', 'Jalapeño peppers'), 'kg', 70000, 10, 2, 0.8],
  ]],
  ['frozen', [
    ['potato-fries', t('Kartoshka fri (muzlatilgan)', 'Картофель фри (замороженный)', 'French fries (frozen)'), 'kg', 32000, 200, 40, 12],
    ['potato-wedges', t('Dehqoncha kartoshka (muzlatilgan)', 'Картофель по-деревенски (замороженный)', 'Potato wedges (frozen)'), 'kg', 36000, 120, 25, 8],
    ['onion-rings-frozen', t('Piyoz halqalari (muzlatilgan)', 'Луковые кольца (замороженные)', 'Onion rings (frozen)'), 'kg', 55000, 60, 12, 4],
    ['nuggets', t('Tovuq naggetsi (muzlatilgan)', 'Куриные наггетсы (замороженные)', 'Chicken nuggets (frozen)'), 'pcs', 1200, 1500, 300, 90],
  ]],
  ['sauces', [
    ['ketchup', t('Ketchup', 'Кетчуп', 'Ketchup'), 'kg', 28000, 60, 12, 4],
    ['mayo', t('Mayonez', 'Майонез', 'Mayonnaise'), 'kg', 30000, 60, 12, 4],
    ['mustard', t('Gorchitsa', 'Горчица', 'Mustard'), 'kg', 35000, 15, 3, 1],
    ['garlic-sauce', t('Sarimsoqli sous', 'Чесночный соус', 'Garlic sauce'), 'kg', 40000, 40, 8, 3],
    ['spicy-sauce', t('Achchiq sous', 'Острый соус', 'Hot sauce'), 'kg', 45000, 20, 4, 1.5],
    ['cheese-sauce', t('Pishloqli sous', 'Сырный соус', 'Cheese sauce'), 'kg', 55000, 25, 5, 2],
    ['bbq-sauce', t('BBQ sousi', 'Соус барбекю', 'BBQ sauce'), 'kg', 50000, 20, 4, 1.5],
    ['burger-sauce', t('Burger sousi', 'Бургер-соус', 'Burger sauce'), 'kg', 48000, 30, 6, 2],
  ]],
  ['drinks', [
    ['cola-05', t('Coca-Cola 0,5 l', 'Coca-Cola 0,5 л', 'Coca-Cola 0.5 L'), 'pcs', 6000, 960, 192, 48],
    ['fanta-05', t('Fanta 0,5 l', 'Fanta 0,5 л', 'Fanta 0.5 L'), 'pcs', 6000, 720, 144, 48],
    ['sprite-05', t('Sprite 0,5 l', 'Sprite 0,5 л', 'Sprite 0.5 L'), 'pcs', 6000, 720, 144, 48],
    ['water-05', t('Suv 0,5 l', 'Вода 0,5 л', 'Water 0.5 L'), 'pcs', 2500, 960, 192, 48],
    ['tea-bag', t('Choy (paketcha)', 'Чай (пакетик)', 'Tea bag'), 'pcs', 300, 2000, 400, 100],
  ]],
  ['other', [
    ['frying-oil', t("Fritur yog'i", 'Фритюрное масло', 'Frying oil'), 'l', 22000, 200, 40, 12],
    ['spices', t('Ziravorlar', 'Специи', 'Spices'), 'kg', 80000, 10, 2, 0.5],
    ['sugar', t('Shakar', 'Сахар', 'Sugar'), 'kg', 13000, 50, 10, 3],
  ]],
  ['packaging', [
    ['box-burger', t('Burger qutisi', 'Коробка для бургера', 'Burger box'), 'pcs', 1200, 3000, 600, 150],
    ['wrap-paper', t("O'rash qog'ozi", 'Упаковочная бумага', 'Wrapping paper'), 'pcs', 300, 5000, 1000, 250],
    ['box-fries', t('Fri qutisi', 'Коробка для фри', 'Fries box'), 'pcs', 800, 3000, 600, 150],
    ['cup-paper', t("Qog'oz stakan", 'Бумажный стакан', 'Paper cup'), 'pcs', 600, 2000, 400, 100],
    ['napkin', t('Salfetka', 'Салфетка', 'Napkin'), 'pcs', 50, 20000, 4000, 1000],
  ]],
]

const INGREDIENTS: IngredientRow[] = INGREDIENT_GROUPS.flatMap(([, rows]) => rows)

/** Ogohlantirishlar ko'rinishi uchun ataylab kam qoldirilgan mahsulotlar (ombor birligida). */
const LOW_STOCK: Record<string, Record<string, number>> = {
  wh_chilonzor: { cheddar: 1.5, kimchi: 0.9, 'cola-05': 30 },
  wh_yunusobod: { 'bun-hotdog': 22, napkin: 600, lettuce: 1 },
  [WAREHOUSE_CENTRAL]: { kimchi: 5 },
}

// ───────────────────────── Menyu ─────────────────────────

const CATEGORIES: [id: string, name: LocalizedText][] = [
  ['burgers', t('Burgerlar', 'Бургеры', 'Burgers')],
  ['hotdogs', t('Hot-doglar', 'Хот-доги', 'Hot dogs')],
  ['lavash', t('Lavashlar', 'Лаваш', 'Lavash')],
  ['shawarma', t('Shaurmalar', 'Шаурма', 'Shawarma')],
  ['snacks', t('Gazaklar', 'Закуски', 'Snacks')],
  ['drinks', t('Ichimliklar', 'Напитки', 'Drinks')],
]

/** Retsept: [ombor mahsuloti, miqdor asosiy birlikda — g / ml / dona]. */
type RecipeRow = [ingredientId: string, qty: number][]
type ProductRow = [id: string, categoryId: string, name: LocalizedText, price: number, recipe: RecipeRow]

const PRODUCTS: ProductRow[] = [
  ['burger-classic', 'burgers', t('Klassik burger', 'Классический бургер', 'Classic burger'), 32000, [
    ['bun-burger', 1], ['beef-mince', 120], ['tomato', 30], ['lettuce', 15], ['onion', 15], ['pickles', 15],
    ['burger-sauce', 25], ['ketchup', 10], ['box-burger', 1], ['napkin', 2],
  ]],
  ['burger-cheese', 'burgers', t('Chizburger', 'Чизбургер', 'Cheeseburger'), 36000, [
    ['bun-burger', 1], ['beef-mince', 120], ['cheddar', 30], ['tomato', 25], ['lettuce', 10], ['onion', 15],
    ['pickles', 15], ['burger-sauce', 20], ['ketchup', 10], ['mustard', 5], ['box-burger', 1], ['napkin', 2],
  ]],
  ['burger-double', 'burgers', t('Double burger', 'Двойной бургер', 'Double burger'), 48000, [
    ['bun-burger', 1], ['beef-mince', 240], ['cheddar', 40], ['tomato', 30], ['lettuce', 15], ['onion', 20],
    ['pickles', 20], ['burger-sauce', 30], ['ketchup', 10], ['box-burger', 1], ['napkin', 2],
  ]],
  ['burger-chicken', 'burgers', t('Chicken burger', 'Чикенбургер', 'Chicken burger'), 34000, [
    ['bun-burger', 1], ['chicken-fillet', 130], ['cheddar', 20], ['lettuce', 15], ['tomato', 25], ['mayo', 25],
    ['frying-oil', 30], ['spices', 3], ['box-burger', 1], ['napkin', 2],
  ]],
  ['burger-big-ny', 'burgers', t('Big New York', 'Биг Нью-Йорк', 'Big New York'), 55000, [
    ['bun-burger', 1], ['beef-mince', 240], ['cheddar', 40], ['egg', 1], ['onion-rings-frozen', 40], ['tomato', 30],
    ['lettuce', 15], ['pickles', 20], ['bbq-sauce', 30], ['burger-sauce', 20], ['frying-oil', 20], ['box-burger', 1],
    ['napkin', 3],
  ]],

  ['hotdog-classic', 'hotdogs', t('Klassik hot-dog', 'Классический хот-дог', 'Classic hot dog'), 18000, [
    ['bun-hotdog', 1], ['sausage', 1], ['ketchup', 20], ['mustard', 10], ['onion', 15], ['pickles', 15],
    ['wrap-paper', 1], ['napkin', 2],
  ]],
  ['hotdog-french', 'hotdogs', t('Fransuzcha hot-dog', 'Французский хот-дог', 'French hot dog'), 20000, [
    ['bun-french', 1], ['sausage', 1], ['cheese-sauce', 25], ['ketchup', 15], ['mayo', 10], ['wrap-paper', 1],
    ['napkin', 2],
  ]],
  ['hotdog-kimchi', 'hotdogs', t('Kimchi hot-dog', 'Хот-дог с кимчи', 'Kimchi hot dog'), 24000, [
    ['bun-hotdog', 1], ['sausage', 1], ['kimchi', 40], ['spicy-sauce', 15], ['mayo', 15], ['onion', 10],
    ['wrap-paper', 1], ['napkin', 2],
  ]],
  ['hotdog-big', 'hotdogs', t('Katta hot-dog', 'Большой хот-дог', 'Big hot dog'), 26000, [
    ['bun-hotdog', 1], ['sausage-big', 1], ['cheddar', 20], ['cucumber', 20], ['tomato', 20], ['korean-carrot', 20],
    ['ketchup', 20], ['mayo', 20], ['wrap-paper', 1], ['napkin', 2],
  ]],

  ['lavash-beef', 'lavash', t("Go'shtli lavash", 'Лаваш с говядиной', 'Beef lavash'), 32000, [
    ['lavash-bread', 1], ['beef-meat', 150], ['tomato', 40], ['cucumber', 30], ['cabbage', 30], ['potato-fries', 50],
    ['ketchup', 20], ['mayo', 25], ['garlic-sauce', 20], ['frying-oil', 15], ['spices', 3], ['wrap-paper', 1],
    ['napkin', 2],
  ]],
  ['lavash-chicken', 'lavash', t('Tovuqli lavash', 'Лаваш с курицей', 'Chicken lavash'), 30000, [
    ['lavash-bread', 1], ['chicken-fillet', 150], ['tomato', 40], ['cucumber', 30], ['cabbage', 30],
    ['potato-fries', 50], ['mayo', 25], ['garlic-sauce', 25], ['ketchup', 15], ['frying-oil', 15], ['spices', 3],
    ['wrap-paper', 1], ['napkin', 2],
  ]],
  ['lavash-cheese', 'lavash', t('Pishloqli lavash', 'Сырный лаваш', 'Cheese lavash'), 35000, [
    ['lavash-bread', 1], ['beef-meat', 130], ['mozzarella', 50], ['cheese-sauce', 25], ['tomato', 35],
    ['cucumber', 25], ['potato-fries', 50], ['mayo', 20], ['frying-oil', 15], ['spices', 3], ['wrap-paper', 1],
    ['napkin', 2],
  ]],
  ['lavash-spicy', 'lavash', t('Achchiq lavash', 'Острый лаваш', 'Spicy lavash'), 33000, [
    ['lavash-bread', 1], ['beef-meat', 150], ['jalapeno', 25], ['spicy-sauce', 25], ['tomato', 40], ['cucumber', 30],
    ['cabbage', 30], ['potato-fries', 50], ['mayo', 20], ['frying-oil', 15], ['spices', 4], ['wrap-paper', 1],
    ['napkin', 2],
  ]],

  ['shawarma-beef', 'shawarma', t("Go'shtli shaurma", 'Шаурма с говядиной', 'Beef shawarma'), 30000, [
    ['pita', 1], ['beef-meat', 140], ['tomato', 35], ['cucumber', 30], ['korean-carrot', 30], ['onion', 15],
    ['garlic-sauce', 30], ['mayo', 15], ['spices', 3], ['wrap-paper', 1], ['napkin', 2],
  ]],
  ['shawarma-chicken', 'shawarma', t('Tovuqli shaurma', 'Шаурма с курицей', 'Chicken shawarma'), 28000, [
    ['pita', 1], ['chicken-fillet', 140], ['tomato', 35], ['cucumber', 30], ['korean-carrot', 30], ['cabbage', 25],
    ['garlic-sauce', 30], ['mayo', 15], ['spices', 3], ['wrap-paper', 1], ['napkin', 2],
  ]],
  ['shawarma-xl', 'shawarma', t('Shaurma XL', 'Шаурма XL', 'Shawarma XL'), 42000, [
    ['lavash-bread', 1], ['beef-meat', 220], ['tomato', 50], ['cucumber', 40], ['korean-carrot', 40], ['cabbage', 35],
    ['potato-fries', 60], ['garlic-sauce', 40], ['mayo', 25], ['ketchup', 20], ['frying-oil', 20], ['spices', 5],
    ['wrap-paper', 1], ['napkin', 3],
  ]],

  ['fries', 'snacks', t('Kartoshka fri', 'Картофель фри', 'French fries'), 15000, [
    ['potato-fries', 150], ['frying-oil', 40], ['spices', 2], ['ketchup', 20], ['box-fries', 1], ['napkin', 1],
  ]],
  ['potato-wedges', 'snacks', t('Dehqoncha kartoshka', 'Картофель по-деревенски', 'Potato wedges'), 17000, [
    ['potato-wedges', 180], ['frying-oil', 40], ['spices', 3], ['ketchup', 20], ['box-fries', 1], ['napkin', 1],
  ]],
  ['nuggets-6', 'snacks', t('Naggets (6 dona)', 'Наггетсы (6 шт)', 'Nuggets (6 pcs)'), 22000, [
    ['nuggets', 6], ['frying-oil', 30], ['bbq-sauce', 25], ['box-fries', 1], ['napkin', 2],
  ]],
  ['onion-rings', 'snacks', t('Piyoz halqalari', 'Луковые кольца', 'Onion rings'), 16000, [
    ['onion-rings-frozen', 120], ['frying-oil', 35], ['cheese-sauce', 25], ['box-fries', 1], ['napkin', 1],
  ]],

  ['cola', 'drinks', t('Coca-Cola 0,5 l', 'Coca-Cola 0,5 л', 'Coca-Cola 0.5 L'), 9000, [['cola-05', 1]]],
  ['fanta', 'drinks', t('Fanta 0,5 l', 'Fanta 0,5 л', 'Fanta 0.5 L'), 9000, [['fanta-05', 1]]],
  ['sprite', 'drinks', t('Sprite 0,5 l', 'Sprite 0,5 л', 'Sprite 0.5 L'), 9000, [['sprite-05', 1]]],
  ['water', 'drinks', t('Suv 0,5 l', 'Вода 0,5 л', 'Water 0.5 L'), 5000, [['water-05', 1]]],
  ['tea', 'drinks', t('Qora choy', 'Чёрный чай', 'Black tea'), 4000, [['tea-bag', 1], ['sugar', 10], ['cup-paper', 1]]],
]

/** Yunusobodda burger, lavash va shaurma 2 000 so'm qimmatroq, kimchi hot-dog esa sotilmaydi. */
function yunusobodPrice(product: ProductRow): BranchPrice {
  const [id, categoryId, , price] = product
  const premium = ['burgers', 'lavash', 'shawarma'].includes(categoryId) ? 2000 : 0
  return { branchId: BRANCH_YUNUSOBOD, productId: id, price: price + premium, available: id !== 'hotdog-kimchi' }
}

// ───────────────────────── Yig'ish ─────────────────────────

function buildStock(): StockItem[] {
  const stock: StockItem[] = []
  for (const [id, , unit, , central, branch, min] of INGREDIENTS) {
    for (const warehouse of WAREHOUSES) {
      const isCentral = warehouse.kind === 'central'
      const qty = LOW_STOCK[warehouse.id]?.[id] ?? (isCentral ? central : branch)
      stock.push({
        warehouseId: warehouse.id,
        ingredientId: id,
        qty: toBase(qty, unit),
        minQty: toBase(isCentral ? min * 4 : min, unit),
      })
    }
  }
  return stock
}

/**
 * Boshlang'ich baza: menyu, ombor, xodimlar + o'tgan 30 kunlik savdo tarixi, bugungi faol buyurtmalar, kirim /
 * ko'chirish hujjatlari va kommunal to'lovlar (hisobot, oshxona va TV darhol "jonli" ko'rinsin).
 */
export function createSeedDb(now: Date): Db {
  return seedActivity(createBaseDb(now), now)
}

/** Faqat ma'lumotnomalar (menyu, ombor qoldig'i, xodimlar) — buyurtma va hujjatlarsiz. Mantiq testlari shundan boshlanadi. */
export function createBaseDb(now: Date): Db {
  const at = new Date(now.getTime() - 45 * 24 * 3600_000).toISOString()
  const ingredients: Ingredient[] = INGREDIENT_GROUPS.flatMap(([group, rows]) =>
    rows.map(([id, name, unit, price]): Ingredient => ({ id, name, group, unit, lastPrice: price, active: true })),
  )

  return {
    version: DB_VERSION,
    branches: BRANCHES.map((branch) => ({ ...branch, createdAt: at })),
    warehouses: WAREHOUSES,
    users: USERS.map((user) => ({ ...user, active: true, createdAt: at })),
    categories: CATEGORIES.map(([id, name], index): Category => ({
      id,
      name,
      image: `/images/categories/${id}.jpg`,
      sortOrder: index + 1,
      active: true,
    })),
    products: PRODUCTS.map(([id, categoryId, name, , recipe], index): Product => ({
      id,
      categoryId,
      name,
      image: `/images/products/${id}.jpg`,
      recipe: recipe.map(([ingredientId, qty]) => ({ ingredientId, qty })),
      sortOrder: index + 1,
      active: true,
    })),
    prices: [
      ...PRODUCTS.map(([id, , , price]): BranchPrice => ({ branchId: BRANCH_CHILONZOR, productId: id, price, available: true })),
      ...PRODUCTS.map(yunusobodPrice),
    ],
    ingredients,
    stock: buildStock(),
    purchases: [],
    transfers: [],
    movements: [],
    orders: [],
    shifts: [],
    expenses: [],
    counters: {},
  }
}

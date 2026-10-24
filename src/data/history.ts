import { addDays, dateKey, parseDateKey } from '../domain/dates.ts'
import { newId } from '../domain/ids.ts'
import { createExpense } from '../domain/logic/expenses.ts'
import { branchPrice, createOrder, markReady } from '../domain/logic/orders.ts'
import { approvePurchase, createPurchase } from '../domain/logic/purchases.ts'
import { openOrResumeShift } from '../domain/logic/shifts.ts'
import { createTransfer } from '../domain/logic/transfers.ts'
import type { Db, ExpenseKind, ID, Order, OrderItem, OrderSource, OrderType, PaymentMethod, Product, Shift } from '../domain/types.ts'

/**
 * Demo uchun "jonli" ma'lumot: o'tgan 30 kun savdosi (hisobotlar bo'sh turmasin), bugungi buyurtmalar (kassa va
 * TV da darhol ko'rinadi), kirim / ko'chirish hujjatlari va kommunal to'lovlar. Tasodifiy, lekin har safar bir xil
 * (o'zgarmas urug'li generator) — "tiklash" bosilganda ham xuddi shu manzara chiqadi.
 */

const HISTORY_DAYS = 30

/** mulberry32 — kichik, tez, takrorlanuvchi tasodifiy sonlar. */
function createRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

type Random = () => number

function weighted<T>(rand: Random, items: [T, number][]): T {
  const total = items.reduce((sum, [, weight]) => sum + weight, 0)
  let point = rand() * total
  for (const [item, weight] of items) {
    point -= weight
    if (point <= 0) return item
  }
  return items[items.length - 1][0]
}

/** Qaysi taom ko'proq sotiladi (berilmagani — 2). */
const POPULARITY: Record<string, number> = {
  'burger-cheese': 6, 'burger-classic': 5, 'burger-chicken': 4, 'burger-double': 3, 'burger-big-ny': 2,
  'hotdog-classic': 4, 'hotdog-french': 3, 'lavash-beef': 6, 'lavash-chicken': 5, 'lavash-cheese': 3,
  'shawarma-beef': 4, 'shawarma-chicken': 4, fries: 6, 'nuggets-6': 3, cola: 5, tea: 3,
}

/** Soat → buyurtmalar zichligi: tushlik va kechki cho'qqilar. */
const HOURS: [number, number][] = [
  [10, 2], [11, 4], [12, 9], [13, 10], [14, 6], [15, 3], [16, 3], [17, 4], [18, 8], [19, 10], [20, 9], [21, 6], [22, 3],
]

const at = (date: Date, hours: number, minutes: number, seconds = 0) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, seconds)

const plus = (date: Date, seconds: number) => new Date(date.getTime() + seconds * 1000)

function pickItems(rand: Random, db: Db, foods: Product[], drinks: Product[], branchId: ID): OrderItem[] {
  const lines = 1 + (rand() < 0.45 ? 1 : 0) + (rand() < 0.15 ? 1 : 0)
  const chosen: Product[] = []
  for (let i = 0; i < lines; i++) chosen.push(weighted(rand, foods.map((p) => [p, POPULARITY[p.id] ?? 2])))
  if (drinks.length && rand() < 0.55) chosen.push(weighted(rand, drinks.map((p) => [p, POPULARITY[p.id] ?? 2])))

  const items: OrderItem[] = []
  for (const product of chosen) {
    const qty = rand() < 0.15 ? 2 : 1
    const same = items.find((item) => item.productId === product.id)
    if (same) same.qty += qty
    else items.push({ productId: product.id, name: product.name, price: branchPrice(db, branchId, product.id) ?? 0, qty, note: '' })
  }
  return items
}

/** O'tgan kunlar: har kuni ikki smena (ertalab / kechqurun), 17–34 ta buyurtma, ~3% bekor qilingan. */
function seedHistory(db: Db, now: Date, rand: Random): Db {
  const today = dateKey(now)
  const orders: Order[] = []
  const shifts: Shift[] = []
  const counters = { ...db.counters }

  for (const [branchIndex, branch] of db.branches.entries()) {
    const cashiers = db.users.filter((u) => u.role === 'cashier' && u.branchId === branch.id)
    const sellable = db.products.filter((p) => branchPrice(db, branch.id, p.id) !== null)
    const foods = sellable.filter((p) => p.categoryId !== 'drinks')
    const drinks = sellable.filter((p) => p.categoryId === 'drinks')
    if (foods.length === 0) continue

    for (let back = HISTORY_DAYS; back >= 1; back--) {
      const day = addDays(today, -back)
      const date = parseDateKey(day)
      const weekend = [0, 5, 6].includes(date.getDay())
      const count = (weekend ? 30 : 22) + Math.floor(rand() * 9) - 4 - branchIndex * 3

      // smenalar: kassirlar kunma-kun almashib ertalab / kechqurun ishlaydi
      const [morning, evening] = back % 2 === 0 ? [cashiers[0], cashiers[1] ?? cashiers[0]] : [cashiers[1] ?? cashiers[0], cashiers[0]]
      const dayShifts: Shift[] = []
      if (morning && evening) {
        dayShifts.push(
          { id: newId('shf'), branchId: branch.id, cashierId: morning.id, openedAt: at(date, 9, 40).toISOString(), closedAt: at(date, 16, 5).toISOString() },
          { id: newId('shf'), branchId: branch.id, cashierId: evening.id, openedAt: at(date, 15, 55).toISOString(), closedAt: at(date, 23, 35).toISOString() },
        )
        shifts.push(...dayShifts)
      }

      const times = Array.from({ length: count }, () => at(date, weighted(rand, HOURS), Math.floor(rand() * 60), Math.floor(rand() * 60)))
      times.sort((a, b) => a.getTime() - b.getTime())

      times.forEach((created, index) => {
        const shift = dayShifts.length ? dayShifts[created.getHours() < 16 ? 0 : 1] : null
        const kiosk = !shift || rand() < 0.2
        const source: OrderSource = kiosk ? 'kiosk' : 'cashier'
        let type: OrderType = weighted(rand, [['dine_in', 55], ['takeaway', 35], ['delivery', 10]])
        if (kiosk && type === 'delivery') type = 'takeaway'
        const payment: PaymentMethod = kiosk
          ? weighted(rand, [['card', 70], ['click', 30]])
          : weighted(rand, [['cash', 50], ['card', 35], ['click', 15]])
        const items = pickItems(rand, db, foods, drinks, branch.id)
        const cancelled = rand() < 0.03
        const ready = plus(created, 300 + Math.floor(rand() * 400))

        orders.push({
          id: newId('ord'),
          branchId: branch.id,
          number: index + 1,
          type,
          source,
          items,
          note: '',
          total: items.reduce((sum, item) => sum + item.price * item.qty, 0),
          payment,
          status: cancelled ? 'cancelled' : 'ready',
          cashierId: kiosk ? null : (shift?.cashierId ?? null),
          shiftId: kiosk ? null : (shift?.id ?? null),
          createdAt: created.toISOString(),
          preparingAt: cancelled ? null : plus(created, 60 + Math.floor(rand() * 90)).toISOString(),
          readyAt: cancelled ? null : ready.toISOString(),
          cancelledAt: cancelled ? plus(created, 120).toISOString() : null,
          cancelledBy: cancelled ? (shift?.cashierId ?? null) : null,
        })
      })
      counters[`order:${branch.id}:${day}`] = count
    }
  }

  return { ...db, orders: [...db.orders, ...orders], shifts: [...db.shifts, ...shifts], counters }
}

/** Kirim (tasdiqlangan va kutayotgan) va ko'chirishlar — ombor tarixi bo'sh turmasin. */
function seedStockDocuments(db: Db, now: Date): Db {
  const daysAgo = (days: number, hours: number) => at(new Date(now.getTime() - days * 86_400_000), hours, 0)
  const lines = (rows: [string, number][]) => rows.map(([ingredientId, qty]) => ({ ingredientId, qty }))
  let next = db

  const first = createPurchase(next, {
    warehouseId: 'wh_central',
    items: lines([['chicken-fillet', 40], ['potato-fries', 60], ['frying-oil', 80], ['lavash-bread', 400]]),
    note: 'Haftalik kirim',
    createdBy: 'usr_supplier',
  }, daysAgo(13, 10))
  next = approvePurchase(first.db, first.result.id, {}, 'usr_admin', daysAgo(13, 15)).db

  const second = createPurchase(next, {
    warehouseId: 'wh_central',
    items: lines([['beef-meat', 50], ['tomato', 60], ['cucumber', 50], ['cup-paper', 1000]]),
    note: '',
    createdBy: 'usr_supplier',
  }, daysAgo(6, 9))
  next = approvePurchase(second.db, second.result.id, { 'beef-meat': 128000, tomato: 13000 }, 'usr_admin', daysAgo(6, 12)).db

  next = createTransfer(next, {
    fromWarehouseId: 'wh_central',
    toWarehouseId: 'wh_chilonzor',
    items: lines([['chicken-fillet', 10], ['potato-fries', 15], ['lavash-bread', 80]]),
    createdBy: 'usr_supplier',
  }, daysAgo(12, 9)).db
  next = createTransfer(next, {
    fromWarehouseId: 'wh_central',
    toWarehouseId: 'wh_yunusobod',
    items: lines([['beef-meat', 10], ['tomato', 12], ['cup-paper', 200]]),
    createdBy: 'usr_supplier',
  }, daysAgo(5, 9)).db
  next = createTransfer(next, {
    fromWarehouseId: 'wh_chilonzor',
    toWarehouseId: 'wh_yunusobod',
    items: lines([['sausage', 30]]),
    note: 'Yunusobodda sosiska tugab qoldi',
    createdBy: 'usr_supplier',
  }, daysAgo(2, 18)).db

  // admin tasdiqlashini kutayotgan kirim — narxlar oldingi kirimdan yozilgan
  return createPurchase(next, {
    warehouseId: 'wh_central',
    items: lines([['beef-mince', 25], ['tomato', 40], ['kimchi', 10], ['bun-burger', 300]]),
    createdBy: 'usr_supplier',
  }, new Date(now.getTime() - 40 * 60_000)).db
}

type LiveOrder = {
  /** necha daqiqa oldin */
  ago: number
  items: [productId: string, qty: number, note?: string][]
  type: OrderType
  source: OrderSource
  /** `null` — kioskdan, kassada hali to'lanmagan */
  payment: PaymentMethod | null
  note?: string
  /** necha daqiqa oldin tayyor bo'lgan (yo'q bo'lsa — hali tayyorlanmoqda) */
  ready?: number
}

const LIVE: Record<string, LiveOrder[]> = {
  br_chilonzor: [
    { ago: 52, items: [['burger-cheese', 1], ['fries', 1], ['cola', 1]], type: 'dine_in', source: 'cashier', payment: 'cash', ready: 40 },
    { ago: 44, items: [['lavash-beef', 2], ['fanta', 2]], type: 'takeaway', source: 'kiosk', payment: 'card', ready: 33 },
    { ago: 14, items: [['shawarma-chicken', 1], ['tea', 1]], type: 'dine_in', source: 'cashier', payment: 'click', ready: 3 },
    { ago: 12, items: [['burger-double', 1, 'piyozsiz'], ['potato-wedges', 1], ['sprite', 1]], type: 'takeaway', source: 'cashier', payment: 'card', ready: 1 },
    { ago: 10, items: [['hotdog-kimchi', 2], ['cola', 2]], type: 'dine_in', source: 'kiosk', payment: 'click' },
    { ago: 8, items: [['lavash-spicy', 1, 'achchiq kamroq'], ['nuggets-6', 1]], type: 'delivery', source: 'cashier', payment: 'cash', note: "Ketchupni alohida qo'ying" },
    { ago: 6, items: [['burger-big-ny', 1], ['fries', 2], ['cola', 2]], type: 'dine_in', source: 'cashier', payment: 'card' },
    { ago: 3, items: [['shawarma-xl', 1], ['water', 1]], type: 'takeaway', source: 'kiosk', payment: null },
    { ago: 2, items: [['hotdog-classic', 3, 'gorchitsasiz']], type: 'dine_in', source: 'cashier', payment: 'cash' },
    { ago: 1, items: [['burger-chicken', 1], ['onion-rings', 1], ['tea', 1]], type: 'dine_in', source: 'kiosk', payment: null },
  ],
  br_yunusobod: [
    { ago: 38, items: [['burger-classic', 1], ['cola', 1]], type: 'dine_in', source: 'cashier', payment: 'cash', ready: 30 },
    { ago: 9, items: [['lavash-chicken', 1], ['fries', 1]], type: 'takeaway', source: 'kiosk', payment: 'card', ready: 2 },
    { ago: 7, items: [['shawarma-beef', 2, 'piyozsiz']], type: 'dine_in', source: 'cashier', payment: 'click' },
    { ago: 2, items: [['burger-chicken', 1], ['tea', 2]], type: 'takeaway', source: 'kiosk', payment: null },
  ],
}

/** Bugungi buyurtmalar haqiqiy mantiq orqali (ombordan ayriladi, raqamlar navbatda). Kassirlarning smenasi ochiq. */
function seedToday(db: Db, now: Date): Db {
  const dayStart = at(now, 0, 0).getTime()
  const minutesAgo = (minutes: number) => new Date(Math.max(dayStart + 60_000, now.getTime() - minutes * 60_000))
  let next = db

  for (const [branchId, specs] of Object.entries(LIVE)) {
    const cashier = next.users.find((u) => u.role === 'cashier' && u.branchId === branchId)
    if (!cashier) continue
    next = openOrResumeShift(next, cashier.id, branchId, minutesAgo(180)).db

    for (const spec of specs) {
      const order = createOrder(next, {
        branchId,
        type: spec.type,
        source: spec.source,
        items: spec.items.map(([productId, qty, note]) => ({ productId, qty, note })),
        note: spec.note,
        payment: spec.payment,
        cashierId: spec.source === 'cashier' ? cashier.id : null,
      }, minutesAgo(spec.ago))
      next = order.db
      if (spec.ready !== undefined) next = markReady(next, order.result.id, minutesAgo(spec.ready)).db
    }
  }
  return next
}

/** Oxirgi 3 oyning kommunal to'lovlari (bugungacha). */
function seedExpenses(db: Db, now: Date, rand: Random): Db {
  const today = dateKey(now)
  const bills: [ExpenseKind, number, number, string][] = [
    ['internet', 3, 350_000, ''],
    ['electricity', 5, 2_800_000, ''],
    ['gas', 7, 1_300_000, ''],
    ['water', 10, 380_000, ''],
    ['other', 15, 150_000, 'Chiqindi olib ketish'],
  ]
  let next = db
  for (let monthsBack = 2; monthsBack >= 0; monthsBack--) {
    for (const [branchIndex, branch] of db.branches.entries()) {
      for (const [kind, day, base, note] of bills) {
        const date = new Date(now.getFullYear(), now.getMonth() - monthsBack, day)
        const key = dateKey(date)
        if (key >= today) continue
        const amount = Math.round((base * (1 - branchIndex * 0.12) * (0.9 + rand() * 0.2)) / 1000) * 1000
        next = createExpense(next, { branchId: branch.id, kind, amount, date: key, note, createdBy: 'usr_admin' }, at(date, 11, 0)).db
      }
    }
  }
  return next
}

export function seedActivity(db: Db, now: Date): Db {
  const rand = createRandom(20261023)
  let next = seedHistory(db, now, rand)
  next = seedStockDocuments(next, now)
  next = seedToday(next, now)
  return seedExpenses(next, now, rand)
}

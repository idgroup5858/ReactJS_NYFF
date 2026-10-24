/**
 * Biznes mantiqning tez tekshiruvi (brauzersiz): `npm run test:logic`.
 * Node 24 TypeScript'ni o'zi o'qiydi — shuning uchun src/domain va src/data dagi importlar `.ts` kengaytmasi bilan.
 */
import assert from 'node:assert/strict'
import { BRANCH_CHILONZOR, BRANCH_YUNUSOBOD, WAREHOUSE_CENTRAL, createBaseDb, createSeedDb } from '../src/data/seed.ts'
import { addDays, dateKey } from '../src/domain/dates.ts'
import { AppError } from '../src/domain/errors.ts'
import { saveBranch } from '../src/domain/logic/branches.ts'
import { createExpense, deleteExpense } from '../src/domain/logic/expenses.ts'
import { saveIngredient, setMinQty } from '../src/domain/logic/ingredients.ts'
import { moveCategory, moveProduct, saveCategory, saveProduct, setBranchPrice } from '../src/domain/logic/menu.ts'
import {
  activeOrders,
  branchPrice,
  cancelOrder,
  confirmOrder,
  createOrder,
  markReady,
  orderPayments,
  READY_SHOWN_MS,
  recentReady,
  reopenOrder,
} from '../src/domain/logic/orders.ts'
import { approvePurchase, createPurchase, purchaseTotal } from '../src/domain/logic/purchases.ts'
import { salesReport } from '../src/domain/logic/reports.ts'
import { closeShift, openOrResumeShift, shiftSummary } from '../src/domain/logic/shifts.ts'
import { lowStockItems, stockItem, stockQty } from '../src/domain/logic/stock.ts'
import { createTransfer } from '../src/domain/logic/transfers.ts'
import { changeOwnPin, saveUser, verifyPin } from '../src/domain/logic/users.ts'
import type { Db } from '../src/domain/types.ts'

const now = new Date('2026-10-23T12:00:00')
const C = 'wh_chilonzor'
const Y = 'wh_yunusobod'

function expectError(code: string, fn: () => unknown): void {
  assert.throws(fn, (error: unknown) => error instanceof AppError && error.code === code, `kutilgan xato: ${code}`)
}

// ── to'liq demo baza: tarix, bugungi buyurtmalar, hujjatlar ──
const demo = createSeedDb(now)
assert.ok(demo.orders.length > 1000, `tarix: ${demo.orders.length} buyurtma`)
assert.equal(activeOrders(demo, BRANCH_CHILONZOR).length, 6, 'Chilonzorda 4 ta tayyorlanmoqda + 2 ta kassada to\'lanadigan kiosk')
assert.equal(demo.orders.filter((o) => o.branchId === BRANCH_CHILONZOR && o.createdAt.startsWith('2026-10-23') && o.status !== 'cancelled').length >= 10, true)
assert.equal(demo.purchases.filter((p) => p.status === 'pending').length, 1)
assert.equal(demo.transfers.length, 3)
assert.ok(demo.expenses.length >= 20)
assert.ok(lowStockItems(demo, C).length >= 3, 'demo: Chilonzorda ogohlantirishlar')
assert.ok(JSON.stringify(demo).length < 3_000_000, 'localStorage ga sig\'sin')
const month = salesReport(demo, { from: addDays(dateKey(now), -29), to: dateKey(now), branchId: null })
assert.ok(month.revenue > 0 && month.expenses > 0 && month.days.length === 30)
assert.equal(month.days.reduce((sum, day) => sum + day.revenue, 0), month.revenue)
assert.equal(Object.values(month.byPayment).reduce((a, b) => a + b, 0), month.revenue)

let db: Db = createBaseDb(now)

// ── boshlang'ich ma'lumot butunligi ──
const ingredientIds = new Set(db.ingredients.map((i) => i.id))
for (const product of db.products) {
  assert.ok(db.categories.some((c) => c.id === product.categoryId), `${product.id}: kategoriya yo'q`)
  assert.ok(product.recipe.length > 0, `${product.id}: retsept bo'sh`)
  for (const line of product.recipe) assert.ok(ingredientIds.has(line.ingredientId), `${product.id}: ${line.ingredientId} yo'q`)
}
assert.equal(db.prices.length, db.products.length * 2)
assert.ok(lowStockItems(db, C).length >= 3, 'Chilonzorda ogohlantirishlar bo\'lishi kerak')

// ── smena va buyurtma ──
expectError('shift_not_open', () =>
  createOrder(db, { branchId: BRANCH_CHILONZOR, type: 'dine_in', source: 'cashier', items: [{ productId: 'burger-classic', qty: 1 }], payment: 'cash', cashierId: 'usr_cashier_c1' }, now),
)
const shift = openOrResumeShift(db, 'usr_cashier_c1', BRANCH_CHILONZOR, now)
db = shift.db
assert.equal(openOrResumeShift(db, 'usr_cashier_c1', BRANCH_CHILONZOR, now).result.id, shift.result.id, 'smena davom etishi kerak')

const mince0 = stockQty(db, C, 'beef-mince')
const bun0 = stockQty(db, C, 'bun-burger')
const first = createOrder(
  db,
  {
    branchId: BRANCH_CHILONZOR,
    type: 'dine_in',
    source: 'cashier',
    items: [{ productId: 'burger-classic', qty: 2, note: 'piyozsiz' }, { productId: 'cola', qty: 1 }],
    payment: 'cash',
    cashierId: 'usr_cashier_c1',
  },
  now,
)
db = first.db
assert.equal(first.result.number, 1)
assert.equal(first.result.total, 32000 * 2 + 9000)
assert.equal(first.result.shiftId, shift.result.id)
assert.equal(stockQty(db, C, 'beef-mince'), mince0 - 240, 'go\'sht 2 × 120 g ayrilishi kerak')
assert.equal(stockQty(db, C, 'bun-burger'), bun0 - 2)

const second = createOrder(db, { branchId: BRANCH_CHILONZOR, type: 'takeaway', source: 'kiosk', items: [{ productId: 'fries', qty: 1 }], payment: 'card', cashierId: null }, now)
db = second.db
assert.equal(second.result.number, 2)
assert.equal(second.result.shiftId, null)

// Yunusobod: o'z raqamlari, o'z narxi, kimchi hot-dog sotilmaydi
const y = openOrResumeShift(db, 'usr_cashier_y1', BRANCH_YUNUSOBOD, now)
db = y.db
const yOrder = createOrder(db, { branchId: BRANCH_YUNUSOBOD, type: 'delivery', source: 'cashier', items: [{ productId: 'burger-classic', qty: 1 }], payment: 'click', cashierId: 'usr_cashier_y1' }, now)
db = yOrder.db
assert.equal(yOrder.result.number, 1)
assert.equal(yOrder.result.total, 34000)
expectError('product_unavailable', () =>
  createOrder(db, { branchId: BRANCH_YUNUSOBOD, type: 'dine_in', source: 'cashier', items: [{ productId: 'hotdog-kimchi', qty: 1 }], payment: 'cash', cashierId: 'usr_cashier_y1' }, now),
)

// ertasi kuni raqam yana 1 dan
const tomorrow = new Date('2026-10-24T09:00:00')
assert.equal(createOrder(db, { branchId: BRANCH_CHILONZOR, type: 'dine_in', source: 'kiosk', items: [{ productId: 'tea', qty: 1 }], payment: 'card', cashierId: null }, tomorrow).result.number, 1)

// aralash to'lov: qismlar yig'indisi = summa (34 000), asosiy tur — eng katta qism
const mixedInput = { branchId: BRANCH_YUNUSOBOD, type: 'dine_in', source: 'cashier', items: [{ productId: 'burger-classic', qty: 1 }], payment: 'cash', cashierId: 'usr_cashier_y1' } as const
const mixed = createOrder(db, { ...mixedInput, items: [...mixedInput.items], split: { cash: 14000, card: 20000 } }, now).result
assert.equal(mixed.payment, 'card')
assert.deepEqual(orderPayments(mixed), { cash: 14000, card: 20000, click: 0 })
expectError('invalid_amount', () => createOrder(db, { ...mixedInput, items: [...mixedInput.items], split: { cash: 10000, card: 20000 } }, now))
expectError('invalid_amount', () => createOrder(db, { ...mixedInput, items: [...mixedInput.items], split: { cash: 34000 } }, now))

// ── holatlar: to'langan buyurtma darhol tayyorlanmoqda, ovqat kelganda kassir "Tayyor" bosadi ──
assert.equal(first.result.status, 'preparing')
assert.ok(first.result.preparingAt)
const ready = markReady(db, first.result.id, now)
db = ready.db
assert.equal(ready.result.status, 'ready')
expectError('invalid_status', () => markReady(db, first.result.id, now))
assert.deepEqual(recentReady(db, BRANCH_CHILONZOR, now).map((o) => o.id), [first.result.id])
assert.equal(recentReady(db, BRANCH_CHILONZOR, new Date(now.getTime() + READY_SHOWN_MS + 1000)).length, 0, 'TV dan o\'zi tushadi')

// ── kiosk: "kassada to'layman" — kassir pulini olib tasdiqlaguncha oshxonaga ham, omborga ham tegmaydi ──
const mince1 = stockQty(db, C, 'beef-mince')
const kioskInput = { branchId: BRANCH_CHILONZOR, type: 'takeaway', source: 'kiosk', items: [{ productId: 'burger-classic', qty: 1 }], payment: null, cashierId: null } as const
const kioskOrder = createOrder(db, { ...kioskInput, items: [...kioskInput.items] }, now)
db = kioskOrder.db
assert.equal(kioskOrder.result.status, 'pending')
assert.equal(kioskOrder.result.payment, null)
assert.equal(stockQty(db, C, 'beef-mince'), mince1)
assert.ok(!activeOrders(db, BRANCH_CHILONZOR).some((o) => o.status === 'preparing' && o.id === kioskOrder.result.id))
expectError('invalid_amount', () => createOrder(db, { ...kioskInput, items: [...kioskInput.items], source: 'cashier', cashierId: 'usr_cashier_c1' }, now))
expectError('invalid_status', () => markReady(db, kioskOrder.result.id, now))
expectError('shift_not_open', () => confirmOrder(db, kioskOrder.result.id, 'usr_cashier_c2', 'cash', undefined, now))
const confirmed = confirmOrder(db, kioskOrder.result.id, 'usr_cashier_c1', 'cash', undefined, now)
db = confirmed.db
assert.equal(confirmed.result.status, 'preparing')
assert.equal(confirmed.result.payment, 'cash')
assert.equal(confirmed.result.shiftId, shift.result.id)
assert.equal(confirmed.result.cashierId, 'usr_cashier_c1')
assert.equal(stockQty(db, C, 'beef-mince'), mince1 - 120)
expectError('invalid_status', () => confirmOrder(db, kioskOrder.result.id, 'usr_cashier_c1', 'cash', undefined, now))
// to'lanmagan kiosk buyurtmasini bekor qilish omborga tegmaydi
const unpaid = createOrder(db, { ...kioskInput, items: [...kioskInput.items] }, now)
db = cancelOrder(unpaid.db, unpaid.result.id, 'usr_cashier_c1', now).db
assert.equal(stockQty(db, C, 'beef-mince'), mince1 - 120)

// ── bekor qilish: ombor aynan qaytadi ──
const fries0 = stockQty(db, C, 'potato-fries')
db = cancelOrder(db, second.result.id, 'usr_cashier_c1', now).db
assert.equal(stockQty(db, C, 'potato-fries'), fries0 + 150)

// ── smena hisobi ──
const summary = shiftSummary(db, shift.result.id)
assert.deepEqual(summary, { orderCount: 2, cancelledCount: 0, total: 105000, byPayment: { cash: 105000, card: 0, click: 0 } })
db = closeShift(db, shift.result.id, now).db
expectError('shift_not_open', () => closeShift(db, shift.result.id, now))

// ── kirim: tasdiqlanmaguncha omborga qo'shilmaydi ──
const tomatoCentral0 = stockQty(db, WAREHOUSE_CENTRAL, 'tomato')
const purchase = createPurchase(db, { warehouseId: WAREHOUSE_CENTRAL, items: [{ ingredientId: 'tomato', qty: 12.5 }, { ingredientId: 'napkin', qty: 1000 }], createdBy: 'usr_supplier' }, now)
db = purchase.db
assert.equal(purchase.result.items[0].price, 14000, 'oldingi narx avtomatik yozilishi kerak')
assert.equal(stockQty(db, WAREHOUSE_CENTRAL, 'tomato'), tomatoCentral0)
const approved = approvePurchase(db, purchase.result.id, { tomato: 15000 }, 'usr_admin', now)
db = approved.db
assert.equal(stockQty(db, WAREHOUSE_CENTRAL, 'tomato'), tomatoCentral0 + 12500)
assert.equal(db.ingredients.find((i) => i.id === 'tomato')?.lastPrice, 15000)
assert.equal(purchaseTotal(approved.result), 12.5 * 15000 + 1000 * 50)
expectError('already_decided', () => approvePurchase(db, purchase.result.id, {}, 'usr_admin', now))

// ── ko'chirish ──
const cheddarC0 = stockQty(db, C, 'cheddar')
const cheddarW0 = stockQty(db, WAREHOUSE_CENTRAL, 'cheddar')
db = createTransfer(db, { fromWarehouseId: WAREHOUSE_CENTRAL, toWarehouseId: C, items: [{ ingredientId: 'cheddar', qty: 3 }], createdBy: 'usr_supplier' }, now).db
assert.equal(stockQty(db, C, 'cheddar'), cheddarC0 + 3000)
assert.equal(stockQty(db, WAREHOUSE_CENTRAL, 'cheddar'), cheddarW0 - 3000)
expectError('same_warehouse', () => createTransfer(db, { fromWarehouseId: Y, toWarehouseId: Y, items: [{ ingredientId: 'cheddar', qty: 1 }], createdBy: 'usr_supplier' }, now))

expectError('insufficient_stock', () =>
  createTransfer(db, { fromWarehouseId: C, toWarehouseId: Y, items: [{ ingredientId: 'cheddar', qty: 50 }], createdBy: 'usr_supplier' }, now),
)

// ── PIN ──
expectError('wrong_pin', () => verifyPin(db, 'usr_cashier_c1', '0000'))
expectError('invalid_pin', () => changeOwnPin(db, 'usr_cashier_c1', '1234', '12a4'))
db = changeOwnPin(db, 'usr_cashier_c1', '1234', '987654').db
assert.equal(verifyPin(db, 'usr_cashier_c1', '987654').id, 'usr_cashier_c1')

// ── adashib "tayyor" deyilganini qaytarish ──
db = openOrResumeShift(db, 'usr_cashier_c2', BRANCH_CHILONZOR, now).db
const third = createOrder(db, { branchId: BRANCH_CHILONZOR, type: 'dine_in', source: 'cashier', items: [{ productId: 'tea', qty: 1 }], payment: 'cash', cashierId: 'usr_cashier_c2' }, now)
db = markReady(third.db, third.result.id, now).db
const reopened = reopenOrder(db, third.result.id, now)
db = reopened.db
assert.equal(reopened.result.status, 'preparing')
assert.equal(reopened.result.readyAt, null)
expectError('invalid_status', () => reopenOrder(db, third.result.id, now))

// ── admin: filial, xodim, menyu, narx ──
const branch = saveBranch(db, { name: '  Sergeli ', address: '', phone: '', active: true, copyPricesFrom: BRANCH_CHILONZOR }, now)
db = branch.db
assert.equal(branch.result.name, 'Sergeli')
assert.ok(db.warehouses.some((w) => w.branchId === branch.result.id && w.kind === 'branch'), 'yangi filial ombori')
assert.equal(branchPrice(db, branch.result.id, 'burger-classic'), 32000, 'narxlar nusxalanadi')
expectError('name_required', () => saveBranch(db, { name: ' ', address: '', phone: '', active: true }, now))

expectError('branch_required', () => saveUser(db, { name: 'Ali', role: 'cashier', branchId: null, pin: '1234', active: true }, 'usr_admin', now))
expectError('invalid_pin', () => saveUser(db, { name: 'Ali', role: 'cashier', branchId: branch.result.id, pin: '12', active: true }, 'usr_admin', now))
const ali = saveUser(db, { name: 'Ali', role: 'cashier', branchId: branch.result.id, pin: '2468', active: true }, 'usr_admin', now)
db = ali.db
db = saveUser(db, { id: ali.result.id, name: 'Ali V.', role: 'cashier', branchId: branch.result.id, pin: '', active: true }, 'usr_admin', now).db
assert.equal(verifyPin(db, ali.result.id, '2468').name, 'Ali V.', "bo'sh PIN — eskisi qoladi")
expectError('self_action', () => saveUser(db, { id: 'usr_admin', name: 'Admin', role: 'admin', branchId: null, pin: '', active: false }, 'usr_admin', now))
assert.equal(saveUser(db, { name: 'Vali', role: 'supplier', branchId: BRANCH_CHILONZOR, pin: '1357', active: true }, 'usr_admin', now).result.branchId, null)

const pizza = saveCategory(db, { name: { uz: 'Pitsa', ru: '', en: '' }, image: '', icon: '/images/icons/pizza.png', active: true })
db = pizza.db
assert.equal(pizza.result.sortOrder, 7)
expectError('recipe_required', () => saveProduct(db, { categoryId: pizza.result.id, name: { uz: 'Margarita', ru: '', en: '' }, image: '', recipe: [], active: true }))
const margarita = saveProduct(db, {
  categoryId: pizza.result.id,
  name: { uz: 'Margarita', ru: 'Маргарита', en: 'Margherita' },
  image: '',
  recipe: [{ ingredientId: 'mozzarella', qty: 80 }, { ingredientId: 'tomato', qty: 40 }, { ingredientId: 'mozzarella', qty: 20 }],
  active: true,
})
db = margarita.db
assert.deepEqual(margarita.result.recipe, [{ ingredientId: 'mozzarella', qty: 100 }, { ingredientId: 'tomato', qty: 40 }])
assert.equal(branchPrice(db, BRANCH_CHILONZOR, margarita.result.id), null, 'narxsiz taom sotilmaydi')
db = setBranchPrice(db, { branchId: BRANCH_CHILONZOR, productId: margarita.result.id, price: 45000, available: true }).db
assert.equal(branchPrice(db, BRANCH_CHILONZOR, margarita.result.id), 45000)
db = setBranchPrice(db, { branchId: BRANCH_CHILONZOR, productId: margarita.result.id, price: 45000, available: false }).db
assert.equal(branchPrice(db, BRANCH_CHILONZOR, margarita.result.id), null)
expectError('invalid_price', () => setBranchPrice(db, { branchId: BRANCH_CHILONZOR, productId: margarita.result.id, price: 0, available: true }))

db = moveCategory(db, pizza.result.id, -1).db
assert.equal(db.categories.find((c) => c.id === pizza.result.id)?.sortOrder, 6)
assert.equal(db.categories.find((c) => c.id === 'drinks')?.sortOrder, 7)
const burgersBefore = db.products.filter((p) => p.categoryId === 'burgers').sort((a, b) => a.sortOrder - b.sortOrder).map((p) => p.id)
db = moveProduct(db, burgersBefore[0], 1).db
const burgersAfter = db.products.filter((p) => p.categoryId === 'burgers').sort((a, b) => a.sortOrder - b.sortOrder).map((p) => p.id)
assert.deepEqual(burgersAfter.slice(0, 2), [burgersBefore[1], burgersBefore[0]])

// ── ombor mahsuloti va chegara ──
const basil = saveIngredient(db, { name: { uz: 'Rayhon', ru: 'Базилик', en: 'Basil' }, group: 'vegetables', unit: 'kg', active: true })
db = basil.db
assert.equal(basil.result.lastPrice, null)
db = setMinQty(db, C, basil.result.id, 500).db
assert.deepEqual(stockItem(db, C, basil.result.id), { warehouseId: C, ingredientId: basil.result.id, qty: 0, minQty: 500 })
assert.ok(lowStockItems(db, C).some((s) => s.ingredientId === basil.result.id))

// ── rasxod va hisobot ──
expectError('invalid_amount', () => createExpense(db, { branchId: BRANCH_CHILONZOR, kind: 'gas', amount: -5, date: '2026-10-20', createdBy: 'usr_admin' }, now))
const gas = createExpense(db, { branchId: BRANCH_CHILONZOR, kind: 'gas', amount: 1_200_000, date: '2026-10-20', createdBy: 'usr_admin' }, now)
db = gas.db
const report = salesReport(db, { from: '2026-10-17', to: '2026-10-23', branchId: BRANCH_CHILONZOR })
assert.equal(report.orders, 3, "Chilonzor: birinchi + kassada to'langan kiosk + choy (bekor qilinganlar hisobga kirmaydi)")
assert.equal(report.cancelled, 2)
assert.equal(report.revenue, 73000 + 32000 + 4000)
assert.equal(report.expenses, 1_200_000)
assert.equal(report.net, 109000 - 1_200_000)
assert.equal(report.days.length, 7)
assert.equal(report.topProducts[0].productId, 'burger-classic')
db = deleteExpense(db, gas.result.id).db
assert.equal(db.expenses.length, 0)

console.log(`OK — ${db.products.length} taom, ${db.ingredients.length} ombor mahsuloti, ${db.movements.length} harakat`)

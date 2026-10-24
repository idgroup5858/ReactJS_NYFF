import { dateKey } from '../dates.ts'
import { fail } from '../errors.ts'
import { newId } from '../ids.ts'
import {
  PAYMENT_METHODS,
  type Db,
  type ID,
  type Order,
  type OrderItem,
  type OrderSource,
  type OrderType,
  type PaymentMethod,
  type PaymentSplit,
  type Timestamp,
} from '../types.ts'
import { branchWarehouse, findOrFail, nextCounter, replaceById, type Mutation } from './common.ts'
import { applyStockDeltas, recipeDeltas, type StockDelta } from './stock.ts'

/** Tayyor bo'lgan raqam TV va kassa ro'yxatida shuncha vaqt turadi, keyin o'zi tushadi. */
export const READY_SHOWN_MS = 5 * 60_000

export interface NewOrderInput {
  branchId: ID
  type: OrderType
  source: OrderSource
  items: { productId: ID; qty: number; note?: string }[]
  note?: string
  /** `null` — faqat kioskda: mijoz kassada to'laydi, buyurtma kassir tasdiqlaguncha kutadi */
  payment: PaymentMethod | null
  /** aralash to'lov (kamida 2 tur, yig'indisi = buyurtma summasi); berilsa `payment` eng katta qismdan olinadi */
  split?: PaymentSplit
  /** kiosk buyurtmasida `null` */
  cashierId: ID | null
}

/** Buyurtma tushumi to'lov turlari bo'yicha (smena va hisobotlar uchun): aralashda — qismlar, aks holda — butun summa. */
export function orderPayments(order: Order): Record<PaymentMethod, number> {
  const result: Record<PaymentMethod, number> = { cash: 0, card: 0, click: 0 }
  if (order.split) for (const method of PAYMENT_METHODS) result[method] = order.split[method] ?? 0
  else if (order.payment) result[order.payment] = order.total
  return result
}

/** Aralash to'lovni tekshiradi: musbat butun qismlar, kamida ikkita tur, yig'indisi — aynan buyurtma summasi. */
function cleanSplit(split: PaymentSplit, total: number): PaymentSplit {
  const parts = PAYMENT_METHODS.filter((method) => (split[method] ?? 0) !== 0).map((method) => [method, split[method] ?? 0] as const)
  if (parts.length < 2 || parts.some(([, amount]) => !Number.isInteger(amount) || amount < 0)) fail('invalid_amount')
  if (parts.reduce((sum, [, amount]) => sum + amount, 0) !== total) fail('invalid_amount')
  return Object.fromEntries(parts)
}

/** To'lov turi va aralash qismlari; aralashda asosiy tur — eng katta qism. */
function resolvePayment(payment: PaymentMethod, split: PaymentSplit | undefined, total: number): { payment: PaymentMethod; split?: PaymentSplit } {
  if (!split) return { payment }
  const clean = cleanSplit(split, total)
  return { payment: PAYMENT_METHODS.reduce((best, method) => ((clean[method] ?? 0) > (clean[best] ?? 0) ? method : best)), split: clean }
}

/** Kassirning shu filialdagi ochiq smenasi — bo'lmasa xato. */
function openShiftId(db: Db, cashierId: ID, branchId: ID): ID {
  const shift = db.shifts.find((s) => s.cashierId === cashierId && s.branchId === branchId && s.closedAt === null)
  if (!shift) fail('shift_not_open')
  return shift.id
}

/** To'langan buyurtma oshxonaga ketadi: retsept bo'yicha mahsulotlar filial omboridan ayriladi. */
function deductStock(db: Db, order: Order, at: Timestamp): Db {
  return applyStockDeltas(db, branchWarehouse(db, order.branchId).id, recipeDeltas(db, order.items, -1), 'sale', order.id, at)
}

export function branchPrice(db: Db, branchId: ID, productId: ID): number | null {
  const price = db.prices.find((p) => p.branchId === branchId && p.productId === productId)
  return price && price.available ? price.price : null
}

/**
 * Buyurtma: narxlar filial bo'yicha olinadi, raqam filialning bugungi navbatidagi son. To'langan buyurtma darhol
 * "tayyorlanmoqda" (chek oshxonaga) va mahsulotlar ombordan ayriladi; kassir buyurtmasi uning ochiq smenasiga yoziladi.
 * Kioskda "kassada to'layman" — `pending`: kassir pulini olib tasdiqlaguncha oshxonaga ham, omborga ham tegmaydi.
 */
export function createOrder(db: Db, input: NewOrderInput, now: Date): Mutation<Order> {
  if (input.items.length === 0) fail('empty_order')
  const branch = findOrFail(db.branches, input.branchId, 'branch')
  if (!branch.active) fail('not_found', `branch ${branch.id} inactive`)
  if (input.payment === null && input.source !== 'kiosk') fail('invalid_amount')

  const items: OrderItem[] = input.items.map((line) => {
    if (!Number.isInteger(line.qty) || line.qty < 1) fail('invalid_qty', line.productId)
    const product = findOrFail(db.products, line.productId, 'product')
    const price = branchPrice(db, branch.id, product.id)
    if (!product.active || price === null) fail('product_unavailable', product.id)
    return { productId: product.id, name: product.name, price, qty: line.qty, note: line.note?.trim() ?? '' }
  })

  const shiftId = input.cashierId !== null ? openShiftId(db, input.cashierId, branch.id) : null
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0)
  const paid = input.payment === null ? null : resolvePayment(input.payment, input.split, total)

  const counter = nextCounter(db, `order:${branch.id}:${dateKey(now)}`)
  const at = now.toISOString()
  const order: Order = {
    id: newId('ord'),
    branchId: branch.id,
    number: counter.result,
    type: input.type,
    source: input.source,
    items,
    note: input.note?.trim() ?? '',
    total,
    payment: paid?.payment ?? null,
    ...(paid?.split && { split: paid.split }),
    status: paid ? 'preparing' : 'pending',
    cashierId: input.cashierId,
    shiftId,
    createdAt: at,
    preparingAt: paid ? at : null,
    readyAt: null,
    cancelledAt: null,
    cancelledBy: null,
  }

  const next: Db = { ...counter.db, orders: [...counter.db.orders, order] }
  return { db: paid ? deductStock(next, order, at) : next, result: order }
}

/** Kassir kiosk buyurtmasining pulini oldi: pending → preparing, uning smenasiga yoziladi, mahsulotlar ombordan ayriladi. */
export function confirmOrder(db: Db, orderId: ID, cashierId: ID, payment: PaymentMethod, split: PaymentSplit | undefined, now: Date): Mutation<Order> {
  const order = findOrFail(db.orders, orderId, 'order')
  if (order.status !== 'pending') fail('invalid_status', `${order.status} → preparing`)
  const shiftId = openShiftId(db, cashierId, order.branchId)
  const paid = resolvePayment(payment, split, order.total)
  const at = now.toISOString()
  const next: Order = { ...order, payment: paid.payment, ...(paid.split && { split: paid.split }), status: 'preparing', cashierId, shiftId, preparingAt: at }
  return { db: deductStock({ ...db, orders: replaceById(db.orders, next) }, next, at), result: next }
}

/** Oshxona ovqatni kassaga olib keldi — kassir "Tayyor" bosadi: preparing → ready, raqam TV da «Tayyor» ustuniga o'tadi. */
export function markReady(db: Db, orderId: ID, now: Date): Mutation<Order> {
  const order = findOrFail(db.orders, orderId, 'order')
  if (order.status !== 'preparing') fail('invalid_status', `${order.status} → ready`)
  const next: Order = { ...order, status: 'ready', readyAt: now.toISOString() }
  return { db: { ...db, orders: replaceById(db.orders, next) }, result: next }
}

/** Adashib "tayyor" deyilgan buyurtmani qaytaradi: ready → preparing (TV da yana "tayyorlanmoqda" ustuniga o'tadi). */
export function reopenOrder(db: Db, orderId: ID, now: Date): Mutation<Order> {
  const order = findOrFail(db.orders, orderId, 'order')
  if (order.status !== 'ready') fail('invalid_status', `${order.status} → preparing`)
  const next: Order = { ...order, status: 'preparing', readyAt: null, preparingAt: order.preparingAt ?? now.toISOString() }
  return { db: { ...db, orders: replaceById(db.orders, next) }, result: next }
}

/** Kassir bekor qiladi. Sotuvda ayrilgan mahsulotlar aynan o'sha miqdorda omborga qaytadi (to'lanmagan kioskda — hech narsa). */
export function cancelOrder(db: Db, orderId: ID, userId: ID, now: Date): Mutation<Order> {
  const order = findOrFail(db.orders, orderId, 'order')
  if (order.status === 'cancelled') fail('invalid_status', order.status)
  const at: Timestamp = now.toISOString()
  const cancelled: Order = { ...order, status: 'cancelled', cancelledAt: at, cancelledBy: userId }

  let next: Db = { ...db, orders: replaceById(db.orders, cancelled) }
  const returns = new Map<ID, StockDelta[]>()
  for (const m of db.movements) {
    if (m.refId !== order.id || m.kind !== 'sale') continue
    returns.set(m.warehouseId, [...(returns.get(m.warehouseId) ?? []), { ingredientId: m.ingredientId, qty: -m.qty }])
  }
  for (const [warehouseId, deltas] of returns) next = applyStockDeltas(next, warehouseId, deltas, 'sale_cancel', order.id, at)
  return { db: next, result: cancelled }
}

/** Ishdagi buyurtmalar (kassada to'lanmagan kiosk + tayyorlanayotgan), eskisi birinchi. */
export function activeOrders(db: Db, branchId: ID): Order[] {
  return db.orders
    .filter((o) => o.branchId === branchId && (o.status === 'pending' || o.status === 'preparing'))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/** Yaqinda tayyor bo'lganlar (TV dagi «Tayyor» ustuni), yangisi birinchi. */
export function recentReady(db: Db, branchId: ID, now: Date): Order[] {
  const since = now.getTime() - READY_SHOWN_MS
  return db.orders
    .filter((o) => o.branchId === branchId && o.status === 'ready' && o.readyAt !== null && new Date(o.readyAt).getTime() > since)
    .sort((a, b) => (b.readyAt ?? '').localeCompare(a.readyAt ?? ''))
}

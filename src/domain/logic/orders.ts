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
  type OrderStatus,
  type OrderType,
  type PaymentMethod,
  type PaymentSplit,
  type Timestamp,
} from '../types.ts'
import { branchWarehouse, findOrFail, nextCounter, replaceById, type Mutation } from './common.ts'
import { applyStockDeltas, recipeDeltas, type StockDelta } from './stock.ts'

export interface NewOrderInput {
  branchId: ID
  type: OrderType
  source: OrderSource
  items: { productId: ID; qty: number; note?: string }[]
  note?: string
  payment: PaymentMethod
  /** aralash to'lov (kamida 2 tur, yig'indisi = buyurtma summasi); berilsa `payment` eng katta qismdan olinadi */
  split?: PaymentSplit
  /** kiosk buyurtmasida `null` */
  cashierId: ID | null
}

/** Buyurtma tushumi to'lov turlari bo'yicha (smena va hisobotlar uchun): aralashda — qismlar, aks holda — butun summa. */
export function orderPayments(order: Order): Record<PaymentMethod, number> {
  const result: Record<PaymentMethod, number> = { cash: 0, card: 0, click: 0 }
  if (order.split) for (const method of PAYMENT_METHODS) result[method] = order.split[method] ?? 0
  else result[order.payment] = order.total
  return result
}

/** Aralash to'lovni tekshiradi: musbat butun qismlar, kamida ikkita tur, yig'indisi — aynan buyurtma summasi. */
function cleanSplit(split: PaymentSplit, total: number): PaymentSplit {
  const parts = PAYMENT_METHODS.filter((method) => (split[method] ?? 0) !== 0).map((method) => [method, split[method] ?? 0] as const)
  if (parts.length < 2 || parts.some(([, amount]) => !Number.isInteger(amount) || amount < 0)) fail('invalid_amount')
  if (parts.reduce((sum, [, amount]) => sum + amount, 0) !== total) fail('invalid_amount')
  return Object.fromEntries(parts)
}

export function branchPrice(db: Db, branchId: ID, productId: ID): number | null {
  const price = db.prices.find((p) => p.branchId === branchId && p.productId === productId)
  return price && price.available ? price.price : null
}

/**
 * Buyurtma: narxlar filial bo'yicha olinadi, raqam filialning bugungi navbatidagi son, retsept bo'yicha mahsulotlar
 * filial omboridan darhol ayriladi. Kassir buyurtmasi uning ochiq smenasiga yoziladi.
 */
export function createOrder(db: Db, input: NewOrderInput, now: Date): Mutation<Order> {
  if (input.items.length === 0) fail('empty_order')
  const branch = findOrFail(db.branches, input.branchId, 'branch')
  if (!branch.active) fail('not_found', `branch ${branch.id} inactive`)

  const items: OrderItem[] = input.items.map((line) => {
    if (!Number.isInteger(line.qty) || line.qty < 1) fail('invalid_qty', line.productId)
    const product = findOrFail(db.products, line.productId, 'product')
    const price = branchPrice(db, branch.id, product.id)
    if (!product.active || price === null) fail('product_unavailable', product.id)
    return { productId: product.id, name: product.name, price, qty: line.qty, note: line.note?.trim() ?? '' }
  })

  let shiftId: ID | null = null
  if (input.cashierId !== null) {
    const shift = db.shifts.find((s) => s.cashierId === input.cashierId && s.branchId === branch.id && s.closedAt === null)
    if (!shift) fail('shift_not_open')
    shiftId = shift.id
  }

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0)
  const split = input.split ? cleanSplit(input.split, total) : undefined
  const payment = split ? PAYMENT_METHODS.reduce((best, method) => ((split[method] ?? 0) > (split[best] ?? 0) ? method : best)) : input.payment

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
    payment,
    ...(split && { split }),
    status: 'new',
    cashierId: input.cashierId,
    shiftId,
    createdAt: at,
    preparingAt: null,
    readyAt: null,
    servedAt: null,
    cancelledAt: null,
    cancelledBy: null,
  }

  let next: Db = { ...counter.db, orders: [...counter.db.orders, order] }
  next = applyStockDeltas(next, branchWarehouse(next, branch.id).id, recipeDeltas(next, items, -1), 'sale', order.id, at)
  return { db: next, result: order }
}

const TRANSITIONS: Partial<Record<OrderStatus, { to: OrderStatus; stamp: 'preparingAt' | 'readyAt' | 'servedAt' }>> = {
  new: { to: 'preparing', stamp: 'preparingAt' },
  preparing: { to: 'ready', stamp: 'readyAt' },
  ready: { to: 'served', stamp: 'servedAt' },
}

/**
 * Keyingi holatga o'tkazadi: oshxona new → preparing → ready, kassir ready → served.
 * [from] — chaqiruvchi ko'rgan holat: boshqa ekranda allaqachon o'zgartirilgan bo'lsa, ikki marta o'tib ketmaydi.
 */
export function advanceOrder(db: Db, orderId: ID, from: OrderStatus, now: Date): Mutation<Order> {
  const order = findOrFail(db.orders, orderId, 'order')
  const step = TRANSITIONS[order.status]
  if (order.status !== from || !step) fail('invalid_status', `${order.status} → ?`)
  const next: Order = { ...order, status: step.to }
  next[step.stamp] = now.toISOString()
  return { db: { ...db, orders: replaceById(db.orders, next) }, result: next }
}

/** Oshxona adashib "tayyor" degan buyurtmani qaytaradi: ready → preparing (TV da yana "tayyorlanmoqda" ustuniga o'tadi). */
export function reopenOrder(db: Db, orderId: ID, now: Date): Mutation<Order> {
  const order = findOrFail(db.orders, orderId, 'order')
  if (order.status !== 'ready') fail('invalid_status', `${order.status} → preparing`)
  const next: Order = { ...order, status: 'preparing', readyAt: null, preparingAt: order.preparingAt ?? now.toISOString() }
  return { db: { ...db, orders: replaceById(db.orders, next) }, result: next }
}

/** Kassir bekor qiladi (berilgan buyurtmadan tashqari). Sotuvda ayrilgan mahsulotlar aynan o'sha miqdorda omborga qaytadi. */
export function cancelOrder(db: Db, orderId: ID, userId: ID, now: Date): Mutation<Order> {
  const order = findOrFail(db.orders, orderId, 'order')
  if (order.status === 'served' || order.status === 'cancelled') fail('invalid_status', order.status)
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

/** Oshxona va TV uchun: tugallanmagan buyurtmalar, eskisi birinchi. */
export function activeOrders(db: Db, branchId: ID): Order[] {
  return db.orders
    .filter((o) => o.branchId === branchId && (o.status === 'new' || o.status === 'preparing' || o.status === 'ready'))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

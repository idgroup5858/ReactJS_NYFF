import { fail } from '../errors.ts'
import { newId } from '../ids.ts'
import { PAYMENT_METHODS, type Db, type ID, type PaymentMethod, type Shift } from '../types.ts'
import { findOrFail, replaceById, type Mutation } from './common.ts'
import { orderPayments } from './orders.ts'

/** Kassir kirganda: ochiq smenasi bo'lsa davom etadi, bo'lmasa yangisi ochiladi. */
export function openOrResumeShift(db: Db, cashierId: ID, branchId: ID, now: Date): Mutation<Shift> {
  const open = db.shifts.find((s) => s.cashierId === cashierId && s.branchId === branchId && s.closedAt === null)
  if (open) return { db, result: open }
  const shift: Shift = { id: newId('shf'), branchId, cashierId, openedAt: now.toISOString(), closedAt: null }
  return { db: { ...db, shifts: [...db.shifts, shift] }, result: shift }
}

export function closeShift(db: Db, shiftId: ID, now: Date): Mutation<Shift> {
  const shift = findOrFail(db.shifts, shiftId, 'shift')
  if (shift.closedAt !== null) fail('shift_not_open')
  const closed: Shift = { ...shift, closedAt: now.toISOString() }
  return { db: { ...db, shifts: replaceById(db.shifts, closed) }, result: closed }
}

export interface ShiftSummary {
  orderCount: number
  cancelledCount: number
  total: number
  byPayment: Record<PaymentMethod, number>
}

/** Smena tushumi: bekor qilinmagan buyurtmalar, to'lov turlari bo'yicha. */
export function shiftSummary(db: Db, shiftId: ID): ShiftSummary {
  const summary: ShiftSummary = { orderCount: 0, cancelledCount: 0, total: 0, byPayment: { cash: 0, card: 0, click: 0 } }
  for (const order of db.orders) {
    if (order.shiftId !== shiftId || order.status === 'pending') continue
    if (order.status === 'cancelled') {
      summary.cancelledCount += 1
      continue
    }
    summary.orderCount += 1
    summary.total += order.total
    const parts = orderPayments(order)
    for (const method of PAYMENT_METHODS) summary.byPayment[method] += parts[method]
  }
  return summary
}

import { dateKey, dateRange } from '../dates.ts'
import {
  EXPENSE_KINDS,
  ORDER_TYPES,
  PAYMENT_METHODS,
  type DateKey,
  type Db,
  type ExpenseKind,
  type ID,
  type LocalizedText,
  type OrderSource,
  type OrderType,
  type PaymentMethod,
} from '../types.ts'
import { orderPayments } from './orders.ts'

export interface ReportRange {
  from: DateKey
  to: DateKey
  /** `null` — barcha filiallar */
  branchId: ID | null
}

export interface Tally {
  orders: number
  revenue: number
}

export interface DayPoint extends Tally {
  date: DateKey
  expenses: number
}

export interface ProductStat {
  productId: ID
  name: LocalizedText
  qty: number
  revenue: number
}

export interface BranchStat extends Tally {
  branchId: ID
  expenses: number
}

export interface SalesReport extends Tally {
  cancelled: number
  cancelledAmount: number
  avgCheck: number
  byPayment: Record<PaymentMethod, number>
  byType: Record<OrderType, Tally>
  bySource: Record<OrderSource, Tally>
  /** soat bo'yicha tushum (0–23) */
  byHour: number[]
  /** oraliqdagi har bir kun — buyurtmasiz kunlar ham (0 bilan) */
  days: DayPoint[]
  /** tushum bo'yicha kamayish tartibida */
  topProducts: ProductStat[]
  byBranch: BranchStat[]
  expenses: number
  expensesByKind: Record<ExpenseKind, number>
  /** tushum − kommunal xarajatlar */
  net: number
}

const tally = (): Tally => ({ orders: 0, revenue: 0 })

/**
 * Sotuv hisoboti: to'langan (bekor qilinmagan) buyurtmalar tushumi, to'lov turi / buyurtma turi / manba / soat / kun /
 * taom / filial kesimida, va shu davrdagi kommunal xarajatlar.
 */
export function salesReport(db: Db, range: ReportRange): SalesReport {
  const days = dateRange(range.from, range.to)
  const dayIndex = new Map(days.map((date, index) => [date, index]))
  const inBranch = (branchId: ID) => range.branchId === null || branchId === range.branchId

  const report: SalesReport = {
    ...tally(),
    cancelled: 0,
    cancelledAmount: 0,
    avgCheck: 0,
    byPayment: Object.fromEntries(PAYMENT_METHODS.map((m) => [m, 0])) as Record<PaymentMethod, number>,
    byType: Object.fromEntries(ORDER_TYPES.map((type) => [type, tally()])) as Record<OrderType, Tally>,
    bySource: { cashier: tally(), kiosk: tally() },
    byHour: Array.from({ length: 24 }, () => 0),
    days: days.map((date) => ({ date, ...tally(), expenses: 0 })),
    topProducts: [],
    byBranch: db.branches.filter((b) => inBranch(b.id)).map((b) => ({ branchId: b.id, ...tally(), expenses: 0 })),
    expenses: 0,
    expensesByKind: Object.fromEntries(EXPENSE_KINDS.map((k) => [k, 0])) as Record<ExpenseKind, number>,
    net: 0,
  }
  const products = new Map<ID, ProductStat>()
  const branchStat = (branchId: ID) => report.byBranch.find((b) => b.branchId === branchId)

  for (const order of db.orders) {
    if (!inBranch(order.branchId)) continue
    const created = new Date(order.createdAt)
    const index = dayIndex.get(dateKey(created))
    if (index === undefined) continue
    if (order.status === 'cancelled') {
      report.cancelled += 1
      report.cancelledAmount += order.total
      continue
    }
    report.orders += 1
    report.revenue += order.total
    const parts = orderPayments(order)
    for (const method of PAYMENT_METHODS) report.byPayment[method] += parts[method]
    report.byType[order.type].orders += 1
    report.byType[order.type].revenue += order.total
    report.bySource[order.source].orders += 1
    report.bySource[order.source].revenue += order.total
    report.byHour[created.getHours()] += order.total
    report.days[index].orders += 1
    report.days[index].revenue += order.total
    const branch = branchStat(order.branchId)
    if (branch) {
      branch.orders += 1
      branch.revenue += order.total
    }
    for (const item of order.items) {
      const stat = products.get(item.productId) ?? { productId: item.productId, name: item.name, qty: 0, revenue: 0 }
      stat.qty += item.qty
      stat.revenue += item.price * item.qty
      products.set(item.productId, stat)
    }
  }

  for (const expense of db.expenses) {
    if (!inBranch(expense.branchId)) continue
    const index = dayIndex.get(expense.date)
    if (index === undefined) continue
    report.expenses += expense.amount
    report.expensesByKind[expense.kind] += expense.amount
    report.days[index].expenses += expense.amount
    const branch = branchStat(expense.branchId)
    if (branch) branch.expenses += expense.amount
  }

  report.avgCheck = report.orders > 0 ? Math.round(report.revenue / report.orders) : 0
  report.net = report.revenue - report.expenses
  report.topProducts = [...products.values()].sort((a, b) => b.revenue - a.revenue)
  return report
}

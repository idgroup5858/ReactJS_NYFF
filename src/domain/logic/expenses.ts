import { fail } from '../errors.ts'
import { newId } from '../ids.ts'
import type { DateKey, Db, Expense, ExpenseKind, ID } from '../types.ts'
import { findOrFail, type Mutation } from './common.ts'

export interface NewExpenseInput {
  branchId: ID
  kind: ExpenseKind
  amount: number
  date: DateKey
  note?: string
  createdBy: ID
}

/** Kommunal to'lov (svet, gaz, suv, internet...) — hisobotda tushumdan ayriladi. */
export function createExpense(db: Db, input: NewExpenseInput, now: Date): Mutation<Expense> {
  findOrFail(db.branches, input.branchId, 'branch')
  if (!Number.isInteger(input.amount) || input.amount <= 0) fail('invalid_amount')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) fail('invalid_amount', 'date')
  const expense: Expense = {
    id: newId('exp'),
    branchId: input.branchId,
    kind: input.kind,
    amount: input.amount,
    date: input.date,
    note: input.note?.trim() ?? '',
    createdBy: input.createdBy,
    createdAt: now.toISOString(),
  }
  return { db: { ...db, expenses: [...db.expenses, expense] }, result: expense }
}

export function deleteExpense(db: Db, id: ID): Mutation<Expense> {
  const expense = findOrFail(db.expenses, id, 'expense')
  return { db: { ...db, expenses: db.expenses.filter((e) => e.id !== id) }, result: expense }
}

import { saveBranch, type BranchInput } from '@/domain/logic/branches'
import { createExpense, deleteExpense, type NewExpenseInput } from '@/domain/logic/expenses'
import { saveIngredient, setMinQty, type IngredientInput } from '@/domain/logic/ingredients'
import {
  moveCategory,
  moveProduct,
  saveCategory,
  saveProduct,
  setBranchPrice,
  type CategoryInput,
  type PriceInput,
  type ProductInput,
} from '@/domain/logic/menu'
import { advanceOrder, cancelOrder, createOrder, reopenOrder, type NewOrderInput } from '@/domain/logic/orders'
import { approvePurchase, createPurchase, rejectPurchase, type NewPurchaseInput } from '@/domain/logic/purchases'
import { closeShift, openOrResumeShift } from '@/domain/logic/shifts'
import { createTransfer, type NewTransferInput } from '@/domain/logic/transfers'
import { changeOwnPin, saveUser, type UserInput } from '@/domain/logic/users'
import type { ID, OrderStatus } from '@/domain/types'
import { run } from './db'

/**
 * Ilovaning yagona "backend"i. Komponentlar bazaga to'g'ridan-to'g'ri yozmaydi — faqat shu funksiyalar orqali.
 * NestJS tayyor bo'lganda faqat shu fayl HTTP so'rovlarga almashtiriladi.
 */
export const api = {
  orders: {
    create: (input: NewOrderInput) => run((db, now) => createOrder(db, input, now)),
    advance: (orderId: ID, from: OrderStatus) => run((db, now) => advanceOrder(db, orderId, from, now)),
    reopen: (orderId: ID) => run((db, now) => reopenOrder(db, orderId, now)),
    cancel: (orderId: ID, userId: ID) => run((db, now) => cancelOrder(db, orderId, userId, now)),
  },
  shifts: {
    openOrResume: (cashierId: ID, branchId: ID) => run((db, now) => openOrResumeShift(db, cashierId, branchId, now)),
    close: (shiftId: ID) => run((db, now) => closeShift(db, shiftId, now)),
  },
  purchases: {
    create: (input: NewPurchaseInput) => run((db, now) => createPurchase(db, input, now)),
    approve: (purchaseId: ID, prices: Record<ID, number>, adminId: ID) =>
      run((db, now) => approvePurchase(db, purchaseId, prices, adminId, now)),
    reject: (purchaseId: ID, adminId: ID) => run((db, now) => rejectPurchase(db, purchaseId, adminId, now)),
  },
  transfers: {
    create: (input: NewTransferInput) => run((db, now) => createTransfer(db, input, now)),
  },
  ingredients: {
    save: (input: IngredientInput) => run((db) => saveIngredient(db, input)),
    setMinQty: (warehouseId: ID, ingredientId: ID, minQty: number) => run((db) => setMinQty(db, warehouseId, ingredientId, minQty)),
  },
  users: {
    changeOwnPin: (userId: ID, oldPin: string, newPin: string) => run((db) => changeOwnPin(db, userId, oldPin, newPin)),
    save: (input: UserInput, actorId: ID) => run((db, now) => saveUser(db, input, actorId, now)),
  },
  branches: {
    save: (input: BranchInput) => run((db, now) => saveBranch(db, input, now)),
  },
  menu: {
    saveCategory: (input: CategoryInput) => run((db) => saveCategory(db, input)),
    saveProduct: (input: ProductInput) => run((db) => saveProduct(db, input)),
    moveCategory: (id: ID, direction: -1 | 1) => run((db) => moveCategory(db, id, direction)),
    moveProduct: (id: ID, direction: -1 | 1) => run((db) => moveProduct(db, id, direction)),
    setPrice: (input: PriceInput) => run((db) => setBranchPrice(db, input)),
  },
  expenses: {
    create: (input: NewExpenseInput) => run((db, now) => createExpense(db, input, now)),
    delete: (id: ID) => run((db) => deleteExpense(db, id)),
  },
}

export { resetDb, useDb } from './db'

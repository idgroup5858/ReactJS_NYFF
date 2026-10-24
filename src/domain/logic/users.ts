import { fail } from '../errors.ts'
import { newId } from '../ids.ts'
import type { Db, ID, Role, User } from '../types.ts'
import { findOrFail, replaceById, type Mutation } from './common.ts'

/** PIN: faqat raqamlar, 4 tadan 8 tagacha. */
export function isValidPin(pin: string): boolean {
  return /^\d{4,8}$/.test(pin)
}

/** Kassir filialga bog'lanadi; admin va ta'minotchi — butun tarmoq uchun. */
export function roleNeedsBranch(role: Role): boolean {
  return role === 'cashier'
}

export function verifyPin(db: Db, userId: ID, pin: string): User {
  const user = findOrFail(db.users, userId, 'user')
  if (!user.active) fail('user_inactive')
  if (user.pin !== pin) fail('wrong_pin')
  return user
}

/** Xodim o'z PIN'ini almashtiradi (eski PIN bilan tasdiqlab). */
export function changeOwnPin(db: Db, userId: ID, oldPin: string, newPin: string): Mutation<User> {
  const user = verifyPin(db, userId, oldPin)
  if (!isValidPin(newPin)) fail('invalid_pin')
  const updated: User = { ...user, pin: newPin }
  return { db: { ...db, users: replaceById(db.users, updated) }, result: updated }
}

export interface UserInput {
  /** berilmasa — yangi xodim */
  id?: ID
  name: string
  role: Role
  branchId: ID | null
  /** yangi xodimda majburiy; tahrirda bo'sh qoldirilsa — eski PIN qoladi */
  pin: string
  active: boolean
}

/**
 * Admin xodim qo'shadi / tahrirlaydi. O'zini bloklay olmaydi va o'z rolini o'zgartira olmaydi — tizimda admin
 * qolmay qolmasin.
 */
export function saveUser(db: Db, input: UserInput, actorId: ID, now: Date): Mutation<User> {
  const name = input.name.trim()
  if (!name) fail('name_required')
  const needsBranch = roleNeedsBranch(input.role)
  if (needsBranch && !input.branchId) fail('branch_required')
  if (needsBranch) findOrFail(db.branches, input.branchId ?? '', 'branch')
  const branchId = needsBranch ? input.branchId : null
  const pin = input.pin.trim()

  if (input.id) {
    const current = findOrFail(db.users, input.id, 'user')
    if (current.id === actorId && (!input.active || input.role !== current.role)) fail('self_action')
    if (pin && !isValidPin(pin)) fail('invalid_pin')
    const user: User = { ...current, name, role: input.role, branchId, active: input.active, pin: pin || current.pin }
    return { db: { ...db, users: replaceById(db.users, user) }, result: user }
  }

  if (!isValidPin(pin)) fail('invalid_pin')
  const user: User = { id: newId('usr'), name, role: input.role, branchId, pin, active: input.active, createdAt: now.toISOString() }
  return { db: { ...db, users: [...db.users, user] }, result: user }
}

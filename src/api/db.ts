import { DB_VERSION, createSeedDb } from '@/data/seed'
import type { Mutation } from '@/domain/logic/common'
import type { Db } from '@/domain/types'
import { createStore, useStore } from '@/store/createStore'
import { onStorageChange, readJson, writeJson } from '@/store/storage'
import { DB_STORAGE_KEY } from '@/store/storageKeys'

/**
 * Backend o'rnidagi baza: bitta obyekt, localStorage da saqlanadi. Boshqa tabda (masalan kassada) o'zgarsa, shu tab
 * (masalan TV) `storage` hodisasi orqali darhol yangilanadi — haqiqiy oqimni bir nechta oynada ko'rsatish mumkin.
 */

function isCurrent(raw: unknown): raw is Db {
  return !!raw && typeof raw === 'object' && (raw as Db).version === DB_VERSION
}

function loadOrSeed(): Db {
  const raw = readJson(DB_STORAGE_KEY)
  if (isCurrent(raw)) return raw
  const seeded = createSeedDb(new Date())
  writeJson(DB_STORAGE_KEY, seeded)
  return seeded
}

export const dbStore = createStore<Db>(loadOrSeed())

onStorageChange(DB_STORAGE_KEY, () => dbStore.set(loadOrSeed()))

function commit(next: Db): void {
  dbStore.set(next)
  writeJson(DB_STORAGE_KEY, next)
}

/**
 * Buyruqni bajaradi: toza funksiya bazaning yangi nusxasini qaytaradi, u saqlanadi. Natija Promise — backend ulanganda
 * chaqiruvchi kod (`await api...`) o'zgarmaydi. Xato bo'lsa (AppError) baza o'zgarmaydi.
 */
export function run<T>(mutate: (db: Db, now: Date) => Mutation<T>): Promise<T> {
  try {
    const { db, result } = mutate(dbStore.get(), new Date())
    commit(db)
    return Promise.resolve(result)
  } catch (error) {
    return Promise.reject(error)
  }
}

/** Faqat o'qish: komponent baza o'zgarganda qayta chiziladi. */
export function useDb(): Db {
  return useStore(dbStore)
}

/** Demo ma'lumotlarni boshlang'ich holatga qaytaradi (barcha tablarda). */
export function resetDb(): void {
  commit(createSeedDb(new Date()))
}

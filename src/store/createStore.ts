import { useSyncExternalStore } from 'react'

/** Kichik tashqi holat ombori: React komponentlari [useStore] orqali, qolgan kod get/subscribe orqali o'qiydi. */
export interface Store<T> {
  get(): T
  set(next: T): void
  update(transform: (current: T) => T): void
  subscribe(listener: () => void): () => void
}

export function createStore<T>(initial: T): Store<T> {
  let state = initial
  const listeners = new Set<() => void>()

  const set = (next: T) => {
    if (Object.is(next, state)) return
    state = next
    listeners.forEach((listener) => listener())
  }

  return {
    get: () => state,
    set,
    update: (transform) => set(transform(state)),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get)
}

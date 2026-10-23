/**
 * Brauzer xotirasi bilan xavfsiz ishlash: saqlash bloklansa (maxfiy rejim va h.k.) ilova baribir ishlaydi,
 * faqat o'zgarishlar sahifa yangilanguncha amal qiladi.
 */

export function readJson(key: string, storage: Storage = localStorage): unknown {
  try {
    const raw = storage.getItem(key)
    return raw === null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}

export function writeJson(key: string, value: unknown, storage: Storage = localStorage): void {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    // saqlash bloklangan yoki joy tugagan — holat xotirada qoladi
  }
}

export function removeKey(key: string, storage: Storage = localStorage): void {
  try {
    storage.removeItem(key)
  } catch {
    // saqlash bloklangan
  }
}

/** Boshqa tabda shu kalit o'zgarsa (yoki localStorage tozalansa) [listener] chaqiriladi. */
export function onStorageChange(key: string, listener: () => void): () => void {
  const handler = (event: StorageEvent) => {
    if (event.key === key || event.key === null) listener()
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

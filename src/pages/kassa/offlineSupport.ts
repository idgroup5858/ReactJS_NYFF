import { useEffect, useRef, useState } from 'react'
import { dateKey } from '@/domain/dates'
import type { ID, Order } from '@/domain/types'
import { readJson, writeJson } from '@/store/storage'
import { lastNumberStorageKey } from '@/store/storageKeys'

/** Server bilan aloqa shuncha vaqt yo'q bo'lsa — "Internet yo'q" oynasi (Wi-Fi bir lahza uzilishi hisobga olinmaydi). */
const LOST_AFTER_MS = 5_000

/**
 * Jonli ulanish (Socket.IO) bir marta ulanib, keyin [LOST_AFTER_MS] dan ko'p uzilib tursa — `true`. Qayta ulanishi
 * bilan — `false`. Sahifa ochilishida hali ulanmagan holat hisobga olinmaydi.
 */
export function useConnectionLost(connected: boolean): boolean {
  const [lost, setLost] = useState(false)
  const wasConnected = useRef(false)
  useEffect(() => {
    if (connected) {
      wasConnected.current = true
      return
    }
    if (!wasConnected.current) return
    const timer = window.setTimeout(() => setLost(true), LOST_AFTER_MS)
    // qayta ulandi (yoki sahifa yopildi) — oyna yopiladi
    return () => {
      window.clearTimeout(timer)
      setLost(false)
    }
  }, [connected])
  return lost
}

type StoredNumber = { date: string; value: number }

/** Kassa ko'rgan bugungi eng katta buyurtma raqami (offline'ga o'tishda uzatiladi; sahifa yangilansa ham qoladi). */
export function lastOrderNumber(branchId: ID): number {
  const stored = readJson(lastNumberStorageKey(branchId)) as StoredNumber | null
  return stored?.date === dateKey(new Date()) && Number.isInteger(stored.value) ? stored.value : 0
}

/** Bugungi buyurtmalardan eng kattasini eslab qoladi (kamaymaydi). */
export function rememberOrderNumbers(branchId: ID, orders: Pick<Order, 'number' | 'createdAt'>[]): void {
  const today = dateKey(new Date())
  const max = Math.max(0, ...orders.filter((order) => dateKey(new Date(order.createdAt)) === today).map((order) => order.number))
  if (max > lastOrderNumber(branchId)) writeJson(lastNumberStorageKey(branchId), { date: today, value: max } satisfies StoredNumber)
}

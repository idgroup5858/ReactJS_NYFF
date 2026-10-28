import { useReadyOrders } from '@/api/queries'
import { READY_SHOWN_MS } from '@/domain/rules'
import type { Order } from '@/domain/types'

/**
 * Yaqinda tayyor bo'lganlar (yangisi birinchi) — kassa paneli va oshxona. Server ro'yxatni so'ralgan paytdagi holatda
 * beradi; 5 daqiqasi o'tgani ([now] bo'yicha) qayta so'ramasdan ekrandan o'zi tushadi. `undefined` — hali yuklanmagan.
 */
export function useRecentReady(now: Date): Order[] | undefined {
  const { data } = useReadyOrders()
  if (!data) return undefined
  const since = now.getTime() - READY_SHOWN_MS
  return data.filter((order) => order.readyAt !== null && new Date(order.readyAt).getTime() > since)
}

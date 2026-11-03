import { ApiError } from '@/api/http'
import { offlineApi, offlineLogout } from '@/api/offline'
import { useQuery } from '@/api/query'

/** Kirish muddati tugagan (token eskirgan, kassir ro'yxatdan chiqqan) — qaytadan PIN bilan. */
export function handleOfflineAuth(error: unknown): void {
  if (error instanceof ApiError && error.status === 401) offlineLogout()
}

/** Offline server holati (raqam, sinxronlash) — har 3 soniyada; server javob bermasa `down`. */
export function useOfflineState() {
  const query = useQuery('offline:state', offlineApi.state, { refetchMs: 3_000 })
  return { state: query.data ?? null, down: query.error != null, refresh: query.reload }
}

/** Markazga hali yetib bormagan buyurtmalar — har 4 soniyada (yuborilganlari ro'yxatdan o'zi chiqadi). */
export function useOfflineOrders() {
  const query = useQuery(
    'offline:orders',
    () =>
      offlineApi.orders().catch((error: unknown) => {
        handleOfflineAuth(error)
        throw error
      }),
    { refetchMs: 4_000 },
  )
  return { orders: query.data, reload: query.reload }
}

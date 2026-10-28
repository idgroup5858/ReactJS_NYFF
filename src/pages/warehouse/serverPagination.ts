import { useState } from 'react'
import { PAGE_SIZE } from '@/components/ui/usePagination'
import type { Page } from '@/domain/types'

/** Server sahifalash (`?page=&limit=`): joriy sahifa raqami — `resetKey` (filtrlar) o'zgarsa 1-sahifa. */
export function usePageState(resetKey = '', limit = PAGE_SIZE) {
  const [state, setState] = useState({ key: resetKey, page: 1 })
  const page = state.key === resetKey ? state.page : 1
  const setPage = (next: number) => setState({ key: resetKey, page: next })
  return {
    page,
    limit,
    setPage,
    /** 1-sahifaga qaytish (masalan, yangi yozuv qo'shilgach — u ro'yxat boshida) */
    reset: () => setPage(1),
  }
}

export type PageState = ReturnType<typeof usePageState>

/**
 * Oxirgi kelgan javob: so'rov o'zgarib (boshqa sahifa, filtr, ombor) yangisi yuklanguncha oldingisi ko'rinib turadi —
 * ekran sakramaydi. Faqat birinchi yuklashda `undefined`.
 */
export function useLastData<T>(data: T | undefined): T | undefined {
  const [last, setLast] = useState(data)
  if (data !== undefined && data !== last) setLast(data)
  return data ?? last
}

/**
 * Serverdan kelgan sahifa va `<Pagination {...pagination} />` uchun props. Keyingi sahifa (yoki filtr) yuklanguncha
 * oldingisi ko'rinib turadi (`useLastData`). Ro'yxat qisqarib joriy sahifa yo'qolsa (masalan, kirim tasdiqlandi) —
 * oxirgi mavjud sahifaga o'tiladi.
 */
export function useServerPage<T>(data: Page<T> | undefined, { page, limit, setPage }: PageState) {
  const list = useLastData(data)
  const pages = Math.max(1, Math.ceil((list?.total ?? 0) / limit))
  if (data !== undefined && page > pages) setPage(pages)
  return {
    list,
    pagination: { page: Math.min(page, pages), pageSize: limit, total: list?.total ?? 0, onChange: setPage },
  }
}

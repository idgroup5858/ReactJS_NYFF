import { useState } from 'react'

export const PAGE_SIZE = 10

/**
 * Ro'yxatni sahifalash: joriy sahifa elementlari va `<Pagination {...pagination} />` uchun props. `resetKey` (filtrlar)
 * o'zgarsa — 1-sahifa; ro'yxat qisqarsa (o'chirish) — oxirgi mavjud sahifa; yangi yozuv qo'shilsa joriy sahifa saqlanadi.
 */
export function usePagination<T>(items: T[], resetKey = '', pageSize = PAGE_SIZE) {
  const [state, setState] = useState({ key: resetKey, page: 1 })
  const pages = Math.max(1, Math.ceil(items.length / pageSize))
  const page = Math.min(state.key === resetKey ? state.page : 1, pages)
  return {
    pageItems: items.slice((page - 1) * pageSize, page * pageSize),
    pagination: { page, pageSize, total: items.length, onChange: (next: number) => setState({ key: resetKey, page: next }) },
    /** 1-sahifaga qaytish (masalan, yangi yozuv qo'shilgach — u ro'yxat boshida) */
    reset: () => setState({ key: resetKey, page: 1 }),
  }
}

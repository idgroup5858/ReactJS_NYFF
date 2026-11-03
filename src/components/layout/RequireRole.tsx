import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router'
import { useCurrentUser } from '@/api/session'
import type { Role } from '@/domain/types'

/**
 * Ichki sahifalar faqat shu rollar uchun; kirmagan (yoki boshqa rol) bo'lsa — kirish ekraniga. [login] berilsa —
 * yo'naltirmasdan shu manzilning o'zida kirish oynasi (admin: `/admin` da email va parol); kirgach sahifa ochiladi.
 */
export default function RequireRole({ roles, login }: { roles: Role[]; login?: ReactNode }) {
  const user = useCurrentUser()
  if (!user || !roles.includes(user.role)) return login ?? <Navigate to="/" replace />
  return <Outlet />
}

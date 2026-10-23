import { Navigate, Outlet } from 'react-router'
import { useCurrentUser } from '@/api/session'
import type { Role } from '@/domain/types'

/** Ichki sahifalar faqat shu rollar uchun; kirmagan (yoki boshqa rol) bo'lsa — kirish ekraniga. */
export default function RequireRole({ roles }: { roles: Role[] }) {
  const user = useCurrentUser()
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />
  return <Outlet />
}

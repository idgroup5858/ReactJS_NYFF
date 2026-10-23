import { Outlet } from 'react-router'
import StaffLayout from '@/components/layout/StaffLayout'
import { useBackOfficeNav } from '@/components/layout/useBackOfficeNav'
import { useT } from '@/i18n'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

/** Admin panel qobig'i: chap menyuda — hisobot, kirimlar, menyu, narxlar, filiallar, xodimlar, rasxod va ombor bo'limlari. */
export default function AdminLayout() {
  const t = useT()
  const nav = useBackOfficeNav()
  useDocumentTitle(t.modes.admin.title)

  return (
    <StaffLayout title={t.modes.admin.title} nav={nav}>
      <Outlet />
    </StaffLayout>
  )
}

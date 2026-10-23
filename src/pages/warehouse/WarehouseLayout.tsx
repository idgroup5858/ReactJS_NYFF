import { Outlet } from 'react-router'
import StaffLayout from '@/components/layout/StaffLayout'
import { useBackOfficeNav } from '@/components/layout/useBackOfficeNav'
import { useT } from '@/i18n'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

/** Ombor bo'limi qobig'i: qoldiqlar · kirim · ko'chirish · mahsulotlar (admin uchun chap menyuda admin bo'limlari ham). */
export default function WarehouseLayout() {
  const t = useT()
  const nav = useBackOfficeNav()
  useDocumentTitle(t.modes.supplier.title)

  return (
    <StaffLayout title={t.modes.supplier.title} nav={nav}>
      <Outlet />
    </StaffLayout>
  )
}

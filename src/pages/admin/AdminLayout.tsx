import { Sparkles } from 'lucide-react'
import { Outlet, useNavigate } from 'react-router'
import StaffLayout, { HeaderAction } from '@/components/layout/StaffLayout'
import { useBackOfficeNav } from '@/components/layout/useBackOfficeNav'
import { useT } from '@/i18n'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

/**
 * Admin panel qobig'i: chap menyuda — hisobot, AI yordamchi, buyurtmalar, smenalar, kirimlar, menyu, filiallar, xodimlar,
 * chiqim va ombor bo'limlari; tepada "AI" — istalgan sahifadan AI chatga tezkor o'tish.
 */
export default function AdminLayout() {
  const t = useT()
  const nav = useBackOfficeNav()
  const navigate = useNavigate()
  useDocumentTitle(t.modes.admin.title)

  return (
    <StaffLayout
      title={t.modes.admin.title}
      nav={nav}
      actions={<HeaderAction label={t.ai.headerButton} icon={<Sparkles size={16} />} onClick={() => void navigate('/admin/ai')} compact={false} />}
    >
      <Outlet />
    </StaffLayout>
  )
}

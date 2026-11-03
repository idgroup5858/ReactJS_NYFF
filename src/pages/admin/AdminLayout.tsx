import { Sparkles, UserCog } from 'lucide-react'
import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router'
import StaffLayout, { HeaderAction } from '@/components/layout/StaffLayout'
import { useBackOfficeNav } from '@/components/layout/useBackOfficeNav'
import { useT } from '@/i18n'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import ProfileModal from './ProfileModal'

/**
 * Admin panel qobig'i: chap menyuda — hisobot, AI yordamchi, buyurtmalar, smenalar, kirimlar, menyu, filiallar, xodimlar,
 * chiqim va ombor bo'limlari; tepada "AI" — istalgan sahifadan AI chatga tezkor o'tish, "Profil" — o'z ismi, emaili va
 * paroli.
 */
export default function AdminLayout() {
  const t = useT()
  const nav = useBackOfficeNav()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  useDocumentTitle(t.modes.admin.title)

  return (
    <StaffLayout
      title={t.modes.admin.title}
      nav={nav}
      actions={
        <>
          <HeaderAction label={t.ai.headerButton} icon={<Sparkles size={16} />} onClick={() => void navigate('/admin/ai')} compact={false} />
          <HeaderAction label={t.admin.profile.title} icon={<UserCog size={16} />} onClick={() => setProfileOpen(true)} />
        </>
      }
    >
      <Outlet />
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </StaffLayout>
  )
}

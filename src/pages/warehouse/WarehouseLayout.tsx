import { Settings } from 'lucide-react'
import { useState } from 'react'
import { Navigate, Outlet, useMatch } from 'react-router'
import { useCurrentUser } from '@/api/session'
import StaffLayout, { HeaderAction } from '@/components/layout/StaffLayout'
import { useBackOfficeNav, useWarehouseNav } from '@/components/layout/useBackOfficeNav'
import { useT } from '@/i18n'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { useSettings } from '@/store/settingsStore'
import WarehouseSettingsModal from './WarehouseSettingsModal'

/**
 * Ombor bo'limi qobig'i: qoldiqlar · kirim · ko'chirish · mahsulotlar. Admin — chap menyuda (admin bo'limlari bilan),
 * ta'minotchi — header ostidagi tablarda (planshet: chap menyu ro'yxatlar enini yeb qo'ymasin). Headerdagi "Sozlamalar" —
 * qaysi tablar ko'rinadi (ta'minotchi) va ko'chirish yo'nalishi; shu qurilmada saqlanadi.
 */
export default function WarehouseLayout() {
  const t = useT()
  const isAdmin = useCurrentUser()?.role === 'admin'
  const nav = useBackOfficeNav()
  const tabs = useWarehouseNav()
  const { hiddenWarehouseTabs } = useSettings()
  const visibleTabs = tabs.filter((item) => !hiddenWarehouseTabs.includes(item.tab))
  const atHome = useMatch('/ombor') !== null
  const [settingsOpen, setSettingsOpen] = useState(false)
  useDocumentTitle(t.modes.supplier.title)

  // kirgandan keyin `/ombor` ochiladi — "Qoldiqlar" yashirilgan bo'lsa, birinchi ko'rinib turgan tabga (bittasi doim qoladi)
  if (!isAdmin && atHome && hiddenWarehouseTabs.includes('stock')) return <Navigate to={visibleTabs[0].to} replace />

  return (
    <>
      <StaffLayout
        title={t.modes.supplier.title}
        nav={isAdmin ? nav : undefined}
        tabs={isAdmin ? undefined : visibleTabs}
        actions={<HeaderAction label={t.warehouseSettings.open} icon={<Settings size={16} />} onClick={() => setSettingsOpen(true)} />}
      >
        <Outlet />
      </StaffLayout>
      {settingsOpen && <WarehouseSettingsModal tabs={isAdmin ? undefined : tabs} onClose={() => setSettingsOpen(false)} />}
    </>
  )
}

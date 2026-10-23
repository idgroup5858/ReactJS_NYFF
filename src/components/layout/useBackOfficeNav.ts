import { ArrowLeftRight, BarChart3, Boxes, ClipboardCheck, Package, PackagePlus, Receipt, Store, Tags, Users, UtensilsCrossed } from 'lucide-react'
import { useDb } from '@/api'
import { useCurrentUser } from '@/api/session'
import { lowStockItems } from '@/domain/logic/stock'
import { useT } from '@/i18n'
import type { NavGroup } from './Sidebar'

/**
 * Admin panel va ombor uchun bitta chap menyu: admin ikkala guruhni doim ko'radi (omborga o'tganda admin bo'limlari
 * yo'qolmaydi), ta'minotchi — faqat omborni.
 */
export function useBackOfficeNav(): NavGroup[] {
  const t = useT()
  const db = useDb()
  const user = useCurrentUser()

  const warehouse: NavGroup = {
    title: t.modes.supplier.title,
    items: [
      { to: '/ombor', label: t.stock.nav, icon: Boxes, end: true, badge: lowStockItems(db).length },
      { to: '/ombor/kirim', label: t.purchase.title, icon: PackagePlus },
      { to: '/ombor/kochirish', label: t.transfer.title, icon: ArrowLeftRight },
      { to: '/ombor/mahsulotlar', label: t.ingredients.nav, icon: Package },
    ],
  }
  if (user?.role !== 'admin') return [warehouse]

  const admin: NavGroup = {
    title: t.modes.admin.title,
    items: [
      { to: '/admin', label: t.admin.nav.reports, icon: BarChart3, end: true },
      { to: '/admin/kirimlar', label: t.admin.nav.purchases, icon: ClipboardCheck, badge: db.purchases.filter((p) => p.status === 'pending').length },
      { to: '/admin/menyu', label: t.admin.nav.menu, icon: UtensilsCrossed },
      { to: '/admin/narxlar', label: t.admin.nav.prices, icon: Tags },
      { to: '/admin/filiallar', label: t.admin.nav.branches, icon: Store },
      { to: '/admin/xodimlar', label: t.admin.nav.staff, icon: Users },
      { to: '/admin/rasxodlar', label: t.admin.nav.expenses, icon: Receipt },
    ],
  }
  return [admin, warehouse]
}

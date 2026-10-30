import { ArrowLeftRight, BarChart3, Boxes, ClipboardCheck, Clock, Package, PackagePlus, Receipt, ShoppingBag, Sparkles, Store, Users, UtensilsCrossed } from 'lucide-react'
import { useLowStock, useOverview } from '@/api/queries'
import { useCurrentUser } from '@/api/session'
import { useT } from '@/i18n'
import type { NavGroup } from './Sidebar'

/**
 * Admin panel va ombor uchun bitta chap menyu: admin ikkala guruhni doim ko'radi (omborga o'tganda admin bo'limlari
 * yo'qolmaydi), ta'minotchi — faqat omborni.
 */
export function useBackOfficeNav(): NavGroup[] {
  const t = useT()
  const user = useCurrentUser()
  const isAdmin = user?.role === 'admin'
  // belgilar: admin — umumiy ko'rsatkichlardan; ta'minotchiga overview yopiq (403) — kam qolganlar ro'yxatidan
  const overview = useOverview({ enabled: isAdmin }).data
  const lowStock = useLowStock(undefined, { enabled: user !== null && !isAdmin }).data

  const warehouse: NavGroup = {
    title: t.modes.supplier.title,
    items: [
      { to: '/ombor', label: t.stock.nav, icon: Boxes, end: true, badge: isAdmin ? overview?.lowStock : lowStock?.length },
      { to: '/ombor/kirim', label: t.purchase.title, icon: PackagePlus },
      { to: '/ombor/kochirish', label: t.transfer.title, icon: ArrowLeftRight },
      { to: '/ombor/mahsulotlar', label: t.ingredients.nav, icon: Package },
    ],
  }
  if (!isAdmin) return [warehouse]

  const admin: NavGroup = {
    title: t.modes.admin.title,
    items: [
      { to: '/admin', label: t.admin.nav.reports, icon: BarChart3, end: true },
      { to: '/admin/ai', label: t.admin.nav.ai, icon: Sparkles },
      { to: '/admin/buyurtmalar', label: t.admin.nav.orders, icon: ShoppingBag },
      { to: '/admin/smenalar', label: t.admin.nav.shifts, icon: Clock },
      { to: '/admin/kirimlar', label: t.admin.nav.purchases, icon: ClipboardCheck, badge: overview?.pendingPurchases },
      { to: '/admin/menyu', label: t.admin.nav.menu, icon: UtensilsCrossed },
      { to: '/admin/filiallar', label: t.admin.nav.branches, icon: Store },
      { to: '/admin/xodimlar', label: t.admin.nav.staff, icon: Users },
      { to: '/admin/chiqimlar', label: t.admin.nav.expenses, icon: Receipt },
    ],
  }
  return [admin, warehouse]
}

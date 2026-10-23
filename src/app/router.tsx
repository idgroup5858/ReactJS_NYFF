import { createBrowserRouter, type RouteObject } from 'react-router'
import AppLoading from '@/components/layout/AppLoading'
import RequireRole from '@/components/layout/RequireRole'
import type { Role } from '@/domain/types'
import NotFoundPage from '@/pages/errors/NotFoundPage'
import RouteError from '@/pages/errors/RouteError'
import LoginPage from '@/pages/login/LoginPage'

/** Rol bilan himoyalangan sahifa guruhi. */
function guarded(roles: Role[], children: RouteObject[]): RouteObject {
  return { element: <RequireRole roles={roles} />, children }
}

/**
 * Sahifalar (kirishdan boshqalari kerak bo'lganda yuklanadi — har bir bo'lim alohida fayl):
 *
 *   /                    kirish: ish joyi → filial → xodim → PIN  (`?mode=&branch=&user=`)
 *   /kassa               kassir
 *   /oshxona             oshxona
 *   /tv/:branchId        navbat ekrani (PINsiz)
 *   /kiosk/:branchId     kiosk (PINsiz)
 *   /ombor/*             ta'minotchi (admin ham kiradi)
 *   /admin/*             admin panel
 */
export const router = createBrowserRouter([
  {
    path: '/',
    HydrateFallback: AppLoading,
    ErrorBoundary: RouteError,
    children: [
      { index: true, Component: LoginPage },
      guarded(['cashier'], [{ path: 'kassa', lazy: async () => ({ Component: (await import('@/pages/kassa/KassaPage')).default }) }]),
      guarded(['kitchen'], [{ path: 'oshxona', lazy: async () => ({ Component: (await import('@/pages/kitchen/KitchenPage')).default }) }]),
      guarded(['supplier', 'admin'], [
        {
          path: 'ombor',
          lazy: async () => ({ Component: (await import('@/pages/warehouse/WarehouseLayout')).default }),
          children: [
            { index: true, lazy: async () => ({ Component: (await import('@/pages/warehouse/StockPage')).default }) },
            { path: 'kirim', lazy: async () => ({ Component: (await import('@/pages/warehouse/PurchasesPage')).default }) },
            { path: 'kochirish', lazy: async () => ({ Component: (await import('@/pages/warehouse/TransfersPage')).default }) },
            { path: 'mahsulotlar', lazy: async () => ({ Component: (await import('@/pages/warehouse/IngredientsPage')).default }) },
          ],
        },
      ]),
      guarded(['admin'], [
        {
          path: 'admin',
          lazy: async () => ({ Component: (await import('@/pages/admin/AdminLayout')).default }),
          children: [
            { index: true, lazy: async () => ({ Component: (await import('@/pages/admin/reports/ReportsPage')).default }) },
            { path: 'kirimlar', lazy: async () => ({ Component: (await import('@/pages/admin/PurchaseApprovalPage')).default }) },
            { path: 'menyu', lazy: async () => ({ Component: (await import('@/pages/admin/menu/MenuAdminPage')).default }) },
            { path: 'narxlar', lazy: async () => ({ Component: (await import('@/pages/admin/PricesPage')).default }) },
            { path: 'filiallar', lazy: async () => ({ Component: (await import('@/pages/admin/BranchesPage')).default }) },
            { path: 'xodimlar', lazy: async () => ({ Component: (await import('@/pages/admin/StaffPage')).default }) },
            { path: 'rasxodlar', lazy: async () => ({ Component: (await import('@/pages/admin/ExpensesPage')).default }) },
          ],
        },
      ]),
      { path: 'tv/:branchId', lazy: async () => ({ Component: (await import('@/pages/tv/TvPage')).default }) },
      { path: 'kiosk/:branchId', lazy: async () => ({ Component: (await import('@/pages/kiosk/KioskPage')).default }) },
      { path: '*', Component: NotFoundPage },
    ],
  },
])

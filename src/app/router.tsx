import type { ReactNode } from 'react'
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import AppLoading from '@/components/layout/AppLoading'
import RequireRole from '@/components/layout/RequireRole'
import type { Role } from '@/domain/types'
import NotFoundPage from '@/pages/errors/NotFoundPage'
import RouteError from '@/pages/errors/RouteError'
import AdminLoginPage from '@/pages/login/AdminLoginPage'
import LoginPage from '@/pages/login/LoginPage'

/** Rol bilan himoyalangan sahifa guruhi; [login] — kirmagan bo'lsa shu manzilda ko'rsatiladigan kirish oynasi. */
function guarded(roles: Role[], children: RouteObject[], login?: ReactNode): RouteObject {
  return { element: <RequireRole roles={roles} login={login} />, children }
}

/**
 * Sahifalar (kirishdan boshqalari kerak bo'lganda yuklanadi — har bir bo'lim alohida fayl). Yo'llar `basename` ga
 * nisbatan — serverda xodimlar tizimi `/shorva/` ostida (`vite.config.ts` → `base`; domen ildizida — alohida sahifa),
 * "NYFF Offline" da — ildizda:
 *
 *   /                    kirish: ish joyi → filial → xodim → PIN  (`?mode=&branch=&user=`); TV / kiosk — ish joyi → filial.
 *                        Admin bu yerda yo'q — `/admin` ning o'zida email va parol bilan kiradi
 *   /kassa               kassir
 *   /oshxona             oshpaz yordamchisi — "Tayyor" / "Qaytarish"
 *   /tv/:branchId        navbat ekrani — shu filialniki (PINsiz, filial TV kodi bilan); `/tv` — kirishdagi filial tanlashga
 *   /kiosk/:branchId     kiosk — shu filialniki (PINsiz, filial kiosk kodi bilan); `/kiosk` — kirishdagi filial tanlashga
 *   /ombor/*             ta'minotchi (admin ham kiradi)
 *   /admin/*             admin panel (kirmagan bo'lsa — shu manzilda email va parol oynasi)
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
            {
              // AI yordamchi: chat (tepadagi "AI" tugmasi shu yerga) va Telegram bot sozlamasi — bitta sahifa, ikki tab
              path: 'ai',
              lazy: async () => ({ Component: (await import('@/pages/admin/ai/AiLayout')).default }),
              children: [
                { index: true, lazy: async () => ({ Component: (await import('@/pages/admin/ai/AiChatPage')).default }) },
                { path: 'telegram', lazy: async () => ({ Component: (await import('@/pages/admin/ai/TelegramPage')).default }) },
              ],
            },
            { path: 'buyurtmalar', lazy: async () => ({ Component: (await import('@/pages/admin/orders/OrdersPage')).default }) },
            {
              // ro'yxat → smena → smenadagi buyurtma: ro'yxat ota sahifa bo'lib qoladi (filtrlari saqlanadi)
              path: 'smenalar',
              lazy: async () => ({ Component: (await import('@/pages/admin/shifts/ShiftsPage')).default }),
              children: [
                { path: ':shiftId', lazy: async () => ({ Component: (await import('@/pages/admin/shifts/ShiftDetailPage')).default }) },
                { path: ':shiftId/:orderId', lazy: async () => ({ Component: (await import('@/pages/admin/shifts/ShiftOrderPage')).default }) },
              ],
            },
            { path: 'kirimlar', lazy: async () => ({ Component: (await import('@/pages/admin/AdminPurchasesPage')).default }) },
            { path: 'menyu', lazy: async () => ({ Component: (await import('@/pages/admin/menu/MenuAdminPage')).default }) },
            {
              // filiallar → yetkazib berish xaritasi (ichma-ich, orqaga tugmasi bilan)
              path: 'filiallar',
              lazy: async () => ({ Component: (await import('@/pages/admin/BranchesPage')).default }),
              children: [{ path: 'xarita', lazy: async () => ({ Component: (await import('@/pages/admin/delivery/DeliveryMapPage')).default }) }],
            },
            { path: 'xodimlar', lazy: async () => ({ Component: (await import('@/pages/admin/StaffPage')).default }) },
            { path: 'chiqimlar', lazy: async () => ({ Component: (await import('@/pages/admin/ExpensesPage')).default }) },
          ],
        },
      ], <AdminLoginPage />),
      // kassa kompyuteridagi offline server beradi (internet yo'q paytda); kirish — o'z ekranida (online kassadan yoki PIN)
      { path: 'offline', lazy: async () => ({ Component: (await import('@/pages/offline/OfflineKassaPage')).default }) },
      { path: 'tv/:branchId', lazy: async () => ({ Component: (await import('@/pages/tv/TvPage')).default }) },
      { path: 'kiosk/:branchId', lazy: async () => ({ Component: (await import('@/pages/kiosk/KioskPage')).default }) },
      // filialsiz manzil (eski xatcho'p) — kirish ekranidagi filial tanlashga
      { path: 'tv', element: <Navigate to="/?mode=tv" replace /> },
      { path: 'kiosk', element: <Navigate to="/?mode=kiosk" replace /> },
      { path: '*', Component: NotFoundPage },
    ],
  },
], { basename: import.meta.env.BASE_URL })

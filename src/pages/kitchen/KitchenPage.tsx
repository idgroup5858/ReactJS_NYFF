import { CheckCheck, ChefHat, PartyPopper, ReceiptText, Undo2, type LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router'
import { api } from '@/api'
import { useActiveOrders } from '@/api/queries'
import { useRealtime } from '@/api/realtime'
import { logout, useCurrentUser, useSession } from '@/api/session'
import StaffLayout from '@/components/layout/StaffLayout'
import OrderRow from '@/components/order/OrderRow'
import { useRecentReady } from '@/components/order/useRecentReady'
import type { Order } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { formatOrderNumber } from '@/lib/format'
import { showToast } from '@/lib/swal'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { useNow } from '@/lib/useNow'

function KitchenCard({ order, now }: { order: Order; now: Date }) {
  const t = useT()
  const number = formatOrderNumber(order.number)

  const act = async (action: () => Promise<unknown>, toast: string) => {
    try {
      await action()
      showToast(toast)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  return (
    <OrderRow order={order} now={now} layout="card">
      {order.status === 'preparing' ? (
        <button
          type="button"
          onClick={() => void act(() => api.orders.ready(order.id), t.orders.readyToast(number))}
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded bg-emerald-600 text-sm font-bold text-white uppercase transition-colors hover:bg-emerald-700"
        >
          <CheckCheck size={18} />
          {t.orders.ready}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void act(() => api.orders.reopen(order.id), t.orders.reopenedToast)}
          className="btn-ghost flex h-11 w-full items-center justify-center gap-2 rounded text-sm font-semibold"
        >
          <Undo2 size={16} />
          {t.orders.reopen}
        </button>
      )}
    </OrderRow>
  )
}

/** Ustun sarlavhasi — TV dagidek: ikonka, katta harflar, soni doirada (tayyorda — sariq). */
function ColumnTitle({ icon: Icon, title, count, highlight = false }: { icon: LucideIcon; title: string; count: number; highlight?: boolean }) {
  return (
    <h2 className="mb-4 flex items-center gap-2.5 text-lg font-extrabold tracking-[0.12em] text-neutral-900 uppercase">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coal text-taxi">
        <Icon size={18} />
      </span>
      {title}
      <span className={`rounded-full px-2.5 text-base tabular-nums ${highlight ? 'bg-taxi text-coal' : 'bg-neutral-200 text-neutral-700'}`}>{count}</span>
    </h2>
  )
}

/**
 * Oshxona — oshpaz yordamchisi, TV navbat ekrani tuzilishida (butun ekran): chapda tayyorlanayotganlar — kartochkalar
 * to'ri ekran kengligi bo'ylab; o'ngda bitta ustunda yaqinda tayyor bo'lganlar ("Qaytarish" — adashganini). Navbat
 * oddiy: yangisi oxiriga qo'shiladi (tayyorlanayotganlar — oshxonaga tushgan, tayyorlar — tayyor bo'lgan vaqti bo'yicha).
 * Kartochka ko'rinishi kassa panelidagi qator bilan bir xil; narx, chek va bekor qilish — kassirda.
 * Ro'yxatlar serverdan, socket xabari kelganda (va qayta ulanganda) yangilanadi.
 */
export default function KitchenPage() {
  const t = useT()
  const session = useSession()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const now = useNow(1000)
  useDocumentTitle(t.modes.kitchen.title)
  // huquq bekor bo'ldi (xodim bloklandi, filiali o'zgardi) — kirish ekraniga
  useRealtime(session ? { token: session.token } : null, {
    onAuthError: () => {
      logout()
      void navigate('/', { replace: true })
    },
  })
  const { data: active } = useActiveOrders()
  const recent = useRecentReady(now)
  if (!user?.branchId) return null

  const preparing = (active ?? [])
    .filter((o) => o.status === 'preparing')
    .sort((a, b) => (a.preparingAt ?? a.createdAt).localeCompare(b.preparingAt ?? b.createdAt))
  // server — yangisi birinchi (TV uchun); bu yerda aksincha: yangisi pastga qo'shiladi
  const ready = [...(recent ?? [])].reverse()

  return (
    <StaffLayout title={t.modes.kitchen.title} variant="fill">
      {/* kichik ekranda — ustma-ust, bitta aylantirish; kengida — yonma-yon, har ustun o'zi aylanadi */}
      <div className="h-full overflow-y-auto md:flex md:overflow-hidden">
        <section className="p-4 sm:p-6 md:min-h-0 md:flex-1 md:overflow-y-auto">
          <ColumnTitle icon={ChefHat} title={t.tv.preparing} count={preparing.length} />
          {/* yuklanguncha — bo'sh (yo'q yozuvi chiqmaydi) */}
          {active === undefined ? null : preparing.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <ReceiptText size={36} className="text-neutral-300" />
              <p className="text-sm text-neutral-500">{t.orders.emptyActive}</p>
            </div>
          ) : (
            // ekran kengligiga qarab o'zi: har kartochka kamida 20rem (tor telefonda — butun kenglik), qolgani teng bo'linadi
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),1fr))] gap-3">
              {preparing.map((order) => (
                <KitchenCard key={order.id} order={order} now={now} />
              ))}
            </ul>
          )}
        </section>

        <section className="surface border-t border-neutral-200 p-4 sm:p-6 md:min-h-0 md:w-96 md:shrink-0 md:overflow-y-auto md:border-t-0 md:border-l">
          <ColumnTitle icon={PartyPopper} title={t.tv.ready} count={ready.length} highlight />
          {recent === undefined ? null : ready.length === 0 ? (
            <p className="py-16 text-center text-sm text-neutral-400">{t.tv.readyEmpty}</p>
          ) : (
            <ul className="space-y-3">
              {ready.map((order) => (
                <KitchenCard key={order.id} order={order} now={now} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </StaffLayout>
  )
}

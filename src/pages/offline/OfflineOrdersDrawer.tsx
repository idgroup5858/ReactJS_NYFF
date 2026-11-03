import { CheckCheck, ChefHat, Printer, ReceiptText, X } from 'lucide-react'
import { useEffect } from 'react'
import { offlineApi } from '@/api/offline'
import OrderRow from '@/components/order/OrderRow'
import { SectionTitle } from '@/components/ui/Card'
import type { Menu, Order } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { formatMoney, formatOrderNumber } from '@/lib/format'
import { printKitchen, printReceipt } from '@/lib/printReceipt'
import { confirmDialog, showToast } from '@/lib/swal'
import { useNow } from '@/lib/useNow'
import { handleOfflineAuth } from './useOffline'

type Props = {
  orders: Order[] | undefined
  branchName: string
  /** oshxona chekida ichimliklarni ajratish uchun (taom → kategoriya) */
  menu: Menu | null
  /** amal bajarilgach ro'yxatni qayta olish */
  onChanged: () => void
  onClose: () => void
}

const ICON_BUTTON = 'btn-ghost flex h-9 w-9 items-center justify-center rounded'

/**
 * Offline buyurtmalar (markazga hali yetib bormaganlari): oshxona ekrani ishlamaydi — "Tayyor"ni kassir bosadi; chek
 * va bekor qilish. Markazga yuborilgani ro'yxatdan chiqadi (u endi online kassada).
 */
export default function OfflineOrdersDrawer({ orders, branchName, menu, onChanged, onClose }: Props) {
  const t = useT()
  const now = useNow(1000)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const act = async (action: () => Promise<unknown>, toast: string) => {
    try {
      await action()
      showToast(toast)
    } catch (error) {
      handleOfflineAuth(error)
      showToast(errorMessage(error), 'error')
    } finally {
      onChanged()
    }
  }

  const cancel = async (order: Order) => {
    const number = formatOrderNumber(order.number)
    if (!(await confirmDialog(t.orders.cancelTitle(number), t.offline.cancelText, t.orders.cancel))) return
    await act(() => offlineApi.cancel(order.id), t.orders.cancelledToast)
  }

  // tayyorlanayotganlar tepada (eskisi birinchi), keyin tayyor va bekor qilinganlar (yangisi birinchi)
  const list = [...(orders ?? [])].sort((a, b) => {
    const rank = (order: Order) => (order.status === 'preparing' ? 0 : 1)
    return rank(a) - rank(b) || (rank(a) === 0 ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt))
  })

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="page-enter flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 py-2.5 pr-3 pl-5">
          <SectionTitle>{t.offline.orders}</SectionTitle>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X size={18} />
          </button>
        </div>
        <p className="shrink-0 border-b border-neutral-200 bg-neutral-50 px-5 py-2 text-xs text-neutral-500">{t.offline.ordersHint}</p>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {orders !== undefined && list.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <ReceiptText size={36} className="text-neutral-300" />
              <p className="text-sm text-neutral-500">{t.offline.empty}</p>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-200">
              {list.map((order) => (
                <OrderRow key={order.id} order={order} now={now}>
                  <span className="text-sm font-bold text-neutral-950 tabular-nums">{formatMoney(order.total, t)}</span>
                  <div className="flex gap-1.5">
                    {order.status === 'preparing' && (
                      <button
                        type="button"
                        onClick={() => void act(() => offlineApi.ready(order.id), t.offline.readyToast(formatOrderNumber(order.number)))}
                        className="flex h-9 cursor-pointer items-center gap-1.5 rounded bg-emerald-600 px-3 text-xs font-bold text-white uppercase transition-colors hover:bg-emerald-700"
                      >
                        <CheckCheck size={14} />
                        {t.orders.ready}
                      </button>
                    )}
                    {/* qayta chiqarish (qog'oz tiqildi, chek yo'qoldi) — har biri alohida */}
                    {order.status !== 'cancelled' && (
                      <>
                        <button type="button" onClick={() => printReceipt(order, branchName)} aria-label={t.orders.printReceipt} title={t.orders.printReceipt} className={ICON_BUTTON}>
                          <Printer size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => printKitchen(order, branchName, menu)}
                          aria-label={t.orders.printKitchen}
                          title={t.orders.printKitchen}
                          className={ICON_BUTTON}
                        >
                          <ChefHat size={16} />
                        </button>
                      </>
                    )}
                    {order.status !== 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => void cancel(order)}
                        aria-label={t.orders.cancel}
                        title={t.orders.cancel}
                        className="btn-icon-danger flex h-9 w-9 items-center justify-center rounded"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </OrderRow>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

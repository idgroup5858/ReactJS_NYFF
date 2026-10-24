import { Banknote, CheckCheck, Printer, ReceiptText, Undo2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, useDb } from '@/api'
import { KioskBadge, OrderTypeBadge, StatusPill } from '@/components/order/OrderBadges'
import { PAYMENT_ICONS } from '@/components/order/orderIcons'
import { SectionTitle } from '@/components/ui/Card'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { activeOrders, recentReady } from '@/domain/logic/orders'
import { shiftSummary } from '@/domain/logic/shifts'
import { PAYMENT_METHODS, type ID, type Order, type PaymentMethod, type PaymentSplit } from '@/domain/types'
import { errorMessage, useLocalize, useT } from '@/i18n'
import { formatMoney, formatOrderNumber, formatTime } from '@/lib/format'
import { printReceipt } from '@/lib/printReceipt'
import { confirmDialog, showToast } from '@/lib/swal'
import { formatElapsed, useNow } from '@/lib/useNow'
import PaymentModal from './PaymentModal'

export type OrdersTab = 'kiosk' | 'preparing' | 'shift'

type Props = {
  branchId: ID
  branchName: string
  shiftId: ID | null
  userId: ID
  initialTab: OrdersTab
  onClose: () => void
}

type RowProps = {
  order: Order
  userId: ID
  branchName: string
  now: Date
  onAccept: (order: Order) => void
}

const ICON_BUTTON = 'btn-ghost flex h-9 w-9 items-center justify-center rounded'

function OrderRow({ order, userId, branchName, now, onAccept }: RowProps) {
  const t = useT()
  const localize = useLocalize()
  const number = formatOrderNumber(order.number)
  const hasNotes = order.note !== '' || order.items.some((item) => item.note !== '')

  const act = async (action: () => Promise<unknown>, toast: string) => {
    try {
      await action()
      showToast(toast)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  const cancel = async () => {
    if (!(await confirmDialog(t.orders.cancelTitle(number), t.orders.cancelText, t.orders.cancel))) return
    await act(() => api.orders.cancel(order.id, userId), t.orders.cancelledToast)
  }

  const accent =
    order.status === 'pending' ? 'border-l-taxi bg-brand-50/60' : order.status === 'ready' ? 'border-l-emerald-500 bg-emerald-50/50' : 'border-l-transparent'

  return (
    <li className={`flex gap-3 border-l-4 px-4 py-3 ${accent}`}>
      <div className="w-16 shrink-0">
        <p className="text-xl font-black text-neutral-950 tabular-nums">{number}</p>
        <p className="text-xs text-neutral-400 tabular-nums">
          {order.status === 'preparing' && order.preparingAt ? formatElapsed(order.preparingAt, now) : formatTime(order.createdAt)}
        </p>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill status={order.status} />
          <OrderTypeBadge type={order.type} />
          {order.source === 'kiosk' && <KioskBadge />}
        </div>
        <p className="text-sm text-neutral-700">{order.items.map((item) => `${item.qty}× ${localize(item.name)}`).join(', ')}</p>
        {hasNotes && (
          <p className="text-xs text-red-700">
            {[...order.items.filter((item) => item.note).map((item) => `${localize(item.name)}: ${item.note}`), order.note].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="text-sm font-bold text-neutral-950 tabular-nums">{formatMoney(order.total, t)}</span>
        <div className="flex gap-1.5">
          {order.status === 'pending' && (
            <button type="button" onClick={() => onAccept(order)} className="btn-primary flex h-9 items-center gap-1.5 rounded px-3 text-xs font-bold uppercase">
              <Banknote size={14} />
              {t.orders.accept}
            </button>
          )}
          {order.status === 'preparing' && (
            <button
              type="button"
              onClick={() => void act(() => api.orders.ready(order.id), t.orders.readyToast(number))}
              className="flex h-9 cursor-pointer items-center gap-1.5 rounded bg-emerald-600 px-3 text-xs font-bold text-white uppercase transition-colors hover:bg-emerald-700"
            >
              <CheckCheck size={14} />
              {t.orders.ready}
            </button>
          )}
          {order.status === 'ready' && (
            <button
              type="button"
              onClick={() => void act(() => api.orders.reopen(order.id), t.orders.reopenedToast)}
              aria-label={t.orders.reopen}
              title={t.orders.reopen}
              className={ICON_BUTTON}
            >
              <Undo2 size={16} />
            </button>
          )}
          {order.status !== 'pending' && order.status !== 'cancelled' && (
            <button type="button" onClick={() => printReceipt(order, branchName)} aria-label={t.orders.print} title={t.orders.print} className={ICON_BUTTON}>
              <Printer size={16} />
            </button>
          )}
          {order.status !== 'cancelled' && (
            <button
              type="button"
              onClick={() => void cancel()}
              aria-label={t.orders.cancel}
              title={t.orders.cancel}
              className="btn-icon-danger flex h-9 w-9 items-center justify-center rounded"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

function OrderList({ orders, empty, ...row }: Omit<RowProps, 'order'> & { orders: Order[]; empty?: string }) {
  if (orders.length === 0) {
    if (!empty) return null
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
        <ReceiptText size={36} className="text-neutral-300" />
        <p className="text-sm text-neutral-500">{empty}</p>
      </div>
    )
  }
  return (
    <ul className="divide-y divide-neutral-200">
      {orders.map((order) => (
        <OrderRow key={order.id} order={order} {...row} />
      ))}
    </ul>
  )
}

/**
 * O'ngdan ochiladigan panel. Kioskdan — kassada to'lanadigan buyurtmalar (pulini olib tasdiqlanadi → chek → oshxona).
 * Tayyorlanmoqda — oshxona ovqatni olib kelganda "Tayyor" (raqam TV ga chiqadi); yaqinda tayyor bo'lganlarni qaytarish
 * mumkin. Smenam — kassirning shu smenadagi savdosi.
 */
export default function OrdersDrawer({ branchId, branchName, shiftId, userId, initialTab, onClose }: Props) {
  const t = useT()
  const db = useDb()
  const now = useNow(1000)
  const [tab, setTab] = useState<OrdersTab>(initialTab)
  const [accepting, setAccepting] = useState<Order | null>(null)

  useEffect(() => {
    if (accepting) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, accepting])

  const active = activeOrders(db, branchId)
  const pending = active.filter((o) => o.status === 'pending')
  const preparing = active.filter((o) => o.status === 'preparing')
  const ready = recentReady(db, branchId, now)
  const shiftOrders = shiftId ? db.orders.filter((o) => o.shiftId === shiftId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : []
  const summary = shiftId ? shiftSummary(db, shiftId) : null
  const row = { userId, branchName, now, onAccept: setAccepting }

  const accept = async (payment: PaymentMethod, split?: PaymentSplit): Promise<Order | null> => {
    if (!accepting) return null
    try {
      const order = await api.orders.confirm(accepting.id, userId, payment, split)
      printReceipt(order, branchName)
      return order
    } catch (error) {
      showToast(errorMessage(error), 'error')
      return null
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="page-enter flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 py-2.5 pr-3 pl-5">
          <SectionTitle>{t.orders.title}</SectionTitle>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X size={18} />
          </button>
        </div>

        <div className="shrink-0 border-b border-neutral-200 px-5 py-3">
          <SegmentedControl<OrdersTab>
            label={t.orders.title}
            value={tab}
            onChange={setTab}
            options={[
              { value: 'kiosk', label: `${t.orders.kioskTab} · ${pending.length}` },
              { value: 'preparing', label: `${t.orders.preparingTab} · ${preparing.length}` },
              { value: 'shift', label: `${t.orders.shift} · ${shiftOrders.length}` },
            ]}
          />
        </div>

        {tab === 'shift' && summary && (
          <div className="grid shrink-0 grid-cols-4 gap-px border-b border-neutral-200 bg-neutral-200">
            {PAYMENT_METHODS.map((method) => {
              const Icon = PAYMENT_ICONS[method]
              return (
                <div key={method} className="bg-white px-3 py-2">
                  <p className="flex items-center gap-1 text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">
                    <Icon size={12} />
                    {t.payment[method]}
                  </p>
                  <p className="text-sm font-bold tabular-nums">{formatMoney(summary.byPayment[method], t)}</p>
                </div>
              )
            })}
            <div className="bg-brand-50 px-3 py-2">
              <p className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">{t.kassa.total}</p>
              <p className="text-sm font-extrabold tabular-nums">{formatMoney(summary.total, t)}</p>
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === 'kiosk' && <OrderList orders={pending} empty={t.orders.emptyKiosk} {...row} />}
          {tab === 'preparing' && (
            <>
              <OrderList orders={preparing} empty={ready.length === 0 ? t.orders.emptyActive : undefined} {...row} />
              {ready.length > 0 && (
                <>
                  <p className="border-y border-neutral-200 bg-neutral-50 px-5 py-1.5 text-[10px] font-bold tracking-[0.14em] text-neutral-500 uppercase">
                    {t.orders.justReady}
                  </p>
                  <OrderList orders={ready} {...row} />
                </>
              )}
            </>
          )}
          {tab === 'shift' && <OrderList orders={shiftOrders} empty={t.orders.emptyShift} {...row} />}
        </div>
      </div>

      {accepting && (
        <PaymentModal
          total={accepting.total}
          orderType={accepting.type}
          title={`${t.orders.kioskTab} ${formatOrderNumber(accepting.number)}`}
          onConfirm={accept}
          onClose={() => setAccepting(null)}
        />
      )}
    </div>
  )
}

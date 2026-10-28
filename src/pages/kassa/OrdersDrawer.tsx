import { Banknote, Check, Printer, ReceiptText, Undo2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '@/api'
import { useActiveOrders, useDeliveryOrders, useShift } from '@/api/queries'
import OrderRow from '@/components/order/OrderRow'
import { PAYMENT_ICONS } from '@/components/order/orderIcons'
import { useRecentReady } from '@/components/order/useRecentReady'
import { SectionTitle } from '@/components/ui/Card'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { canReleaseCourier } from '@/domain/rules'
import { PAYMENT_METHODS, type ID, type Order, type PaymentMethod, type PaymentSplit } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { formatMoney, formatOrderNumber } from '@/lib/format'
import { printReceipt } from '@/lib/printReceipt'
import { confirmDialog, showToast } from '@/lib/swal'
import { useNow } from '@/lib/useNow'
import CouriersOnDuty from './CouriersOnDuty'
import PaymentModal from './PaymentModal'

export type OrdersTab = 'online' | 'kiosk' | 'preparing' | 'delivery' | 'shift'

type Props = {
  branchName: string
  shiftId: ID | null
  initialTab: OrdersTab
  onClose: () => void
}

type RowProps = {
  order: Order
  branchName: string
  now: Date
  onAccept: (order: Order) => void
}

const ICON_BUTTON = 'btn-ghost flex h-9 w-9 items-center justify-center rounded'

/**
 * Kassir tugmalari: pulini olish / qabul qilish, chek, kuryerdan olish (dostavka), bekor qilish. "Tayyor" va "Qaytarish" —
 * oshpaz yordamchisida.
 */
function CashierRow({ order, branchName, now, onAccept }: RowProps) {
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

  const cancel = async () => {
    if (!(await confirmDialog(t.orders.cancelTitle(number), t.orders.cancelText, t.orders.cancel))) return
    await act(() => api.orders.cancel(order.id), t.orders.cancelledToast)
  }

  // "Yetkazib bo'lmadi" bilan qaytgan yoki kuryer olib qolib ketgan dostavka — yana kuryerlarning "Yangi" ro'yxatiga
  const releaseCourier = async () => {
    if (!(await confirmDialog(t.courier.releaseTitle(number), t.courier.releaseText, t.courier.release))) return
    await act(() => api.orders.releaseCourier(order.id), t.courier.releasedToast(number))
  }

  // to'lov — mijoz ilovada tanlagani (server `online.payment` dan oladi)
  const acceptOnline = async () => {
    if (!order.online) return
    await act(async () => {
      const accepted = await api.orders.confirm(order.id)
      printReceipt(accepted, branchName)
    }, t.orders.acceptedToast(number))
  }

  return (
    <OrderRow order={order} now={now} showCustomer>
      <span className="text-sm font-bold text-neutral-950 tabular-nums">{formatMoney(order.total, t)}</span>
      <div className="flex gap-1.5">
        {order.status === 'pending' && order.online && (
          // mobil buyurtma: to'lov usulini mijoz tanlagan — oynasiz, darhol oshxonaga (chek chiqadi)
          <button type="button" onClick={() => void acceptOnline()} className="btn-primary flex h-9 items-center gap-1.5 rounded px-3 text-xs font-bold uppercase">
            <Check size={14} />
            {t.orders.acceptOnline}
          </button>
        )}
        {order.status === 'pending' && !order.online && (
          <button type="button" onClick={() => onAccept(order)} className="btn-primary flex h-9 items-center gap-1.5 rounded px-3 text-xs font-bold uppercase">
            <Banknote size={14} />
            {t.orders.accept}
          </button>
        )}
        {order.status !== 'pending' && order.status !== 'cancelled' && (
          <button type="button" onClick={() => printReceipt(order, branchName)} aria-label={t.orders.print} title={t.orders.print} className={ICON_BUTTON}>
            <Printer size={16} />
          </button>
        )}
        {canReleaseCourier(order) && (
          <button
            type="button"
            onClick={() => void releaseCourier()}
            className={`btn-ghost flex h-9 items-center gap-1.5 rounded px-3 text-xs font-bold uppercase ${order.returnedAt ? 'text-red-700' : ''}`}
          >
            <Undo2 size={14} />
            {t.courier.release}
          </button>
        )}
        {/* yetkazilgan dostavkani bekor qilib bo'lmaydi (server ham tekshiradi) */}
        {order.status !== 'cancelled' && !order.deliveredAt && (
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
    </OrderRow>
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
        <CashierRow key={order.id} order={order} {...row} />
      ))}
    </ul>
  )
}

/**
 * O'ngdan ochiladigan panel. Online — mobil ilovadan kelganlar (mijoz, telefon, manzil; "Qabul qilish" → chek →
 * oshxona). Kioskdan — kassada to'lanadigan buyurtmalar (pulini olib tasdiqlanadi → chek → oshxona).
 * Tayyorlanmoqda — oshxonadagilar va yaqinda tayyor bo'lganlar: kassir faqat kuzatadi ("Tayyor" / "Qaytarish" — oshpaz
 * yordamchisining ekranida, `/oshxona`). Dostavka — kuryer ishidagi mobil dostavkalar (kuryer kutayotgan, olingan,
 * yo'ldagi, "Yetkazib bo'lmadi" bilan qaytgan): kassir kuryerdan oladi yoki bekor qiladi. Smenam — kassirning shu
 * smenadagi savdosi.
 */
export default function OrdersDrawer({ branchName, shiftId, initialTab, onClose }: Props) {
  const t = useT()
  const now = useNow(1000)
  const { data: active } = useActiveOrders()
  const ready = useRecentReady(now)
  const { data: deliveries } = useDeliveryOrders()
  const { data: shift } = useShift(shiftId)
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

  // yuklanguncha ro'yxatlar bo'sh, "buyurtma yo'q" yozuvi ham chiqmaydi
  const loaded = active !== undefined
  const list = active ?? []
  const pending = list.filter((o) => o.status === 'pending' && o.source !== 'mobile')
  const online = list.filter((o) => o.status === 'pending' && o.source === 'mobile')
  const preparing = list.filter((o) => o.status === 'preparing')
  const recent = ready ?? []
  // qaytganlar tepada — kassir ularni hal qilishi kerak
  const delivery = [...(deliveries ?? [])].sort((a, b) => Number(!!b.returnedAt) - Number(!!a.returnedAt))
  // smenaning buyurtmalari va tushumi — serverdan (yangisi birinchi)
  const shiftOrders = shift ? [...shift.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : []
  const summary = shift?.summary ?? null
  const row = { branchName, now, onAccept: setAccepting }

  const accept = async (payment: PaymentMethod, split?: PaymentSplit): Promise<Order | null> => {
    if (!accepting) return null
    try {
      const order = await api.orders.confirm(accepting.id, payment, split)
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
              { value: 'online', label: `${t.orders.onlineTab} · ${online.length}` },
              { value: 'kiosk', label: `${t.orders.kioskTab} · ${pending.length}` },
              { value: 'preparing', label: `${t.orders.preparingTab} · ${preparing.length}` },
              { value: 'delivery', label: `${t.courier.tab} · ${delivery.length}` },
              { value: 'shift', label: `${t.orders.shift} · ${shiftOrders.length}` },
            ]}
          />
        </div>

        {tab === 'delivery' && <CouriersOnDuty />}

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
          {tab === 'online' && <OrderList orders={online} empty={loaded ? t.orders.emptyOnline : undefined} {...row} />}
          {tab === 'kiosk' && <OrderList orders={pending} empty={loaded ? t.orders.emptyKiosk : undefined} {...row} />}
          {tab === 'preparing' && (
            <>
              <OrderList orders={preparing} empty={loaded && ready !== undefined && recent.length === 0 ? t.orders.emptyActive : undefined} {...row} />
              {recent.length > 0 && (
                <>
                  <p className="border-y border-neutral-200 bg-neutral-50 px-5 py-1.5 text-[10px] font-bold tracking-[0.14em] text-neutral-500 uppercase">
                    {t.orders.justReady}
                  </p>
                  <OrderList orders={recent} {...row} />
                </>
              )}
            </>
          )}
          {tab === 'delivery' && <OrderList orders={delivery} empty={deliveries ? t.courier.empty : undefined} {...row} />}
          {tab === 'shift' && <OrderList orders={shiftOrders} empty={shift || shiftId === null ? t.orders.emptyShift : undefined} {...row} />}
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

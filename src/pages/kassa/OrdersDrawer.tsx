import { HandPlatter, ReceiptText, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, useDb } from '@/api'
import { KioskBadge, OrderTypeBadge, StatusPill } from '@/components/order/OrderBadges'
import { PAYMENT_ICONS } from '@/components/order/orderIcons'
import { SectionTitle } from '@/components/ui/Card'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { activeOrders } from '@/domain/logic/orders'
import { shiftSummary } from '@/domain/logic/shifts'
import { PAYMENT_METHODS, type ID, type Order } from '@/domain/types'
import { errorMessage, useLocalize, useT } from '@/i18n'
import { formatMoney, formatOrderNumber, formatTime } from '@/lib/format'
import { confirmDialog, showToast } from '@/lib/swal'

type Tab = 'active' | 'shift'

type Props = {
  branchId: ID
  shiftId: ID | null
  userId: ID
  onClose: () => void
}

function OrderRow({ order, userId }: { order: Order; userId: ID }) {
  const t = useT()
  const localize = useLocalize()
  const number = formatOrderNumber(order.number)
  const canCancel = order.status !== 'served' && order.status !== 'cancelled'
  const hasNotes = order.note !== '' || order.items.some((item) => item.note !== '')

  const serve = async () => {
    try {
      await api.orders.advance(order.id, 'ready')
      showToast(t.orders.servedToast)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  const cancel = async () => {
    if (!(await confirmDialog(t.orders.cancelTitle(number), t.orders.cancelText, t.orders.cancel))) return
    try {
      await api.orders.cancel(order.id, userId)
      showToast(t.orders.cancelledToast)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  return (
    <li className={`flex gap-3 border-l-4 px-4 py-3 ${order.status === 'ready' ? 'border-l-emerald-500 bg-emerald-50/50' : 'border-l-transparent'}`}>
      <div className="w-16 shrink-0">
        <p className="text-xl font-black text-neutral-950 tabular-nums">{number}</p>
        <p className="text-xs text-neutral-400 tabular-nums">{formatTime(order.createdAt)}</p>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill status={order.status} />
          <OrderTypeBadge type={order.type} />
          {order.source === 'kiosk' && <KioskBadge />}
        </div>
        <p className="text-sm text-neutral-700">
          {order.items.map((item) => `${item.qty}× ${localize(item.name)}`).join(', ')}
        </p>
        {hasNotes && (
          <p className="text-xs text-red-700">
            {[...order.items.filter((item) => item.note).map((item) => `${localize(item.name)}: ${item.note}`), order.note].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="text-sm font-bold text-neutral-950 tabular-nums">{formatMoney(order.total, t)}</span>
        <div className="flex gap-1.5">
          {order.status === 'ready' && (
            <button type="button" onClick={() => void serve()} className="btn-primary flex h-9 items-center gap-1.5 rounded px-3 text-xs font-bold uppercase">
              <HandPlatter size={14} />
              {t.orders.serve}
            </button>
          )}
          {canCancel && (
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

/** O'ngdan ochiladigan panel: filialning faol buyurtmalari (kiosknikilari ham) va kassirning shu smenasi. */
export default function OrdersDrawer({ branchId, shiftId, userId, onClose }: Props) {
  const t = useT()
  const db = useDb()
  const [tab, setTab] = useState<Tab>('active')

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const active = activeOrders(db, branchId)
  const shiftOrders = shiftId ? db.orders.filter((o) => o.shiftId === shiftId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : []
  const summary = shiftId ? shiftSummary(db, shiftId) : null
  const list = tab === 'active' ? active : shiftOrders

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
          <SegmentedControl<Tab>
            label={t.orders.title}
            value={tab}
            onChange={setTab}
            options={[
              { value: 'active', label: `${t.orders.active} · ${active.length}` },
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
          {list.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <ReceiptText size={36} className="text-neutral-300" />
              <p className="text-sm text-neutral-500">{tab === 'active' ? t.orders.emptyActive : t.orders.emptyShift}</p>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-200">
              {list.map((order) => (
                <OrderRow key={order.id} order={order} userId={userId} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

import { MessageSquareWarning, Timer } from 'lucide-react'
import { useRef, useState } from 'react'
import { KioskBadge, OrderTypeBadge } from '@/components/order/OrderBadges'
import type { Order } from '@/domain/types'
import { useLocalize, useT } from '@/i18n'
import { formatOrderNumber, formatTime } from '@/lib/format'
import { formatElapsed, minutesSince } from '@/lib/useNow'

/** Ikki bosish orasidagi eng ko'p vaqt. */
const DOUBLE_TAP_MS = 450

type Props = {
  order: Order
  now: Date
  /** ikki marta bosildi */
  onDoubleTap: (order: Order) => void
}

/**
 * Oshxona kartochkasi. Yangi — oq (qora sarlavha), tayyorlanmoqda — sariq; izohli buyurtma tanasi och qizil.
 * Ikki marta bosish (sichqoncha yoki sensor) keyingi qadamga o'tkazadi; bir marta bosilsa — "yana bir marta" ishorasi.
 */
export default function KitchenCard({ order, now, onDoubleTap }: Props) {
  const t = useT()
  const localize = useLocalize()
  const lastTap = useRef(0)
  const [armed, setArmed] = useState(false)
  const armTimer = useRef<number | undefined>(undefined)

  const preparing = order.status === 'preparing'
  const hasNotes = order.note !== '' || order.items.some((item) => item.note !== '')
  const waited = minutesSince(order.createdAt, now)
  const fresh = waited < 0.25

  const tap = () => {
    const at = Date.now()
    window.clearTimeout(armTimer.current)
    if (at - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0
      setArmed(false)
      onDoubleTap(order)
      return
    }
    lastTap.current = at
    setArmed(true)
    armTimer.current = window.setTimeout(() => setArmed(false), DOUBLE_TAP_MS + 300)
  }

  const header = preparing ? 'bg-taxi text-coal' : 'bg-coal text-white'
  const body = hasNotes ? 'bg-red-50' : preparing ? 'bg-brand-50' : 'bg-white'
  const frame = hasNotes ? 'border-red-300' : preparing ? 'border-taxi' : 'border-neutral-200'
  const timerTone = waited >= 15 ? 'bg-red-600 text-white' : waited >= 10 ? 'bg-select text-white' : preparing ? 'bg-coal/10' : 'bg-white/15'

  return (
    <button
      type="button"
      onClick={tap}
      aria-label={`${formatOrderNumber(order.number)} — ${preparing ? t.kitchen.hintPreparing : t.kitchen.hintNew}`}
      className={`relative flex h-full min-h-0 w-full cursor-pointer touch-manipulation flex-col overflow-hidden rounded-card border-2 text-left shadow-card transition-transform select-none active:scale-[0.99] ${frame} ${armed ? 'ring-4 ring-select' : ''} ${fresh ? 'animate-pulse' : ''}`}
    >
      <div className={`flex shrink-0 items-center gap-3 px-4 py-2.5 ${header}`}>
        <span className="text-3xl font-black tabular-nums">{formatOrderNumber(order.number)}</span>
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <OrderTypeBadge type={order.type} className="text-xs" />
          {order.source === 'kiosk' && <KioskBadge />}
        </span>
        <span className={`flex items-center gap-1 rounded-chip px-2 py-1 text-sm font-bold tabular-nums ${timerTone}`}>
          <Timer size={14} />
          {formatElapsed(order.createdAt, now)}
        </span>
      </div>

      <div className={`min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3 ${body}`}>
        <ul className="space-y-1.5">
          {order.items.map((item, index) => (
            <li key={`${item.productId}-${index}`}>
              <p className="text-lg leading-snug font-bold text-neutral-950">
                <span className="mr-1.5 inline-block min-w-8 rounded-chip bg-coal px-1.5 text-center text-taxi tabular-nums">{item.qty}×</span>
                {localize(item.name)}
              </p>
              {item.note && (
                <p className="mt-0.5 flex items-center gap-1.5 pl-1 text-sm font-semibold text-red-700">
                  <MessageSquareWarning size={14} className="shrink-0" />
                  {item.note}
                </p>
              )}
            </li>
          ))}
        </ul>
        {order.note && (
          <p className="rounded-card border border-red-200 bg-white/70 px-3 py-2 text-sm font-semibold text-red-700">
            <span className="mr-1 text-[10px] tracking-[0.16em] text-red-500 uppercase">{t.kitchen.orderNote}:</span>
            {order.note}
          </p>
        )}
      </div>

      <div className={`flex shrink-0 items-center justify-between gap-2 border-t px-4 py-2 text-xs font-semibold ${hasNotes ? 'border-red-200 bg-red-50 text-red-800' : preparing ? 'border-brand-200 bg-brand-50 text-brand-800' : 'border-neutral-100 bg-white text-neutral-500'}`}>
        <span>{armed ? t.kitchen.tapAgain : preparing ? t.kitchen.hintPreparing : t.kitchen.hintNew}</span>
        {preparing && order.preparingAt && (
          <span className="tabular-nums">
            {t.kitchen.startedAt} {formatTime(order.preparingAt)}
          </span>
        )}
      </div>
    </button>
  )
}

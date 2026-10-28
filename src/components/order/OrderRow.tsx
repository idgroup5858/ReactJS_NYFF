import { MapPin, Phone, Timer, User } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Order } from '@/domain/types'
import { useLocalize, useT } from '@/i18n'
import { formatOnlinePayment, formatOrderNumber, formatTime } from '@/lib/format'
import { formatElapsed, minutesSince } from '@/lib/useNow'
import { CourierLine } from './CourierStatus'
import { OrderTypeBadge, SourceBadge, StatusPill } from './OrderBadges'

/** Shuncha daqiqadan ko'p tayyorlanayotgan buyurtma taymeri qizil — kechikkan. */
const LATE_MINUTES = 15

type Props = {
  order: Order
  now: Date
  /** online buyurtmada mijoz, telefon, manzil, to'lovi va kuryer holati — kassada kerak, oshxonada emas */
  showCustomer?: boolean
  /** `row` — ro'yxat qatori, tugmalar o'ngda (kassa paneli); `card` — to'r kartochkasi, tugmalar pastda (oshxona) */
  layout?: 'row' | 'card'
  /** amal tugmalari (kassada — summa ham) */
  children: ReactNode
}

/**
 * Buyurtma — kassa paneli va oshxona ekranida bir xil: chapda raqam, ochilgan vaqti va tayyorlanayotganda o'tgan vaqt;
 * yonida holat, tur, manba, taomlar va izohlar; tugmalar — har ekranning o'zi beradi.
 */
export default function OrderRow({ order, now, showCustomer = false, layout = 'row', children }: Props) {
  const t = useT()
  const localize = useLocalize()

  const accent =
    order.status === 'pending' ? 'border-l-taxi bg-brand-50/60' : order.status === 'ready' ? 'border-l-emerald-500 bg-emerald-50/50' : 'border-l-transparent'

  const details = (
    <div className="flex min-w-0 flex-1 gap-3">
      <div className="w-20 shrink-0 space-y-0.5">
        <p className="text-xl font-black text-neutral-950 tabular-nums">{formatOrderNumber(order.number)}</p>
        {/* qachon ochilgani — har doim; tayyorlanayotganda ostida to'langandan beri o'tgan vaqt (kechiksa — qizil) */}
        <p className="text-xs font-semibold text-neutral-600 tabular-nums" title={t.orders.placedAt}>
          {formatTime(order.createdAt)}
        </p>
        {order.status === 'preparing' && order.preparingAt && (
          <p
            className={`flex items-center gap-1 text-xs tabular-nums ${minutesSince(order.preparingAt, now) >= LATE_MINUTES ? 'font-bold text-red-600' : 'text-neutral-400'}`}
            title={t.orders.cookingFor}
          >
            <Timer size={12} className="shrink-0" />
            {formatElapsed(order.preparingAt, now)}
          </p>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill status={order.status} online={!!order.online} />
          <OrderTypeBadge type={order.type} />
          <SourceBadge source={order.source} />
        </div>
        <p className="text-sm text-neutral-700">{order.items.map((item) => `${item.qty}× ${localize(item.name)}`).join(', ')}</p>
        {showCustomer && order.online && (
          <div className="space-y-0.5 rounded bg-sky-50 px-2.5 py-1.5 text-xs text-sky-950">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-semibold">
              {order.online.name && (
                <span className="flex items-center gap-1">
                  <User size={12} className="text-sky-600" />
                  {order.online.name}
                </span>
              )}
              <a href={`tel:${order.online.phone}`} className="flex items-center gap-1 tabular-nums hover:underline">
                <Phone size={12} className="text-sky-600" />
                {order.online.phone}
              </a>
            </p>
            {order.online.address && (
              <p className="flex items-start gap-1">
                <MapPin size={12} className="mt-0.5 shrink-0 text-sky-600" />
                {order.online.address}
              </p>
            )}
            <p className={`font-bold ${order.online.payment === 'click' ? 'text-emerald-700' : 'text-amber-700'}`}>{formatOnlinePayment(order.online, order.type, t)}</p>
            <CourierLine order={order} />
          </div>
        )}
        {order.note && <p className="text-xs text-red-700">{order.note}</p>}
      </div>
    </div>
  )

  if (layout === 'card') {
    // rang (tayyor — yashil) oq kartochka ustida, kassadagi qator bilan bir xil; tugmalar har doim pastda
    return (
      <li className="surface overflow-hidden rounded-card border border-line shadow-card">
        <div className={`flex h-full flex-col gap-3 border-l-4 p-3 ${accent}`}>
          {details}
          {children}
        </div>
      </li>
    )
  }

  return (
    <li className={`flex gap-3 border-l-4 px-4 py-3 ${accent}`}>
      {details}
      <div className="flex shrink-0 flex-col items-end gap-2">{children}</div>
    </li>
  )
}

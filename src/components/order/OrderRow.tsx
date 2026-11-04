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
  /** `row` — ro'yxat qatori (kassa paneli); `card` — to'r kartochkasi, tugmalar pastda (oshxona) */
  layout?: 'row' | 'card'
  /** belgilar qatorining o'ng chetida (kassada — summa) */
  amount?: ReactNode
  /** amal tugmalari */
  children: ReactNode
}

/**
 * Buyurtma — kassa paneli va oshxona ekranida bir xil: chapda raqam, ochilgan vaqti va tayyorlanayotganda o'tgan vaqt;
 * yonida holat, tur, manba (o'ng chetida summa), taomlar va izohlar; tugmalar — har ekranning o'zi beradi.
 * `row` da tugmalar sig'sa taomlar yonida, sig'masa (yoki mijoz bloki bo'lsa) — pastda o'ngda: matn hech qachon siqilmaydi.
 */
export default function OrderRow({ order, now, showCustomer = false, layout = 'row', amount, children }: Props) {
  const t = useT()
  const localize = useLocalize()

  const accent =
    order.status === 'pending' ? 'border-l-taxi bg-brand-50/60' : order.status === 'ready' ? 'border-l-emerald-500 bg-emerald-50/50' : 'border-l-transparent'

  const customer = showCustomer ? order.online : undefined

  const number = (
    <div className="w-16 shrink-0 space-y-0.5">
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
  )

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusPill status={order.status} online={!!order.online} />
        <OrderTypeBadge type={order.type} />
        <SourceBadge source={order.source} />
      </div>
      {amount && <div className="shrink-0">{amount}</div>}
    </div>
  )

  const body = (
    <>
      <p className="text-sm text-neutral-700">{order.items.map((item) => `${item.qty}× ${localize(item.name)}`).join(', ')}</p>
      {customer && (
        <div className="space-y-1 rounded bg-sky-50 px-2.5 py-1.5 text-xs text-sky-950">
          {/* aloqa va to'lov — bitta qatorda */}
          <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-semibold">
            {customer.name && (
              <span className="flex items-center gap-1">
                <User size={12} className="text-sky-600" />
                {customer.name}
              </span>
            )}
            <a href={`tel:${customer.phone}`} className="flex items-center gap-1 whitespace-nowrap tabular-nums hover:underline">
              <Phone size={12} className="text-sky-600" />
              {customer.phone}
            </a>
            <span className={`font-bold ${customer.payment === 'click' ? 'text-emerald-700' : 'text-amber-700'}`}>{formatOnlinePayment(customer, order.type, t)}</span>
          </p>
          {customer.address && (
            <p className="flex items-start gap-1">
              <MapPin size={12} className="mt-0.5 shrink-0 text-sky-600" />
              {customer.address}
            </p>
          )}
          <CourierLine order={order} />
        </div>
      )}
      {order.note && <p className="text-xs text-red-700">{order.note}</p>}
    </>
  )

  if (layout === 'card') {
    // rang (tayyor — yashil) oq kartochka ustida, kassadagi qator bilan bir xil; tugmalar har doim pastda
    return (
      <li className="surface overflow-hidden rounded-card border border-line shadow-card">
        <div className={`flex h-full flex-col gap-3 border-l-4 p-3 ${accent}`}>
          <div className="flex min-w-0 flex-1 gap-3">
            {number}
            <div className="min-w-0 flex-1 space-y-1.5">
              {header}
              {body}
            </div>
          </div>
          {children}
        </div>
      </li>
    )
  }

  return (
    <li className={`flex gap-3 border-l-4 px-4 py-3 ${accent}`}>
      {number}
      <div className="min-w-0 flex-1 space-y-1.5">
        {header}
        {/* tugmalar yonida joy qolmasa (≥14rem) — o'zi pastki qatorga o'tadi; mijoz bloki doim to'liq kenglikda */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className={`space-y-1.5 ${customer ? 'min-w-0 basis-full' : 'min-w-56 flex-1'}`}>{body}</div>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">{children}</div>
        </div>
      </div>
    </li>
  )
}

import { Banknote, CircleCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { OrderTypeBadge } from '@/components/order/OrderBadges'
import type { CustomerOrder } from '@/domain/types'
import { useT } from '@/i18n'
import { formatMoney, formatOrderNumber } from '@/lib/format'

/** Shuncha soniyadan keyin bosh ekranga qaytadi. */
const AUTO_RETURN_SECONDS = 20

/**
 * Buyurtma qabul qilindi: katta raqam (TV da shu chiqadi), "Rahmat", avtomatik bosh ekranga qaytish. Kassada to'lanadigan
 * buyurtmada — "Kassaga boring": raqamni aytib to'laydi.
 */
export default function KioskDone({ order, onDone }: { order: CustomerOrder; onDone: () => void }) {
  const t = useT()
  const [left, setLeft] = useState(AUTO_RETURN_SECONDS)
  const unpaid = order.status === 'pending'

  useEffect(() => {
    const timer = window.setInterval(() => setLeft((value) => value - 1), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (left <= 0) onDone()
  }, [left, onDone])

  return (
    <div className="flex flex-1 items-center justify-center px-4 pb-10">
      <div className="page-enter w-full max-w-xl space-y-6 text-center">
        {unpaid ? <Banknote size={72} className="mx-auto text-select" /> : <CircleCheck size={72} className="mx-auto text-emerald-600" />}
        <h1 className="text-5xl font-black text-neutral-950">{unpaid ? t.kiosk.goToCounter : t.kiosk.thanks}</h1>
        <div className="rounded-card bg-coal px-6 py-8 text-white shadow-float">
          <p className="text-sm font-bold tracking-[0.24em] text-white/60 uppercase">{t.kiosk.yourNumber}</p>
          <p className="mt-2 text-8xl font-black text-taxi tabular-nums sm:text-9xl">{formatOrderNumber(order.number)}</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <OrderTypeBadge type={order.type} className="text-sm" />
            <span className="text-lg font-bold tabular-nums">{formatMoney(order.total, t)}</span>
          </div>
        </div>
        <p className="text-lg text-neutral-600">{unpaid ? t.kiosk.goToCounterText : t.kiosk.watchTv}</p>
        <button type="button" onClick={onDone} className="btn-primary h-16 w-full max-w-sm rounded text-lg font-extrabold">
          {t.kiosk.newOrder}
        </button>
        <p className="text-sm text-neutral-400 tabular-nums">{t.kiosk.autoReturn(Math.max(0, left))}</p>
      </div>
    </div>
  )
}

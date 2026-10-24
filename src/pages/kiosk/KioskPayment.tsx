import { ArrowLeft, Banknote, CreditCard, Nfc, Smartphone } from 'lucide-react'
import { useState } from 'react'
import { OrderTypeBadge } from '@/components/order/OrderBadges'
import { SectionTitle } from '@/components/ui/Card'
import type { OrderType, PaymentMethod } from '@/domain/types'
import { useT } from '@/i18n'
import { formatMoney } from '@/lib/format'

type Props = {
  total: number
  orderType: OrderType
  onBack: () => void
  /** buyurtma yaratiladi (`null` — kassada to'laydi); xato bo'lsa xabar ko'rsatilgan, `false` */
  onPay: (method: PaymentMethod | null) => Promise<boolean>
}

/** Karta / Click — shu yerda; `counter` — kassada (naqd yoki karta), buyurtma kassirni kutadi. */
type Method = 'card' | 'click' | 'counter'

/** QR o'rnidagi bezak — 21×21 katakli naqsh (haqiqiy to'lov yo'q, demo). */
function FakeQr() {
  const cells = Array.from({ length: 21 * 21 }, (_, index) => {
    const x = index % 21
    const y = Math.floor(index / 21)
    const finder = (cx: number, cy: number) => x >= cx && x < cx + 7 && y >= cy && y < cy + 7 && (x === cx || x === cx + 6 || y === cy || y === cy + 6 || (x >= cx + 2 && x <= cx + 4 && y >= cy + 2 && y <= cy + 4))
    if (finder(0, 0) || finder(14, 0) || finder(0, 14)) return true
    if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) return false
    return (x * 7 + y * 13 + x * y) % 5 < 2
  })
  return (
    <div className="grid h-48 w-48 grid-cols-[repeat(21,1fr)] rounded-card bg-white p-3 shadow-card">
      {cells.map((on, index) => (
        <span key={index} className={on ? 'bg-coal' : ''} />
      ))}
    </div>
  )
}

/**
 * To'lov (mobil ilovadagi "Order Confirmation"): karta yoki Click tanlanadi → ko'rsatma (terminal / QR) →
 * "To'lovni tasdiqlash". Yoki "Kassada to'layman" → "Buyurtma berish": raqam oladi va kassada to'laydi.
 */
export default function KioskPayment({ total, orderType, onBack, onPay }: Props) {
  const t = useT()
  const [method, setMethod] = useState<Method | null>(null)
  const [busy, setBusy] = useState(false)

  const options: { value: Method; icon: typeof CreditCard; title: string; hint: string }[] = [
    { value: 'card', icon: CreditCard, title: t.kiosk.payCard, hint: t.kiosk.payCardHint },
    { value: 'click', icon: Smartphone, title: t.kiosk.payClick, hint: t.kiosk.payClickHint },
    { value: 'counter', icon: Banknote, title: t.kiosk.payCounter, hint: t.kiosk.payCounterHint },
  ]

  const pay = async () => {
    if (!method || busy) return
    setBusy(true)
    const ok = await onPay(method === 'counter' ? null : method)
    if (!ok) setBusy(false)
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl flex-1 items-start gap-6 px-4 pt-2 pb-10 sm:px-8 lg:grid-cols-2">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} aria-label={t.common.back} className="btn-icon flex h-12 w-12 items-center justify-center rounded">
            <ArrowLeft size={22} />
          </button>
          <SectionTitle as="h1" className="text-2xl!">{t.kiosk.payTitle}</SectionTitle>
        </div>
        <div className="surface flex items-end justify-between gap-3 rounded-card border border-line p-5 shadow-card">
          <OrderTypeBadge type={orderType} className="text-sm" />
          <span className="text-right">
            <span className="block text-[11px] font-bold tracking-[0.2em] text-neutral-400 uppercase">{t.kiosk.total}</span>
            <span className="block text-4xl font-black tabular-nums">{formatMoney(total, t)}</span>
          </span>
        </div>
        <div className="space-y-3" role="radiogroup" aria-label={t.kiosk.payTitle}>
          {options.map(({ value, icon: Icon, title, hint }) => {
            const active = value === method
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setMethod(value)}
                className={`flex w-full cursor-pointer items-center gap-4 rounded-card border-2 bg-white p-4 text-left shadow-card transition-colors ${active ? 'border-select bg-brand-50' : 'border-transparent hover:border-neutral-200'}`}
              >
                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${active ? 'bg-coal text-taxi' : 'bg-neutral-100 text-neutral-500'}`}>
                  <Icon size={26} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xl font-extrabold">{title}</span>
                  <span className="block text-sm text-neutral-500">{hint}</span>
                </span>
                <span className={`h-6 w-6 shrink-0 rounded-full border-2 ${active ? 'border-select bg-select shadow-[inset_0_0_0_4px_white]' : 'border-neutral-300'}`} />
              </button>
            )
          })}
        </div>
      </div>

      <div className="surface flex min-h-[420px] flex-col items-center justify-center gap-6 rounded-card border border-line p-8 text-center shadow-card">
        {method === 'click' ? (
          <>
            <FakeQr />
            <p className="text-xl font-bold">{t.kiosk.clickInstruction}</p>
          </>
        ) : method === 'counter' ? (
          <>
            <span className="flex h-40 w-40 items-center justify-center rounded-full bg-coal text-taxi">
              <Banknote size={72} />
            </span>
            <p className="text-xl font-bold">{t.kiosk.counterInstruction}</p>
          </>
        ) : (
          <>
            <span className={`flex h-40 w-40 items-center justify-center rounded-full bg-coal text-taxi ${method === 'card' ? 'animate-pulse' : 'opacity-30'}`}>
              <Nfc size={72} />
            </span>
            <p className="text-xl font-bold">{t.kiosk.cardInstruction}</p>
          </>
        )}
        <button
          type="button"
          onClick={() => void pay()}
          disabled={!method || busy}
          className="btn-primary flex h-16 w-full max-w-sm items-center justify-center rounded text-lg font-extrabold"
        >
          {method === 'counter' ? t.kiosk.placeOrder : t.kiosk.confirmPay}
        </button>
        {method !== 'counter' && <p className="text-xs text-neutral-400">{t.kiosk.demoNote}</p>}
      </div>
    </div>
  )
}

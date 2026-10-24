import { CircleCheck, Split } from 'lucide-react'
import { useState } from 'react'
import { OrderTypeBadge } from '@/components/order/OrderBadges'
import { PAYMENT_ICONS } from '@/components/order/orderIcons'
import Modal from '@/components/ui/Modal'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { PAYMENT_METHODS, type Order, type OrderType, type PaymentMethod, type PaymentSplit } from '@/domain/types'
import { useT } from '@/i18n'
import { formatMoney, formatNumber, formatOrderNumber } from '@/lib/format'

type Props = {
  total: number
  orderType: OrderType
  /** sarlavha (kiosk buyurtmasini tasdiqlashda — uning raqami) */
  title?: string
  /** buyurtmani yaratadi; xato bo'lsa (xabar ko'rsatilgan) — `null` */
  onConfirm: (payment: PaymentMethod, split?: PaymentSplit) => Promise<Order | null>
  onClose: () => void
}

/** Naqd uchun tez summalar: aniq summa va undan kattaroq yaxlit summalar. */
function quickAmounts(total: number): number[] {
  const rounded = [10_000, 50_000, 100_000, 200_000].map((step) => Math.ceil(total / step) * step)
  return [...new Set([total, ...rounded])].filter((value) => value >= total).slice(0, 4)
}

/** Aralash to'lovda naqd qismi uchun tez summalar: yarmi (mingga yaxlitlangan) va jamidan kichik yaxlit summalar. */
function splitAmounts(total: number): number[] {
  const half = Math.round(total / 2 / 1000) * 1000 || Math.floor(total / 2)
  return [...new Set([half, 20_000, 50_000, 100_000])].filter((value) => value > 0 && value < total).slice(0, 4)
}

/** Aralash: summaning bir qismi naqd, qolgani karta yoki Click orqali. */
type Mode = PaymentMethod | 'mixed'

/**
 * To'lov: tur tanlanadi (naqdda — qaytim hisoblanadi; aralashda — naqd qismi kiritiladi, qolgani karta / Click) →
 * buyurtma oshxonaga ketadi (chek chiqadi) → katta raqam ko'rsatiladi. Kassa savdosida ham, kiosk buyurtmasini
 * tasdiqlashda ham shu oyna.
 */
export default function PaymentModal({ total, orderType, title, onConfirm, onClose }: Props) {
  const t = useT()
  const [method, setMethod] = useState<Mode>('cash')
  const [received, setReceived] = useState('')
  const [cashPart, setCashPart] = useState('')
  const [restMethod, setRestMethod] = useState<'card' | 'click'>('card')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ order: Order; change: number } | null>(null)

  const receivedAmount = received === '' ? null : Number(received)
  const change = method === 'cash' && receivedAmount !== null ? receivedAmount - total : 0
  const notEnough = method === 'cash' && receivedAmount !== null && receivedAmount < total

  const cashAmount = Number(cashPart || 0)
  const rest = total - cashAmount
  const splitInvalid = method === 'mixed' && !(cashAmount > 0 && cashAmount < total)
  const blocked = busy || notEnough || splitInvalid

  const confirm = async () => {
    if (blocked) return
    setBusy(true)
    const order = method === 'mixed' ? await onConfirm('cash', { cash: cashAmount, [restMethod]: rest }) : await onConfirm(method)
    setBusy(false)
    if (order) setDone({ order, change: Math.max(0, change) })
  }

  if (done) {
    return (
      <Modal
        title={t.checkout.successTitle}
        onClose={onClose}
        size="sm"
        footer={
          <button type="button" autoFocus onClick={onClose} className="btn-primary h-12 w-full rounded text-sm font-bold tracking-[0.14em] uppercase">
            {t.checkout.next}
          </button>
        }
      >
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <CircleCheck size={40} className="text-emerald-700" />
          <p className="text-[10px] font-semibold tracking-[0.2em] text-neutral-400 uppercase">{t.checkout.orderNumber}</p>
          <p className="text-6xl font-black text-neutral-950 tabular-nums">{formatOrderNumber(done.order.number)}</p>
          <OrderTypeBadge type={done.order.type} className="text-sm" />
          {done.order.split ? (
            <p className="flex flex-wrap justify-center gap-x-3 text-sm text-neutral-600">
              {PAYMENT_METHODS.filter((m) => done.order.split?.[m]).map((m) => (
                <span key={m} className="whitespace-nowrap">
                  {t.payment[m]} <span className="font-bold text-neutral-950">{formatMoney(done.order.split?.[m] ?? 0, t)}</span>
                </span>
              ))}
            </p>
          ) : (
            done.order.payment && (
            <p className="text-sm text-neutral-600">
              {t.payment[done.order.payment]} · <span className="font-bold text-neutral-950">{formatMoney(done.order.total, t)}</span>
            </p>
            )
          )}
          {done.change > 0 && (
            <p className="rounded bg-brand-50 px-3 py-1.5 text-sm">
              {t.checkout.change}: <span className="font-extrabold tabular-nums">{formatMoney(done.change, t)}</span>
            </p>
          )}
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      title={title ?? t.checkout.title}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={() => void confirm()}
          disabled={blocked}
          className="btn-primary h-12 w-full rounded text-sm font-bold tracking-[0.1em] uppercase"
        >
          {t.checkout.confirm}
        </button>
      }
    >
      <div className="space-y-5">
        <div className="flex items-end justify-between gap-3">
          <OrderTypeBadge type={orderType} className="text-sm" />
          <span className="text-right">
            <span className="block text-[10px] font-semibold tracking-[0.2em] text-neutral-400 uppercase">{t.checkout.toPay}</span>
            <span className="block text-3xl font-black text-neutral-950 tabular-nums">{formatMoney(total, t)}</span>
          </span>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-[0.2em] text-neutral-400 uppercase">{t.checkout.method}</p>
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={t.checkout.method}>
            {[...PAYMENT_METHODS, 'mixed' as const].map((value) => {
              const Icon = value === 'mixed' ? Split : PAYMENT_ICONS[value]
              const active = value === method
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setMethod(value)}
                  className={`flex h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded border px-1 text-sm font-bold whitespace-nowrap transition-colors ${active ? 'border-select bg-brand-50 text-neutral-950 ring-1 ring-select' : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'}`}
                >
                  <Icon size={20} className={active ? 'text-select' : 'text-neutral-400'} />
                  {value === 'mixed' ? t.checkout.mixed : t.payment[value]}
                </button>
              )
            })}
          </div>
        </div>

        {method === 'mixed' && (
          <div className="space-y-2">
            <label className="block text-[10px] font-semibold tracking-[0.2em] text-neutral-400 uppercase" htmlFor="cash-part">
              {t.checkout.cashPart}
            </label>
            <input
              id="cash-part"
              autoFocus
              inputMode="numeric"
              autoComplete="off"
              value={cashPart === '' ? '' : formatNumber(Number(cashPart))}
              onChange={(event) => setCashPart(event.target.value.replace(/\D/g, '').slice(0, 9))}
              placeholder="0"
              className="h-12 w-full rounded border border-neutral-300 bg-white px-3 text-right text-xl font-bold tabular-nums"
            />
            <div className="grid grid-cols-4 gap-2">
              {splitAmounts(total).map((amount, index) => (
                <button key={amount} type="button" onClick={() => setCashPart(String(amount))} className="btn-ghost h-9 rounded text-xs font-semibold tabular-nums">
                  {index === 0 ? t.checkout.half : formatNumber(amount)}
                </button>
              ))}
            </div>
            {/* qolgan summa — karta yoki Click */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded bg-neutral-50 px-3 py-2.5">
              <span className="text-sm text-neutral-600">{t.checkout.rest}</span>
              <SegmentedControl<'card' | 'click'>
                label={t.checkout.rest}
                value={restMethod}
                onChange={setRestMethod}
                options={(['card', 'click'] as const).map((value) => ({ value, label: t.payment[value] }))}
              />
              <span className="ml-auto text-lg font-extrabold whitespace-nowrap text-neutral-950 tabular-nums">{formatMoney(Math.max(0, rest), t)}</span>
            </div>
            {splitInvalid && cashPart !== '' && <p className="text-sm font-semibold text-red-700">{t.checkout.splitInvalid}</p>}
          </div>
        )}

        {method === 'cash' && (
          <div className="space-y-2">
            <label className="block text-[10px] font-semibold tracking-[0.2em] text-neutral-400 uppercase" htmlFor="received">
              {t.checkout.received}
            </label>
            <input
              id="received"
              inputMode="numeric"
              autoComplete="off"
              value={received === '' ? '' : formatNumber(Number(received))}
              onChange={(event) => setReceived(event.target.value.replace(/\D/g, '').slice(0, 9))}
              placeholder={formatNumber(total)}
              className="h-12 w-full rounded border border-neutral-300 bg-white px-3 text-right text-xl font-bold tabular-nums"
            />
            <div className="grid grid-cols-4 gap-2">
              {quickAmounts(total).map((amount, index) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setReceived(String(amount))}
                  className="btn-ghost h-9 rounded text-xs font-semibold tabular-nums"
                >
                  {index === 0 ? t.checkout.exact : formatNumber(amount)}
                </button>
              ))}
            </div>
            <p className={`flex justify-between text-sm ${notEnough ? 'font-semibold text-red-700' : 'text-neutral-600'}`}>
              <span>{notEnough ? t.checkout.notEnough : t.checkout.change}</span>
              {!notEnough && <span className="font-extrabold text-neutral-950 tabular-nums">{formatMoney(Math.max(0, change), t)}</span>}
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}

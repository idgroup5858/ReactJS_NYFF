import { ChevronRight, Plus, ShoppingCart, Trash2, Wallet, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { ORDER_TYPE_ICONS } from '@/components/order/orderIcons'
import FoodImage from '@/components/ui/FoodImage'
import QtyStepper from '@/components/ui/QtyStepper'
import type { MenuProduct, OrderType } from '@/domain/types'
import { useLocalize, useT } from '@/i18n'
import { formatMoney } from '@/lib/format'
import type { CartLine } from '@/lib/cart'

export interface PricedLine extends CartLine {
  product: Pick<MenuProduct, 'name' | 'image'>
  /** `null` — taom savatga qo'shilgandan keyin sotuvdan olingan (yoki menyudan butunlay chiqarilgan) */
  price: number | null
}

/** Kassada dostavka yo'q — u faqat mobil ilovadan keladi (manzil, joylashuv, kuryer). */
const KASSA_ORDER_TYPES: OrderType[] = ['dine_in', 'takeaway']

type Props = {
  /** tepadagi ochiq cheklar tablari */
  tabs: ReactNode
  lines: PricedLine[]
  total: number
  orderType: OrderType
  onOrderType: (type: OrderType) => void
  orderNote: string
  onOrderNote: (note: string) => void
  onChangeQty: (key: string, delta: number) => void
  onRemove: (key: string) => void
  onClear: () => void
  onPay: () => void
}

/** O'ng panel: ochiq cheklar, buyurtma turi, taomlar (ixcham qatorlar), buyurtmaga izoh va jami summali "To'lash" — faol chek uchun. */
export default function CartPanel(props: Props) {
  const { tabs, lines, total, orderType, onOrderType, orderNote, onOrderNote, onChangeQty, onRemove, onClear, onPay } = props
  const t = useT()
  const localize = useLocalize()
  const [orderNoteOpen, setOrderNoteOpen] = useState(false)

  const count = lines.reduce((sum, line) => sum + line.qty, 0)
  const blocked = lines.length === 0 || lines.some((line) => line.price === null)

  return (
    <aside className="surface m-3 flex max-h-[55vh] shrink-0 flex-col overflow-hidden rounded-card border border-line shadow-card lg:mb-3 lg:ml-0 lg:max-h-none lg:w-[360px] xl:w-[400px] 2xl:w-[440px]">
      <div className="flex shrink-0 items-center gap-2 border-b border-neutral-200/70 px-3 py-2.5">
        {tabs}
        {lines.length > 0 && (
          <button type="button" onClick={onClear} aria-label={t.kassa.clearCart} title={t.kassa.clearCart} className="btn-icon-danger flex h-8 w-8 shrink-0 items-center justify-center rounded">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* buyurtma turi — ixcham segmentli tanlov (boshqa sahifalardagi SegmentedControl uslubida, to'liq kenglikda) */}
      <div className="shrink-0 border-b border-neutral-200/70 px-3 py-2">
        <div className="grid grid-cols-2 gap-1 rounded bg-neutral-200/70 p-1" role="radiogroup" aria-label={t.kassa.orderType}>
          {KASSA_ORDER_TYPES.map((type) => {
            const Icon = ORDER_TYPE_ICONS[type]
            const active = type === orderType
            return (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onOrderType(type)}
                className={`flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded text-xs font-bold transition-colors ${active ? 'bg-taxi text-coal shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
              >
                <Icon size={15} />
                {t.orderType[type]}
              </button>
            )
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {lines.length === 0 ? (
          <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 px-6 text-center">
            <ShoppingCart size={36} className="text-neutral-300" />
            <p className="text-sm font-semibold text-neutral-700">{t.kassa.emptyCart}</p>
            <p className="text-xs text-neutral-500">{t.kassa.emptyCartHint}</p>
          </div>
        ) : (
          // qatorlar ingichka chiziq bilan ajratilgan — mavzuda kartochka soyasi bo'lmasa ham taomlar qo'shilib ketmasin
          <ul className="divide-y divide-neutral-200 px-3">
            {lines.map((line) => (
              <li key={line.key} className="flex gap-2.5 py-2">
                <FoodImage src={line.product.image} alt="" className="h-11 w-11 shrink-0 rounded-media" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm leading-tight font-semibold text-neutral-950">{localize(line.product.name)}</p>
                    <p className={`shrink-0 text-sm leading-tight font-bold tabular-nums ${line.price === null ? 'text-red-700' : 'text-neutral-950'}`}>
                      {line.price !== null ? formatMoney(line.price * line.qty, t) : '—'}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <QtyStepper size="sm" value={line.qty} onChange={(delta) => onChangeQty(line.key, delta)} />
                    <span className={`min-w-0 flex-1 truncate text-xs tabular-nums ${line.price === null ? 'font-semibold text-red-700' : 'text-neutral-500'}`}>
                      {line.price !== null ? formatMoney(line.price, t) : t.menu.unavailable}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemove(line.key)}
                      aria-label={t.kassa.remove}
                      title={t.kassa.remove}
                      className="btn-icon-danger flex h-7 w-7 shrink-0 items-center justify-center rounded"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="shrink-0 space-y-2.5 border-t border-neutral-200/70 px-3 py-2.5">
        {orderNoteOpen || orderNote ? (
          <textarea
            value={orderNote}
            onChange={(event) => onOrderNote(event.target.value)}
            placeholder={t.kassa.orderNotePlaceholder}
            rows={2}
            maxLength={200}
            className="w-full resize-none rounded-card border border-neutral-300 bg-white px-3 py-2 text-sm text-red-700"
          />
        ) : (
          <button
            type="button"
            onClick={() => setOrderNoteOpen(true)}
            className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-neutral-500 transition-colors hover:text-neutral-950"
          >
            <Plus size={14} />
            {t.kassa.orderNote}
          </button>
        )}
        {/* menyu ostidagi "Kioskdan" tugmasi uslubida: sariq blok, qora doirada sariq ikonka; jami summa — tugmaning o'zida */}
        <button
          type="button"
          onClick={onPay}
          disabled={blocked}
          className="group flex w-full cursor-pointer items-center gap-3 rounded-card bg-taxi p-3 text-left text-coal shadow-card transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-coal text-taxi">
            <Wallet size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg leading-tight font-extrabold">{t.kassa.pay}</span>
            <span className="block truncate text-xs text-coal/70">{t.kassa.itemsCount(count)}</span>
          </span>
          <span className="shrink-0 text-xl font-extrabold whitespace-nowrap tabular-nums">{formatMoney(total, t)}</span>
          <ChevronRight size={22} className="shrink-0 transition-transform group-enabled:group-hover:translate-x-1" />
        </button>
      </div>
    </aside>
  )
}

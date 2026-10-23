import { MessageSquareText, Plus, ShoppingCart, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { ORDER_TYPE_ICONS } from '@/components/order/orderIcons'
import { SectionTitle } from '@/components/ui/Card'
import FoodImage from '@/components/ui/FoodImage'
import QtyStepper from '@/components/ui/QtyStepper'
import { ORDER_TYPES, type OrderType, type Product } from '@/domain/types'
import { useLocalize, useT } from '@/i18n'
import { formatMoney } from '@/lib/format'
import type { CartLine } from '@/lib/cart'

export interface PricedLine extends CartLine {
  product: Product
  /** `null` — taom savatga qo'shilgandan keyin sotuvdan olingan */
  price: number | null
}

type Props = {
  lines: PricedLine[]
  total: number
  orderType: OrderType
  onOrderType: (type: OrderType) => void
  orderNote: string
  onOrderNote: (note: string) => void
  onChangeQty: (key: string, delta: number) => void
  onNote: (key: string, note: string) => void
  onRemove: (key: string) => void
  onClear: () => void
  onPay: () => void
}

/** O'ng panel: buyurtma turi, taomlar (soni, izohi), buyurtmaga izoh, jami va "To'lash". */
export default function CartPanel(props: Props) {
  const { lines, total, orderType, onOrderType, orderNote, onOrderNote, onChangeQty, onNote, onRemove, onClear, onPay } = props
  const t = useT()
  const localize = useLocalize()
  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set())
  const [orderNoteOpen, setOrderNoteOpen] = useState(false)

  const toggleNote = (key: string) =>
    setOpenNotes((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const count = lines.reduce((sum, line) => sum + line.qty, 0)
  const blocked = lines.length === 0 || lines.some((line) => line.price === null)

  return (
    <aside className="surface m-3 flex max-h-[55vh] shrink-0 flex-col overflow-hidden rounded-card border border-line shadow-card lg:mb-3 lg:ml-0 lg:max-h-none lg:w-[360px] xl:w-[400px] 2xl:w-[440px]">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200/70 px-4 py-3">
        <SectionTitle>{t.kassa.newOrder}</SectionTitle>
        {lines.length > 0 && (
          <button type="button" onClick={onClear} className="btn-ghost flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-semibold">
            <Trash2 size={14} />
            {t.kassa.clearCart}
          </button>
        )}
      </div>

      <div className="shrink-0 border-b border-neutral-200/70 px-4 py-3">
        <p className="mb-2 text-[10px] font-semibold tracking-[0.2em] text-neutral-400 uppercase">{t.kassa.orderType}</p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t.kassa.orderType}>
          {ORDER_TYPES.map((type) => {
            const Icon = ORDER_TYPE_ICONS[type]
            const active = type === orderType
            return (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onOrderType(type)}
                className={`flex h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-card border text-xs font-bold transition-colors ${active ? 'border-select bg-brand-50 text-neutral-950 ring-1 ring-select' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'}`}
              >
                <Icon size={18} className={active ? 'text-select' : 'text-neutral-400'} />
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
          <ul className="space-y-2 p-3">
            {lines.map((line) => {
              const noteOpen = openNotes.has(line.key) || line.note !== ''
              return (
                <li key={line.key} className="rounded-card bg-white p-3 shadow-card">
                  <div className="flex items-start gap-3">
                    <FoodImage src={line.product.image} alt="" className="h-12 w-12 shrink-0 rounded-media" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug font-semibold text-neutral-950">{localize(line.product.name)}</p>
                      <p className="text-xs text-neutral-500 tabular-nums">
                        {line.price !== null ? `${formatMoney(line.price, t)} × ${line.qty}` : t.menu.unavailable}
                      </p>
                    </div>
                    <p className={`shrink-0 text-sm font-bold tabular-nums ${line.price === null ? 'text-red-700' : 'text-neutral-950'}`}>
                      {line.price !== null ? formatMoney(line.price * line.qty, t) : '—'}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <QtyStepper value={line.qty} onChange={(delta) => onChangeQty(line.key, delta)} />
                    <span className="flex-1" />
                    <button
                      type="button"
                      onClick={() => toggleNote(line.key)}
                      aria-label={t.kassa.itemNote}
                      title={t.kassa.itemNote}
                      className={`btn-icon flex h-9 w-9 items-center justify-center rounded ${line.note ? 'border-red-200! bg-red-50! text-red-700!' : ''}`}
                    >
                      <MessageSquareText size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(line.key)}
                      aria-label={t.kassa.remove}
                      title={t.kassa.remove}
                      className="btn-icon-danger flex h-9 w-9 items-center justify-center rounded"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {noteOpen && (
                    <input
                      value={line.note}
                      onChange={(event) => onNote(line.key, event.target.value)}
                      placeholder={t.kassa.itemNotePlaceholder}
                      maxLength={120}
                      className="mt-2 h-9 w-full rounded border border-neutral-300 bg-white px-3 text-sm text-red-700 placeholder:text-neutral-400"
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="shrink-0 space-y-3 border-t border-neutral-200/70 px-4 py-3">
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
        <div className="flex items-end justify-between gap-3">
          <span className="text-xs text-neutral-500">{t.kassa.itemsCount(count)}</span>
          <span className="text-right">
            <span className="block text-[10px] font-semibold tracking-[0.2em] text-neutral-400 uppercase">{t.kassa.total}</span>
            <span className="block text-2xl font-extrabold text-neutral-950 tabular-nums">{formatMoney(total, t)}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onPay}
          disabled={blocked}
          className="btn-primary flex h-14 w-full items-center justify-center rounded text-sm font-bold tracking-[0.14em] uppercase"
        >
          {t.kassa.pay}
        </button>
      </div>
    </aside>
  )
}

import { ArrowLeft, ArrowRight, ShoppingBag, Trash2 } from 'lucide-react'
import { ORDER_TYPE_ICONS } from '@/components/order/orderIcons'
import { SectionTitle } from '@/components/ui/Card'
import FoodImage from '@/components/ui/FoodImage'
import QtyStepper from '@/components/ui/QtyStepper'
import type { OrderType, Product } from '@/domain/types'
import { useLocalize, useT } from '@/i18n'
import type { CartLine } from '@/lib/cart'
import { formatMoney } from '@/lib/format'

export interface KioskLine extends CartLine {
  product: Product
  price: number
}

/** Kioskda tanlanadigan turlar — dostavka faqat kassada. */
const KIOSK_ORDER_TYPES: OrderType[] = ['dine_in', 'takeaway']

type Props = {
  lines: KioskLine[]
  total: number
  orderType: OrderType
  onOrderType: (type: OrderType) => void
  onQty: (key: string, delta: -1 | 1) => void
  onRemove: (key: string) => void
  onBack: () => void
  onCheckout: () => void
}

/** Savat (mobil ilovadagi "Cart / Check Out"): taomlar kartochkalari va o'ngda jami + "To'lovga o'tish". */
export default function KioskCart({ lines, total, orderType, onOrderType, onQty, onRemove, onBack, onCheckout }: Props) {
  const t = useT()
  const localize = useLocalize()
  const count = lines.reduce((sum, line) => sum + line.qty, 0)

  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 items-start gap-6 px-4 pt-2 pb-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} aria-label={t.kiosk.backToMenu} className="btn-icon flex h-12 w-12 items-center justify-center rounded">
            <ArrowLeft size={22} />
          </button>
          <SectionTitle as="h1" className="text-2xl!">{t.kiosk.yourCart}</SectionTitle>
        </div>

        {lines.length === 0 ? (
          <div className="surface flex flex-col items-center gap-3 rounded-card border border-dashed border-neutral-300 px-6 py-16 text-center">
            <ShoppingBag size={48} className="text-neutral-300" />
            <p className="text-lg font-bold text-neutral-700">{t.kiosk.emptyCart}</p>
            <p className="text-sm text-neutral-500">{t.kiosk.emptyCartHint}</p>
            <button type="button" onClick={onBack} className="btn-primary mt-2 h-12 rounded px-6 text-sm font-bold">
              {t.kiosk.backToMenu}
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {lines.map((line) => (
              <li key={line.key} className="surface flex items-center gap-4 rounded-card border border-line p-3 shadow-card">
                <FoodImage src={line.product.image} alt="" className="h-24 w-24 shrink-0 rounded-media" />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-lg leading-snug font-bold text-neutral-950">{localize(line.product.name)}</p>
                  {line.note && <p className="text-sm font-semibold text-red-700">{line.note}</p>}
                  <p className="text-lg font-black tabular-nums">{formatMoney(line.price * line.qty, t)}</p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <button
                    type="button"
                    onClick={() => onRemove(line.key)}
                    aria-label={t.kassa.remove}
                    className="btn-icon-danger flex h-10 w-10 items-center justify-center rounded"
                  >
                    <Trash2 size={18} />
                  </button>
                  <QtyStepper value={line.qty} onChange={(delta) => onQty(line.key, delta)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {lines.length > 0 && (
        <aside className="surface space-y-5 rounded-card border border-line p-5 shadow-card lg:sticky lg:top-4">
          <div>
            <p className="mb-2 text-[11px] font-bold tracking-[0.2em] text-neutral-400 uppercase">{t.kiosk.chooseType}</p>
            <div className="grid grid-cols-2 gap-2">
              {KIOSK_ORDER_TYPES.map((type) => {
                const Icon = ORDER_TYPE_ICONS[type]
                const active = type === orderType
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onOrderType(type)}
                    aria-pressed={active}
                    className={`flex h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-card border-2 text-sm font-bold transition-colors ${active ? 'border-select bg-brand-50 text-coal' : 'border-neutral-200 bg-white text-neutral-600'}`}
                  >
                    <Icon size={20} className={active ? 'text-select' : 'text-neutral-400'} />
                    {t.orderType[type]}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="space-y-2 border-t border-dashed border-neutral-300 pt-4 text-base">
            <p className="flex justify-between text-neutral-600">
              <span>{t.kiosk.items(count)}</span>
              <span className="tabular-nums">{formatMoney(total, t)}</span>
            </p>
            <p className="flex items-end justify-between">
              <span className="font-bold">{t.kiosk.total}</span>
              <span className="text-3xl font-black tabular-nums">{formatMoney(total, t)}</span>
            </p>
          </div>
          <button type="button" onClick={onCheckout} className="btn-primary flex h-16 w-full items-center justify-center gap-3 rounded text-lg font-extrabold">
            {t.kiosk.checkout}
            <ArrowRight size={22} />
          </button>
        </aside>
      )}
    </div>
  )
}

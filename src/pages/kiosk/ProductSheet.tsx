import { ShoppingBag, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDb } from '@/api'
import { compositionText } from '@/components/menu/composition'
import FoodImage from '@/components/ui/FoodImage'
import QtyStepper from '@/components/ui/QtyStepper'
import type { Product } from '@/domain/types'
import { useLocalize, useT } from '@/i18n'
import { formatMoney } from '@/lib/format'

type Props = {
  product: Product
  price: number
  onAdd: (qty: number, note: string) => void
  onClose: () => void
}

/**
 * Taom oynasi (mobil ilovadagi "Details" sahifasi kabi): katta rasm, nom, tarkibi, soni, izoh va
 * "Savatga qo'shish · narx" tugmasi. Kichik ekranda pastdan chiqadi, kattasida — markazda.
 */
export default function ProductSheet({ product, price, onAdd, onClose }: Props) {
  const t = useT()
  const db = useDb()
  const localize = useLocalize()
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')
  const name = localize(product.name)
  const composition = compositionText(db, product, localize, 10)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={name}
        className="page-enter relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:grid sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] sm:rounded-card"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t.common.close}
          className="absolute top-4 right-4 z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-md transition-colors hover:text-coal"
        >
          <X size={22} />
        </button>
        <div className="relative bg-brand-50 sm:min-h-full">
          <FoodImage src={product.image} alt={name} className="aspect-[4/3] h-full w-full sm:aspect-auto" />
        </div>
        <div className="flex min-h-0 flex-col gap-5 overflow-y-auto p-6">
          <div className="space-y-2">
            <h2 className="pr-10 text-3xl leading-tight font-black text-neutral-950">{name}</h2>
            <p className="text-3xl font-black text-select tabular-nums">{formatMoney(price, t)}</p>
          </div>
          {composition && (
            <div>
              <p className="mb-1 text-[11px] font-bold tracking-[0.2em] text-neutral-400 uppercase">{t.kiosk.composition}</p>
              <p className="text-base leading-relaxed text-neutral-700">{composition}</p>
            </div>
          )}
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t.kiosk.notePlaceholder}
            maxLength={80}
            className="h-12 w-full rounded border border-neutral-300 bg-white px-4 text-base text-red-700"
          />
          {/* tugma sig'masa — soni ostiga, to'liq kenglikka tushadi (matn qisilmaydi) */}
          <div className="mt-auto flex flex-wrap items-center gap-4">
            <QtyStepper value={qty} min={1} size="lg" onChange={(delta) => setQty((value) => Math.max(1, Math.min(20, value + delta)))} />
            <button
              type="button"
              onClick={() => onAdd(qty, note)}
              className="btn-primary flex h-16 flex-[1_1_18rem] items-center justify-center gap-3 rounded px-6 text-base font-extrabold whitespace-nowrap"
            >
              <ShoppingBag size={22} className="shrink-0" />
              <span>{t.kiosk.add}</span>
              <span className="tabular-nums opacity-80">· {formatMoney(price * qty, t)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

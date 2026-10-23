import { Plus } from 'lucide-react'
import FoodImage from '@/components/ui/FoodImage'
import type { Product } from '@/domain/types'
import { useLocalize, useT } from '@/i18n'
import { formatNumber } from '@/lib/format'

type Props = {
  product: Product
  /** filial narxi; `null` — shu filialda sotilmaydi */
  price: number | null
  onClick?: () => void
  selected?: boolean
  /** kassada — savatdagi soni */
  badge?: number
  /** nom ostidagi qisqa matn (kioskda — tarkibi) */
  subtitle?: string
  /** kiosk — kattaroq yozuv */
  size?: 'md' | 'lg'
}

/**
 * Taom kartochkasi: oq yumaloq kartochkada rasm, nom, filial narxi va sariq kvadrat "+". Kassa, kiosk va admin
 * menyusida bir xil. "Zamonaviy" mavzuda: rasm kulrang qutida, savatdagisi — to'q sariq chegara va chap burchakda soni,
 * "+" o'rnida to'liq kenglikdagi "Qo'shish" tugmasi.
 */
export default function ProductCard({ product, price, onClick, selected = false, badge, subtitle, size = 'md' }: Props) {
  const t = useT()
  const localize = useLocalize()
  const name = localize(product.name)
  const unavailable = price === null
  const inCart = badge !== undefined && badge > 0
  const lg = size === 'lg'
  const border = selected ? 'border-select' : inCart ? 'border-transparent modern:border-select' : 'border-transparent enabled:hover:border-neutral-200'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`relative flex w-full flex-col rounded-card border-2 bg-white p-1 text-left shadow-card transition-colors enabled:cursor-pointer gomeal:p-2 modern:p-2.5 ${border}`}
    >
      {unavailable && (
        <span className="absolute top-2.5 left-2.5 z-10 rounded-chip bg-coal px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase modern:top-4 modern:left-4">
          {t.menu.unavailable}
        </span>
      )}
      {inCart && (
        <span className="absolute top-2 right-2 z-10 flex h-7 min-w-7 items-center justify-center rounded-full bg-select px-1.5 text-sm font-extrabold text-white shadow tabular-nums modern:top-4 modern:right-auto modern:left-4 modern:h-6 modern:min-w-6 modern:rounded-[6px] modern:text-xs modern:shadow-none">
          {badge}
        </span>
      )}
      <span className="block modern:rounded-media modern:bg-page modern:p-2">
        <FoodImage
          src={product.image}
          alt={name}
          className={`aspect-[4/3] w-full rounded-media modern:rounded-[6px] ${unavailable ? 'opacity-40 grayscale' : ''}`}
        />
      </span>
      <span className="flex flex-1 flex-col gap-1 px-2 pt-2 pb-2 modern:px-0.5 modern:pt-3 modern:pb-0">
        <span
          className={`line-clamp-2 leading-snug font-bold text-neutral-950 gomeal:font-medium gomeal:text-neutral-800 modern:font-semibold ${lg ? 'text-base' : 'text-sm modern:text-[15px]'}`}
        >
          {name}
        </span>
        {subtitle && <span className="line-clamp-1 text-xs text-neutral-500 gomeal:text-neutral-400">{subtitle}</span>}
        <span className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span
            className={`font-black whitespace-nowrap tabular-nums gomeal:font-semibold modern:font-extrabold ${lg ? 'text-lg' : 'text-base modern:text-lg'} ${unavailable ? 'text-neutral-400 line-through' : 'text-neutral-950'}`}
          >
            {/* GoMeal'dagi "$5.59" kabi — valyuta sariq */}
            {price !== null ? (
              <>
                {formatNumber(price)} <span className="gomeal:text-taxi">{t.common.soum}</span>
              </>
            ) : (
              '—'
            )}
          </span>
          {!unavailable && onClick && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-taxi text-coal modern:hidden">
              <Plus size={18} strokeWidth={2.5} />
            </span>
          )}
        </span>
        {!unavailable && onClick && (
          <span className="mt-2 hidden h-9 items-center justify-center gap-1.5 rounded bg-taxi text-sm font-bold text-coal transition-colors hover:bg-taxi-hover modern:flex">
            <Plus size={16} strokeWidth={2.5} />
            {t.menu.add}
          </span>
        )}
      </span>
    </button>
  )
}

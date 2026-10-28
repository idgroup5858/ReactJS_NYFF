import { ArrowRight, Search, ShoppingBag, X } from 'lucide-react'
import { useState } from 'react'
import CategoryTile from '@/components/menu/CategoryTile'
import { compositionText } from '@/components/menu/composition'
import ProductCard from '@/components/menu/ProductCard'
import { SectionTitle } from '@/components/ui/Card'
import type { ID, Menu, MenuProduct } from '@/domain/types'
import { useLocalize, useT } from '@/i18n'
import { formatMoney } from '@/lib/format'

type Props = {
  /** filial menyusi (faqat sotuvdagilar, tartiblangan); `undefined` — hali yuklanmoqda */
  menu: Menu | undefined
  cartCounts: Map<ID, number>
  cartQty: number
  cartTotal: number
  onOpen: (product: MenuProduct) => void
  onCart: () => void
}

/**
 * Kiosk menyusi: katta sarlavha, qidiruv, rasmli kategoriyalar qatori va taomlar to'ri. Savatda taom bo'lsa pastda
 * suzuvchi qora "savat" kapsulasi.
 */
export default function KioskMenu({ menu, cartCounts, cartQty, cartTotal, onOpen, onCart }: Props) {
  const t = useT()
  const localize = useLocalize()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<ID | null>(null)

  const categories = menu?.categories ?? []
  const categoryId = categories.some((c) => c.id === selectedId) ? selectedId : (categories[0]?.id ?? null)
  const category = categories.find((c) => c.id === categoryId)
  const search = query.trim().toLowerCase()

  const products = (menu?.products ?? []).filter((p) =>
    search ? Object.values(p.name).some((name) => name.toLowerCase().includes(search)) : p.categoryId === categoryId,
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-5 px-4 pt-2 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-4xl leading-tight font-black tracking-tight text-neutral-950 sm:text-5xl">
            {t.kiosk.welcomeTitle} <span className="text-neutral-400">{t.kiosk.welcomeAccent}</span>
          </h1>
          <label className="surface flex h-14 w-full max-w-md items-center gap-3 rounded border border-line px-5 shadow-card">
            <Search size={22} className="shrink-0 text-neutral-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.kiosk.search}
              aria-label={t.kiosk.search}
              className="h-full min-w-0 flex-1 bg-transparent text-lg outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label={t.common.close} className="cursor-pointer text-neutral-400 hover:text-coal">
                <X size={20} />
              </button>
            )}
          </label>
        </div>

        {!search && (
          <div className="flex gap-3 overflow-x-auto pb-2 modern:grid modern:grid-cols-[repeat(auto-fill,minmax(190px,1fr))] modern:gap-2.5">
            {/* Zamonaviy: ikonkali "chip"lar to'r bo'lib */}
            {categories.map((item) => (
              <CategoryTile
                key={item.id}
                size="lg"
                category={item}
                active={item.id === categoryId}
                onClick={() => setSelectedId(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-32 sm:px-8">
        <SectionTitle className="mb-4">{search ? t.kiosk.allResults(query.trim()) : category ? localize(category.name) : ''}</SectionTitle>
        {/* menyu yuklanguncha bo'sh — "hech narsa topilmadi" chaqnab ketmasin */}
        {!menu ? null : products.length === 0 ? (
          <p className="py-16 text-center text-lg text-neutral-500">{t.kiosk.noResults}</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                price={product.price}
                size="lg"
                subtitle={compositionText(product, localize, 3)}
                badge={cartCounts.get(product.id)}
                onClick={product.price !== null ? () => onOpen(product) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {cartQty > 0 && (
        <button
          type="button"
          onClick={onCart}
          className="page-enter fixed bottom-6 left-1/2 z-30 flex h-16 -translate-x-1/2 cursor-pointer items-center gap-4 rounded-full bg-coal pr-2 pl-6 text-white shadow-float transition-transform active:scale-[0.98]"
        >
          <span className="relative">
            <ShoppingBag size={24} className="text-taxi" />
            <span className="absolute -top-2 -right-2.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-select px-1 text-[11px] font-bold">{cartQty}</span>
          </span>
          <span className="text-base font-bold whitespace-nowrap">{t.kiosk.items(cartQty)}</span>
          <span className="h-6 w-px bg-white/20" />
          <span className="text-lg font-black whitespace-nowrap tabular-nums">{formatMoney(cartTotal, t)}</span>
          <span className="flex h-12 items-center gap-2 rounded-full bg-taxi px-5 text-base font-extrabold text-coal">
            {t.kiosk.viewCart}
            <ArrowRight size={20} />
          </span>
        </button>
      )}
    </div>
  )
}

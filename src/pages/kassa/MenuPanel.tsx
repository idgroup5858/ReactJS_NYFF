import { useState, type ReactNode } from 'react'
import CategoryTile from '@/components/menu/CategoryTile'
import ProductCard from '@/components/menu/ProductCard'
import type { ID, Menu, MenuProduct } from '@/domain/types'
import { useSettings } from '@/store/settingsStore'
import CategorySidebar from './CategorySidebar'

type Props = {
  /** kassa menyusi (`useMenu(branchId, { all: true })`); `undefined` — hali yuklanmagan */
  menu: Menu | undefined
  /** taom id → savatdagi soni (kartochkada belgi) */
  cartCounts: Map<ID, number>
  onAdd: (product: MenuProduct) => void
  /** taomlar ostida (faqat taomlar ustunida — chap kategoriyalar menyusi pastgacha cho'ziladi) */
  footer?: ReactNode
}

/**
 * Kassa menyusi: kategoriyalar (sozlamaga ko'ra chapda — admin paneldagi kabi yig'iladigan menyu, yig'ilganda tepadagi
 * qatorning kartochkalari ustma-ust; yoki tepada rasmli qator) va tanlangan kategoriyaning taomlari filial narxida. Sotuvda yo'q taom (`price: null`) ko'rinadi, lekin bosilmaydi.
 * Taomlar to'ri va [footer] header'dagi "− +" bilan kichrayadi (`zoom` — rasm, yozuv, tugma bir xil nisbatda, qatorga
 * ko'proq kartochka sig'adi); kategoriyalar o'zgarmaydi.
 */
export default function MenuPanel({ menu, cartCounts, onAdd, footer }: Props) {
  const { categoryPosition, menuScale } = useSettings()
  const zoom = { zoom: menuScale }
  const categories = [...(menu?.categories ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
  const [selectedId, setSelectedId] = useState<ID | null>(null)
  const categoryId = categories.some((c) => c.id === selectedId) ? selectedId : (categories[0]?.id ?? null)

  const allProducts = menu?.products ?? []
  const products = allProducts.filter((p) => p.categoryId === categoryId).sort((a, b) => a.sortOrder - b.sortOrder)

  const grid = (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(176px,1fr))] gap-3" style={zoom}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          price={product.price}
          badge={cartCounts.get(product.id)}
          onClick={product.price !== null ? () => onAdd(product) : undefined}
        />
      ))}
    </div>
  )
  const bottom = footer && (
    <div className="shrink-0" style={zoom}>
      {footer}
    </div>
  )

  if (categoryPosition === 'left') {
    const counts = new Map<ID, number>()
    for (const product of allProducts) counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1)
    return (
      <div className="flex h-full min-h-0">
        <CategorySidebar categories={categories} activeId={categoryId} counts={counts} onSelect={setSelectedId} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{grid}</div>
          {bottom}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <nav className="flex shrink-0 gap-3 overflow-x-auto p-3 pb-1 modern:grid modern:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] modern:gap-2">
        {categories.map((category) => (
          <CategoryTile key={category.id} category={category} active={category.id === categoryId} onClick={() => setSelectedId(category.id)} />
        ))}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{grid}</div>
      {bottom}
    </div>
  )
}

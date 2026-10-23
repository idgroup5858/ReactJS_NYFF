import { useState } from 'react'
import { useDb } from '@/api'
import CategoryTile from '@/components/menu/CategoryTile'
import ProductCard from '@/components/menu/ProductCard'
import { branchPrice } from '@/domain/logic/orders'
import type { ID } from '@/domain/types'
import { useSettings } from '@/store/settingsStore'
import CategorySidebar from './CategorySidebar'

type Props = {
  branchId: ID
  /** taom id → savatdagi soni (kartochkada belgi) */
  cartCounts: Map<ID, number>
  onAdd: (productId: ID) => void
}

/**
 * Kassa menyusi: kategoriyalar (sozlamaga ko'ra chapda — admin paneldagi kabi yig'iladigan menyu, yoki tepada rasmli
 * qator) va tanlangan kategoriyaning taomlari filial narxida. Sotuvda yo'q taom ko'rinadi, lekin bosilmaydi.
 */
export default function MenuPanel({ branchId, cartCounts, onAdd }: Props) {
  const db = useDb()
  const { categoryPosition } = useSettings()
  const categories = db.categories.filter((c) => c.active).sort((a, b) => a.sortOrder - b.sortOrder)
  const [selectedId, setSelectedId] = useState<ID | null>(null)
  const categoryId = categories.some((c) => c.id === selectedId) ? selectedId : (categories[0]?.id ?? null)

  const activeProducts = db.products.filter((p) => p.active)
  const products = activeProducts.filter((p) => p.categoryId === categoryId).sort((a, b) => a.sortOrder - b.sortOrder)

  const grid = (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(176px,1fr))] gap-3">
      {products.map((product) => {
        const price = branchPrice(db, branchId, product.id)
        return (
          <ProductCard
            key={product.id}
            product={product}
            price={price}
            badge={cartCounts.get(product.id)}
            onClick={price !== null ? () => onAdd(product.id) : undefined}
          />
        )
      })}
    </div>
  )

  if (categoryPosition === 'left') {
    const counts = new Map<ID, number>()
    for (const product of activeProducts) counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1)
    return (
      <div className="flex h-full min-h-0">
        <CategorySidebar categories={categories} activeId={categoryId} counts={counts} onSelect={setSelectedId} />
        <div className="min-w-0 flex-1 overflow-y-auto p-4">{grid}</div>
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
    </div>
  )
}

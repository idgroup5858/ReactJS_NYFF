import { Search } from 'lucide-react'
import { useState } from 'react'
import { api, useDb } from '@/api'
import { Card } from '@/components/ui/Card'
import FoodImage from '@/components/ui/FoodImage'
import PageHeader from '@/components/ui/PageHeader'
import { inputClass, tdClass, thClass } from '@/components/ui/styles'
import Toggle from '@/components/ui/Toggle'
import type { BranchPrice, ID } from '@/domain/types'
import { errorMessage, useLocalize, useT } from '@/i18n'
import { formatNumber } from '@/lib/format'
import { showToast } from '@/lib/swal'

/** Bitta katak: narx (maydondan chiqqanda / Enter da saqlanadi; bo'sh — sotilmaydi) va "sotuvda" belgisi. */
function PriceCell({ branchId, productId, record }: { branchId: ID; productId: ID; record: BranchPrice | undefined }) {
  const t = useT()
  const initial = record ? String(record.price) : ''
  const [value, setValue] = useState(initial)
  const [synced, setSynced] = useState(initial)
  // boshqa tabda o'zgarsa maydon ham yangilansin (foydalanuvchi yozmayotgan bo'lsa)
  if (initial !== synced) {
    setSynced(initial)
    setValue(initial)
  }

  const save = async (available = record?.available ?? true, price = value) => {
    try {
      await api.menu.setPrice({ branchId, productId, price: price === '' ? null : Number(price), available })
      if (price !== initial) showToast(t.admin.prices.saved)
    } catch (error) {
      showToast(errorMessage(error), 'error')
      setValue(initial)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={value === '' ? '' : formatNumber(Number(value))}
        onChange={(event) => setValue(event.target.value.replace(/\D/g, '').slice(0, 9))}
        onBlur={() => value !== initial && void save()}
        onKeyDown={(event) => event.key === 'Enter' && (event.target as HTMLInputElement).blur()}
        inputMode="numeric"
        placeholder={t.admin.prices.notSold}
        aria-label={t.admin.prices.price}
        className={`${inputClass} h-9! w-32! text-right font-bold tabular-nums ${record && !record.available ? 'text-neutral-400 line-through' : ''}`}
      />
      <Toggle checked={!!record?.available} hideLabel label={t.admin.prices.available} onChange={(available) => record && void save(available, initial)} />
    </div>
  )
}

/**
 * Filial narxlari: har bir taom × filial — narx va "sotuvda" belgisi. Narx o'chirilsa taom shu filialda umuman
 * ko'rinmaydi (kassada "Sotilmaydi").
 */
export default function PricesPage() {
  const t = useT()
  const db = useDb()
  const localize = useLocalize()
  const [query, setQuery] = useState('')
  const branches = db.branches.filter((b) => b.active)
  const categories = [...db.categories].sort((a, b) => a.sortOrder - b.sortOrder)
  const search = query.trim().toLowerCase()

  return (
    <div className="space-y-5">
      <PageHeader title={t.admin.prices.title} description={t.admin.prices.hint} />
      <Card>
        <div className="border-b border-line p-3">
          <label className="relative block max-w-md">
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.kiosk.search} className={`${inputClass} pl-9`} />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200">
              <tr>
                <th className={thClass}>{t.admin.prices.product}</th>
                {branches.map((branch) => (
                  <th key={branch.id} className={thClass}>
                    {branch.name}
                  </th>
                ))}
              </tr>
            </thead>
            {categories.map((category) => {
              const products = db.products
                .filter((p) => p.categoryId === category.id)
                .filter((p) => !search || Object.values(p.name).some((name) => name.toLowerCase().includes(search)))
                .sort((a, b) => a.sortOrder - b.sortOrder)
              if (products.length === 0) return null
              return (
                <tbody key={category.id} className="divide-y divide-neutral-100">
                  <tr className="bg-neutral-50">
                    <td colSpan={branches.length + 1} className="px-3 py-2 text-[11px] font-bold tracking-[0.14em] text-neutral-600 uppercase">
                      {localize(category.name)}
                    </td>
                  </tr>
                  {products.map((product) => (
                    <tr key={product.id} className={product.active ? '' : 'opacity-50'}>
                      <td className={tdClass}>
                        <span className="flex items-center gap-3">
                          <FoodImage src={product.image} alt="" className="h-9 w-9 shrink-0 rounded" />
                          <span className="font-semibold">{localize(product.name)}</span>
                        </span>
                      </td>
                      {branches.map((branch) => (
                        <td key={branch.id} className={tdClass}>
                          <PriceCell branchId={branch.id} productId={product.id} record={db.prices.find((p) => p.branchId === branch.id && p.productId === product.id)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              )
            })}
          </table>
        </div>
      </Card>
    </div>
  )
}

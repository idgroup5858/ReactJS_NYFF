import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { useBranches, useWarehouses } from '@/api/queries'
import Modal from '@/components/ui/Modal'
import type { Ingredient, IngredientUsage, StockUnit } from '@/domain/types'
import { baseUnitOf } from '@/domain/units'
import { useLocalize, useT } from '@/i18n'
import { countUnit, formatNumber, formatRecipeQty, formatStock, formatUnit } from '@/lib/format'
import { warehouseLabel } from '@/lib/warehouses'

type Counted = { unit: StockUnit; packSize: number | null }

/** Ro'yxatli blok: sarlavha, nima qilish kerakligi, uzun ro'yxat ichida o'raladi (oyna past bo'lib qolsin). */
function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="rounded border border-line p-2.5">
      <h3 className="text-xs font-bold text-neutral-900">{title}</h3>
      <p className="mb-1.5 text-xs text-neutral-500">{hint}</p>
      <ul className="max-h-36 space-y-1 overflow-y-auto pr-1 text-xs">{children}</ul>
    </section>
  )
}

/**
 * Ishlatilgan mahsulotning birligi kg / l ↔ dona o'zgarganda — saqlashdan oldin (foydalanuvchi: "qayerlarda
 * qiymatlarni qayta o'zgartirib chiqish uchun modal ko'rsat, OK ni bosib o'zgartiraveradi"). Sonlar o'zgarmaydi — har
 * joyda "hozir → keyin": retseptlar, har ombordagi qoldiq va chegara; narx, qadoq va tarix — qisqa qatorlar. Tasdiq
 * kutayotgan eski kirim bo'lsa tugma o'chiq (server ham `pending_purchase` qaytaradi).
 */
export default function UnitChangeWarning({
  ingredient,
  next,
  priceEmpty,
  usage,
  saving,
  onConfirm,
  onCancel,
}: {
  ingredient: Ingredient
  /** yangi birlik va formadagi qadoq hajmi */
  next: Counted
  /** formada narx bo'sh — saqlangach narxsiz qoladi */
  priceEmpty: boolean
  usage: IngredientUsage
  saving: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const t = useT()
  const localize = useLocalize()
  const warehouses = useWarehouses().data ?? []
  const branches = useBranches().data ?? []
  const w = t.ingredients.unitChange
  const blocked = usage.pendingPurchases > 0
  const before: Counted = { unit: ingredient.unit, packSize: ingredient.packSize }
  const change = (qty: number) => `${formatStock(qty, before, t)} → ${formatStock(qty, next, t)}`
  const notes = [
    priceEmpty && w.price(countUnit(next, t)),
    next.packSize !== null && w.pack(countUnit(next, t), `${formatNumber(next.packSize)} ${t.units[baseUnitOf(next.unit)]}`),
    usage.purchases + usage.transfers > 0 && w.history(usage.purchases, usage.transfers),
  ].filter((note): note is string => typeof note === 'string')

  return (
    <Modal
      title={w.title}
      onClose={onCancel}
      size="lg"
      footer={
        <div className="flex w-full gap-2">
          <button type="button" onClick={onCancel} disabled={saving} className="btn-ghost h-9 flex-1 rounded text-sm font-bold">
            {t.common.cancel}
          </button>
          <button type="button" onClick={onConfirm} disabled={saving || blocked} className="btn-primary h-9 flex-1 rounded text-sm font-bold">
            {w.confirm}
          </button>
        </div>
      }
    >
      <div className="space-y-3 text-sm">
        <p className="flex gap-2 text-neutral-700">
          <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <span>{w.intro(localize(ingredient.name), formatUnit(before, t), formatUnit(next, t))}</span>
        </p>
        {blocked && <p className="rounded bg-red-50 px-3 py-2 font-semibold text-red-700">{w.pending(usage.pendingPurchases)}</p>}
        {(usage.products.length > 0 || usage.stock.length > 0) && (
          // eniga keng, past (POS monitori): retseptlar va omborlar yonma-yon
          <div className="grid items-start gap-3 sm:grid-cols-2">
            {usage.products.length > 0 && (
              <Section title={w.recipes(usage.products.length)} hint={w.recipesHint}>
                {usage.products.map((product) => (
                  <li key={product.id} className="flex justify-between gap-3">
                    <span className="truncate text-neutral-900">{localize(product.name)}</span>
                    <span className="shrink-0 text-neutral-600 tabular-nums">
                      {formatRecipeQty(product.qty, before.unit, t)} → <b className="text-neutral-950">{formatRecipeQty(product.qty, next.unit, t)}</b>
                    </span>
                  </li>
                ))}
              </Section>
            )}
            {usage.stock.length > 0 && (
              <Section title={w.stock} hint={w.stockHint}>
                {usage.stock.map((row) => (
                  <li key={row.warehouseId}>
                    <p className="font-semibold text-neutral-900">{warehouseLabel(warehouses, branches, row.warehouseId, t)}</p>
                    <p className="text-neutral-600 tabular-nums">
                      {w.qty}: {change(row.qty)}
                      {row.minQty > 0 && ` · ${w.min}: ${change(row.minQty)}`}
                    </p>
                  </li>
                ))}
              </Section>
            )}
          </div>
        )}
        {notes.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-xs text-neutral-600">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}

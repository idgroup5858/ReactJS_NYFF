import { useDb } from '@/api'
import Modal from '@/components/ui/Modal'
import { tdClass, thClass } from '@/components/ui/styles'
import type { ID, StockMovement } from '@/domain/types'
import { useLocalize, useT } from '@/i18n'
import { formatDateTime, formatOrderNumber, formatStock } from '@/lib/format'
import { warehouseLabel } from '@/lib/warehouses'

/** Harakatlarning eng ko'pi shuncha ko'rsatiladi (eng yangilari). */
const LIMIT = 150

/** Bitta mahsulotning bitta ombordagi harakatlari: kirim, ko'chirish, sotuv, bekor qilish — hujjat raqami bilan. */
export default function MovementsModal({ warehouseId, ingredientId, onClose }: { warehouseId: ID; ingredientId: ID; onClose: () => void }) {
  const t = useT()
  const db = useDb()
  const localize = useLocalize()
  const ingredient = db.ingredients.find((i) => i.id === ingredientId)
  if (!ingredient) return null

  const movements = db.movements
    .filter((m) => m.warehouseId === warehouseId && m.ingredientId === ingredientId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, LIMIT)

  const reference = (movement: StockMovement): string => {
    switch (movement.kind) {
      case 'sale':
      case 'sale_cancel': {
        const order = db.orders.find((o) => o.id === movement.refId)
        return order ? t.stock.refOrder(formatOrderNumber(order.number)) : '—'
      }
      case 'purchase': {
        const purchase = db.purchases.find((p) => p.id === movement.refId)
        return purchase ? t.purchase.number(purchase.number) : '—'
      }
      case 'transfer_in':
      case 'transfer_out': {
        const transfer = db.transfers.find((tr) => tr.id === movement.refId)
        if (!transfer) return '—'
        const other = movement.kind === 'transfer_in' ? transfer.fromWarehouseId : transfer.toWarehouseId
        return `${t.transfer.number(transfer.number)} · ${warehouseLabel(db, other, t)}`
      }
    }
  }

  return (
    <Modal title={t.stock.historyTitle(localize(ingredient.name))} onClose={onClose} size="lg">
      <p className="mb-3 text-sm text-neutral-500">{warehouseLabel(db, warehouseId, t)}</p>
      {movements.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-500">{t.stock.noMovements}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200">
              <tr>
                <th className={thClass}>{t.stock.when}</th>
                <th className={thClass}>{t.stock.kind}</th>
                <th className={thClass}>{t.stock.document}</th>
                <th className={`${thClass} text-right`}>{t.stock.qty}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {movements.map((movement) => (
                <tr key={movement.id}>
                  <td className={`${tdClass} whitespace-nowrap text-neutral-500 tabular-nums`}>{formatDateTime(movement.createdAt)}</td>
                  <td className={tdClass}>{t.stock.kinds[movement.kind]}</td>
                  <td className={`${tdClass} text-neutral-600`}>{reference(movement)}</td>
                  <td className={`${tdClass} text-right font-bold whitespace-nowrap tabular-nums ${movement.qty > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {movement.qty > 0 ? '+' : ''}
                    {formatStock(movement.qty, ingredient.unit, t)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}

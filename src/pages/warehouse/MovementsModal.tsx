import { useBranches, useIngredients, useMovements, useWarehouses } from '@/api/queries'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import { tdClass, thClass } from '@/components/ui/styles'
import type { ID, MovementWithRef } from '@/domain/types'
import { errorMessage, useLocalize, useT } from '@/i18n'
import { formatDateTime, formatOrderNumber, formatStock } from '@/lib/format'
import { warehouseLabel } from '@/lib/warehouses'
import { usePageState, useServerPage } from './serverPagination'

/** Bitta mahsulotning bitta ombordagi harakatlari (10 tadan, eng yangisi birinchi): kirim, ko'chirish, sotuv, bekor qilish — hujjat raqami bilan. */
export default function MovementsModal({ warehouseId, ingredientId, onClose }: { warehouseId: ID; ingredientId: ID; onClose: () => void }) {
  const t = useT()
  const localize = useLocalize()
  const warehouses = useWarehouses().data ?? []
  const branches = useBranches().data ?? []
  const paging = usePageState()
  const movements = useMovements({ warehouseId, ingredientId, page: paging.page, limit: paging.limit })
  const { list, pagination } = useServerPage(movements.data, paging)
  const ingredient = useIngredients().data?.find((i) => i.id === ingredientId)
  if (!ingredient) return null

  // hujjat raqami va ko'chirishdagi ikkinchi ombor — server javobida (`refNumber`, `refWarehouseId`)
  const reference = (movement: MovementWithRef): string => {
    if (movement.refNumber === null) return '—'
    switch (movement.kind) {
      case 'sale':
      case 'sale_cancel':
        return t.stock.refOrder(formatOrderNumber(movement.refNumber))
      case 'purchase':
        return t.purchase.number(movement.refNumber)
      case 'transfer_in':
      case 'transfer_out': {
        const other = movement.refWarehouseId ? warehouseLabel(warehouses, branches, movement.refWarehouseId, t) : '—'
        return `${t.transfer.number(movement.refNumber)} · ${other}`
      }
    }
  }

  return (
    <Modal title={t.stock.historyTitle(localize(ingredient.name))} onClose={onClose} size="lg">
      <p className="mb-3 text-sm text-neutral-500">{warehouseLabel(warehouses, branches, warehouseId, t)}</p>
      {!list || list.total === 0 ? (
        // yuklanayotganda — bo'sh joy (balandligi "harakat yo'q" bilan bir xil), xato bo'lsa — uning matni
        <p className="py-10 text-center text-sm text-neutral-500">{list ? t.stock.noMovements : movements.error ? errorMessage(movements.error) : ' '}</p>
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
              {list.items.map((movement) => (
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
          <Pagination {...pagination} />
        </div>
      )}
    </Modal>
  )
}

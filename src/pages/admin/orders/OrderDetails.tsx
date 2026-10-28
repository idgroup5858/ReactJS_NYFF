import { Undo2 } from 'lucide-react'
import { api } from '@/api'
import { useBranches } from '@/api/queries'
import Modal from '@/components/ui/Modal'
import { canReleaseCourier } from '@/domain/rules'
import type { Order } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { formatOrderNumber } from '@/lib/format'
import { confirmDialog, showToast } from '@/lib/swal'
import OrderDetailsBody, { PrintReceiptButton } from './OrderDetailsBody'

/**
 * Buyurtmalar sahifasidagi tafsilot oynasi; to'langan buyurtma chekini qayta chiqarish mumkin. Kuryerdagi dostavkani
 * ("Yetkazib bo'lmadi" bilan qaytgan va h.k.) kuryerdan olish — yana kuryerlarning "Yangi" ro'yxatiga.
 */
export default function OrderDetails({ order, onClose }: { order: Order; onClose: () => void }) {
  const t = useT()
  const branches = useBranches().data ?? []
  const branchName = branches.find((b) => b.id === order.branchId)?.name ?? '—'
  const number = formatOrderNumber(order.number)
  const paid = order.status === 'preparing' || order.status === 'ready'

  const releaseCourier = async () => {
    if (!(await confirmDialog(t.courier.releaseTitle(number), t.courier.releaseText, t.courier.release))) return
    try {
      await api.orders.releaseCourier(order.id)
      showToast(t.courier.releasedToast(number))
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  return (
    <Modal
      title={t.admin.orders.details(number, branchName)}
      onClose={onClose}
      size="lg"
      footer={
        paid ? (
          <>
            {canReleaseCourier(order) && (
              <button type="button" onClick={() => void releaseCourier()} className="btn-ghost flex h-10 items-center gap-2 rounded px-4 text-xs font-bold">
                <Undo2 size={16} />
                {t.courier.release}
              </button>
            )}
            <PrintReceiptButton order={order} className="ml-auto" />
          </>
        ) : undefined
      }
    >
      <OrderDetailsBody order={order} />
    </Modal>
  )
}

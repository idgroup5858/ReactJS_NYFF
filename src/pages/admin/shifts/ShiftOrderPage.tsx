import { ReceiptText } from 'lucide-react'
import { Navigate, useParams } from 'react-router'
import { ApiError } from '@/api/http'
import { useBranches, useShift, useUsers } from '@/api/queries'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { Card } from '@/components/ui/Card'
import PageHeader from '@/components/ui/PageHeader'
import { useT } from '@/i18n'
import { formatOrderNumber } from '@/lib/format'
import ListPlaceholder from '../orders/ListPlaceholder'
import OrderDetailsBody, { PrintReceiptButton } from '../orders/OrderDetailsBody'
import { SHIFTS_PATH, shiftPath } from './paths'

/** Smenadagi buyurtma sahifasi (Smenalar → Smena → Buyurtma): nima sotilgani, to'lov, jarayon vaqtlari, chekni qayta chiqarish. */
export default function ShiftOrderPage() {
  const t = useT()
  const { shiftId, orderId } = useParams()
  const query = useShift(shiftId)
  const branches = useBranches().data ?? []
  const users = useUsers().data ?? []
  const shift = query.data
  const order = shift?.orders.find((o) => o.id === orderId)

  if (!shift) {
    if (query.error instanceof ApiError && query.error.code === 'not_found') return <Navigate to={SHIFTS_PATH} replace />
    return (
      <div className="space-y-5">
        <Breadcrumbs items={[{ label: t.admin.shifts.title, to: SHIFTS_PATH }, { label: '…' }]} />
        <ListPlaceholder icon={ReceiptText} empty="" query={query} />
      </div>
    )
  }
  if (!order) return <Navigate to={shiftPath(shift.id)} replace />

  const number = formatOrderNumber(order.number)
  const branchName = branches.find((b) => b.id === order.branchId)?.name ?? '—'

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: t.admin.shifts.title, to: SHIFTS_PATH },
          { label: t.admin.shifts.details(users.find((u) => u.id === shift.cashierId)?.name ?? '—'), to: shiftPath(shift.id) },
          { label: number },
        ]}
      />
      <PageHeader title={t.admin.orders.details(number, branchName)} actions={<PrintReceiptButton order={order} />} />
      <Card className="max-w-4xl p-5">
        <OrderDetailsBody order={order} />
      </Card>
    </div>
  )
}

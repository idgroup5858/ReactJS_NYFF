import { Check, CircleCheck, X } from 'lucide-react'
import { useState } from 'react'
import { api, useDb } from '@/api'
import { useCurrentUser } from '@/api/session'
import { Card, CardHeader } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import type { ID, Purchase } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { confirmDialog, showToast } from '@/lib/swal'
import PurchaseDetails from '@/pages/warehouse/PurchaseDetails'
import { PurchaseRow } from '@/pages/warehouse/PurchasesPage'

/** Kutilayotgan kirim: narxlar (oldingi kirimdan yozilgan) tekshiriladi / o'zgartiriladi → tasdiqlash yoki rad etish. */
function PendingPurchase({ purchase }: { purchase: Purchase }) {
  const t = useT()
  const user = useCurrentUser()
  const [prices, setPrices] = useState<Record<ID, string>>(() =>
    Object.fromEntries(purchase.items.map((item) => [item.ingredientId, item.price !== null ? String(item.price) : ''])),
  )
  const missing = purchase.items.some((item) => !prices[item.ingredientId])

  const approve = async () => {
    if (!user) return
    try {
      await api.purchases.approve(purchase.id, Object.fromEntries(Object.entries(prices).map(([id, value]) => [id, Number(value)])), user.id)
      showToast(t.admin.purchases.approved)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  const reject = async () => {
    if (!user || !(await confirmDialog(t.admin.purchases.rejectTitle(t.purchase.number(purchase.number)), t.admin.purchases.rejectText, t.admin.purchases.reject))) return
    try {
      await api.purchases.reject(purchase.id, user.id)
      showToast(t.admin.purchases.rejected)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  return (
    <PurchaseRow purchase={purchase} defaultOpen>
      <PurchaseDetails purchase={purchase} prices={prices} onPrice={(id, value) => setPrices({ ...prices, [id]: value })} />
      <p className="text-xs text-neutral-500">{t.admin.purchases.priceHint}</p>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => void reject()} className="btn-ghost flex h-10 items-center gap-2 rounded px-4 text-xs font-bold">
          <X size={16} />
          {t.admin.purchases.reject}
        </button>
        <button type="button" onClick={() => void approve()} disabled={missing} className="btn-primary flex h-10 items-center gap-2 rounded px-5 text-xs font-bold">
          <Check size={16} />
          {t.admin.purchases.approve}
        </button>
      </div>
    </PurchaseRow>
  )
}

/** Kirimlarni tasdiqlash: yuqorida kutilayotganlar (narx maydonlari bilan), pastda ko'rib chiqilganlar tarixi. */
export default function PurchaseApprovalPage() {
  const t = useT()
  const db = useDb()
  const sorted = [...db.purchases].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const pending = sorted.filter((p) => p.status === 'pending')
  const decided = sorted.filter((p) => p.status !== 'pending')

  return (
    <div className="space-y-5">
      <PageHeader title={t.admin.purchases.title} description={t.admin.purchases.hint} />
      <Card>
        <CardHeader title={`${t.purchase.statuses.pending} · ${pending.length}`} />
        {pending.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={CircleCheck} title={t.admin.purchases.nonePending} />
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {pending.map((purchase) => (
              <PendingPurchase key={purchase.id} purchase={purchase} />
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <CardHeader title={t.admin.purchases.history} />
        <ul className="divide-y divide-neutral-100">
          {decided.map((purchase) => (
            <PurchaseRow key={purchase.id} purchase={purchase} />
          ))}
        </ul>
      </Card>
    </div>
  )
}

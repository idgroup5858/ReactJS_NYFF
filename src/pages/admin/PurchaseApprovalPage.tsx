import { Check, CircleCheck, ClipboardList, X } from 'lucide-react'
import { useState } from 'react'
import { api } from '@/api'
import { usePurchases } from '@/api/queries'
import { Card, CardHeader } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import SegmentedControl from '@/components/ui/SegmentedControl'
import type { ID, Purchase } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { confirmDialog, showToast } from '@/lib/swal'
import PurchaseDetails from '@/pages/warehouse/PurchaseDetails'
import { PurchaseRow } from '@/pages/warehouse/PurchasesPage'
import { usePageState, useServerPage } from '@/pages/warehouse/serverPagination'

/** Ko'rib chiqilganlar tarixi — holat bo'yicha alohida (server bitta holat bilan sahifalaydi). */
type Decided = 'approved' | 'rejected'

/** Kutilayotganlar hammasi bitta ro'yxatda ko'rinadi (ish) — amalda bundan ko'p bo'lmaydi. */
const PENDING_LIMIT = 200

/** Kutilayotgan kirim: narxlar (oldingi kirimdan yozilgan) tekshiriladi / o'zgartiriladi → tasdiqlash yoki rad etish. */
function PendingPurchase({ purchase }: { purchase: Purchase }) {
  const t = useT()
  const [prices, setPrices] = useState<Record<ID, string>>(() =>
    Object.fromEntries(purchase.items.map((item) => [item.ingredientId, item.price !== null ? String(item.price) : ''])),
  )
  const missing = purchase.items.some((item) => !prices[item.ingredientId])

  const approve = async () => {
    try {
      await api.purchases.approve(purchase.id, Object.fromEntries(Object.entries(prices).map(([id, value]) => [id, Number(value)])))
      showToast(t.admin.purchases.approved)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  const reject = async () => {
    if (!(await confirmDialog(t.admin.purchases.rejectTitle(t.purchase.number(purchase.number)), t.admin.purchases.rejectText, t.admin.purchases.reject))) return
    try {
      await api.purchases.reject(purchase.id)
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

/**
 * Kirimlarni tasdiqlash: yuqorida kutilayotganlar (narx maydonlari bilan, hammasi), pastda ko'rib chiqilganlar tarixi —
 * "Tasdiqlangan / Rad etilgan" tanlovi bilan, 10 tadan (server sahifalaydi). Ikkala ro'yxat ham yangisi birinchi.
 */
export default function PurchaseApprovalPage() {
  const t = useT()
  const pendingQuery = usePurchases({ status: 'pending', limit: PENDING_LIMIT })
  const pending = pendingQuery.data?.items
  const [decided, setDecided] = useState<Decided>('approved')
  const paging = usePageState(decided)
  const historyQuery = usePurchases({ status: decided, page: paging.page, limit: paging.limit })
  const history = useServerPage(historyQuery.data, paging)

  return (
    <div className="space-y-5">
      <PageHeader title={t.admin.purchases.title} description={t.admin.purchases.hint} />
      <Card>
        {/* soni — kelgach (yuklanayotganda "0" ko'rinib qolmasin) */}
        <CardHeader title={pendingQuery.data ? `${t.purchase.statuses.pending} · ${pendingQuery.data.total}` : t.purchase.statuses.pending} />
        {!pending ? (
          pendingQuery.error ? (
            <div className="p-4">
              <EmptyState icon={CircleCheck} title={errorMessage(pendingQuery.error)} />
            </div>
          ) : null
        ) : pending.length === 0 ? (
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
        <CardHeader
          title={t.admin.purchases.history}
          actions={
            <SegmentedControl<Decided>
              label={t.admin.purchases.history}
              value={decided}
              onChange={setDecided}
              options={[
                { value: 'approved', label: t.purchase.statuses.approved },
                { value: 'rejected', label: t.purchase.statuses.rejected },
              ]}
            />
          }
        />
        {!history.list ? (
          historyQuery.error ? (
            <div className="p-4">
              <EmptyState icon={ClipboardList} title={errorMessage(historyQuery.error)} />
            </div>
          ) : null
        ) : history.list.total === 0 ? (
          <div className="p-4">
            <EmptyState icon={ClipboardList} title={t.purchase.empty} />
          </div>
        ) : (
          <>
            <ul className="divide-y divide-neutral-100">
              {history.list.items.map((purchase) => (
                <PurchaseRow key={purchase.id} purchase={purchase} />
              ))}
            </ul>
            <Pagination {...history.pagination} />
          </>
        )}
      </Card>
    </div>
  )
}

import { Check, ClipboardList, X } from 'lucide-react'
import { useState } from 'react'
import { api } from '@/api'
import { usePurchases } from '@/api/queries'
import { Card, CardHeader } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import type { ID, Purchase } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { confirmDialog, showToast } from '@/lib/swal'
import PurchaseDetails from '@/pages/warehouse/PurchaseDetails'
import { PurchaseRow } from '@/pages/warehouse/PurchasesPage'
import { usePageState, useServerPage } from '@/pages/warehouse/serverPagination'

/** Eski kutayotganlar hammasi bitta ro'yxatda — amalda bundan ko'p bo'lmaydi (yangilari tasdiq kutmaydi). */
const PENDING_LIMIT = 200

/** Eski (tasdiqlash bekor qilinishidan oldin yuborilgan) kirim: narxlar tekshiriladi → tasdiqlash yoki rad etish. */
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
 * Kirimlar (admin): ta'minotchi kiritganlar darhol omborga qo'shiladi — tasdiqlash shart emas, admin nima, qancha va
 * qanchadan kelganini shu yerda ko'rib boradi (har yangisi Telegram botga ham boradi). Yangisi birinchi, 10 tadan
 * (server sahifalaydi). Tepada — tasdiqlash bekor qilinishidan oldin yuborilib, hali kutayotganlar (bo'lsa).
 */
export default function AdminPurchasesPage() {
  const t = useT()
  const pendingQuery = usePurchases({ status: 'pending', limit: PENDING_LIMIT })
  const pending = pendingQuery.data?.items ?? []
  const paging = usePageState()
  const listQuery = usePurchases({ page: paging.page, limit: paging.limit })
  const { list, pagination } = useServerPage(listQuery.data, paging)

  return (
    <div className="space-y-5">
      <PageHeader title={t.admin.purchases.title} description={t.admin.purchases.hint} />
      {pending.length > 0 && (
        <Card>
          <CardHeader title={`${t.admin.purchases.legacyPending} · ${pendingQuery.data?.total ?? pending.length}`} hint={t.admin.purchases.legacyHint} />
          <ul className="divide-y divide-neutral-100">
            {pending.map((purchase) => (
              <PendingPurchase key={purchase.id} purchase={purchase} />
            ))}
          </ul>
        </Card>
      )}
      <Card>
        <CardHeader title={t.admin.purchases.history} />
        {!list ? (
          listQuery.error ? (
            <div className="p-4">
              <EmptyState icon={ClipboardList} title={errorMessage(listQuery.error)} />
            </div>
          ) : null
        ) : list.total === 0 ? (
          <div className="p-4">
            <EmptyState icon={ClipboardList} title={t.purchase.empty} />
          </div>
        ) : (
          <>
            <ul className="divide-y divide-neutral-100">
              {list.items.map((purchase) => (
                <PurchaseRow key={purchase.id} purchase={purchase} />
              ))}
            </ul>
            <Pagination {...pagination} />
          </>
        )}
      </Card>
    </div>
  )
}

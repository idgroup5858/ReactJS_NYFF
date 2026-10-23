import { ChefHat, ChevronLeft, ChevronRight, CircleCheck, Undo2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, useDb } from '@/api'
import { useCurrentUser } from '@/api/session'
import StaffLayout from '@/components/layout/StaffLayout'
import { ORDER_TYPE_ICONS } from '@/components/order/orderIcons'
import Modal from '@/components/ui/Modal'
import { activeOrders } from '@/domain/logic/orders'
import type { Order } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { formatOrderNumber } from '@/lib/format'
import { confirmDialog, showToast } from '@/lib/swal'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { useNow } from '@/lib/useNow'
import KitchenCard from './KitchenCard'

/** Bir sahifada 6 ta buyurtma (3 × 2). */
const PAGE_SIZE = 6

/**
 * Oshxona ekrani: filialning yangi va tayyorlanayotgan buyurtmalari (eskisi birinchi) 6 bo'lakli to'rda, sahifalab.
 * Ikki marta bosish: yangi → tayyorlanmoqda (sariq); yana ikki marta → "tayyormi?" → tayyor (TV ga chiqadi).
 * Pastda — oxirgi tayyorlar: adashib bosilgan bo'lsa qaytarish mumkin.
 */
export default function KitchenPage() {
  const t = useT()
  const db = useDb()
  const user = useCurrentUser()
  const now = useNow(1000)
  const [page, setPage] = useState(0)
  const [confirming, setConfirming] = useState<Order | null>(null)
  useDocumentTitle(t.modes.kitchen.title)

  const branchId = user?.branchId ?? ''
  const active = activeOrders(db, branchId)
  const queue = active.filter((o) => o.status === 'new' || o.status === 'preparing')
  const ready = active.filter((o) => o.status === 'ready').sort((a, b) => (b.readyAt ?? '').localeCompare(a.readyAt ?? ''))
  const pages = Math.max(1, Math.ceil(queue.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  const slots = queue.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE)
  const counts = { new: queue.filter((o) => o.status === 'new').length, preparing: queue.filter((o) => o.status === 'preparing').length }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setPage((value) => Math.min(value + 1, pages - 1))
      if (event.key === 'ArrowLeft') setPage((value) => Math.max(value - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pages])

  const advance = async (order: Order) => {
    try {
      await api.orders.advance(order.id, order.status)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  const onDoubleTap = (order: Order) => {
    if (order.status === 'new') void advance(order)
    else if (order.status === 'preparing') setConfirming(order)
  }

  const confirmReady = async () => {
    if (!confirming) return
    const order = confirming
    setConfirming(null)
    await advance(order)
  }

  const reopen = async (order: Order) => {
    const number = formatOrderNumber(order.number)
    if (!(await confirmDialog(t.kitchen.reopenTitle(number), t.kitchen.reopenText, t.kitchen.reopen))) return
    try {
      await api.orders.reopen(order.id)
      showToast(t.kitchen.reopenedToast)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  return (
    <StaffLayout title={t.modes.kitchen.title} variant="fill">
      <div className="flex h-full min-h-0 flex-col gap-3 p-3 sm:p-4">
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className="flex h-9 items-center gap-2 rounded-chip bg-coal px-3 text-sm font-bold text-white">
            {t.orderStatus.new}
            <span className="rounded-full bg-white/15 px-2 tabular-nums">{counts.new}</span>
          </span>
          <span className="flex h-9 items-center gap-2 rounded-chip bg-taxi px-3 text-sm font-bold text-coal">
            {t.orderStatus.preparing}
            <span className="rounded-full bg-coal/10 px-2 tabular-nums">{counts.preparing}</span>
          </span>
          <span className="hidden text-xs text-neutral-500 md:inline">{t.kitchen.howTo}</span>
          <span className="flex-1" />
          {pages > 1 && (
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(current - 1)}
                disabled={current === 0}
                aria-label={t.kitchen.prev}
                className="btn-dark flex h-11 w-11 items-center justify-center rounded"
              >
                <ChevronLeft size={22} />
              </button>
              <span className="min-w-16 text-center text-base font-extrabold tabular-nums">{t.kitchen.page(current + 1, pages)}</span>
              <button
                type="button"
                onClick={() => setPage(current + 1)}
                disabled={current >= pages - 1}
                aria-label={t.kitchen.next}
                className="btn-primary flex h-11 w-11 items-center justify-center rounded"
              >
                <ChevronRight size={22} />
              </button>
            </span>
          )}
        </div>

        {queue.length === 0 ? (
          <div className="surface flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-card border border-dashed border-neutral-300 text-center">
            <ChefHat size={56} className="text-neutral-300" />
            <p className="text-lg font-bold text-neutral-700">{t.kitchen.empty}</p>
            <p className="max-w-sm text-sm text-neutral-500">{t.kitchen.emptyHint}</p>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 auto-rows-[minmax(260px,1fr)] grid-cols-1 gap-3 overflow-y-auto md:grid-cols-2 xl:grid-cols-3 xl:grid-rows-2 xl:overflow-hidden">
            {Array.from({ length: PAGE_SIZE }, (_, index) => {
              const order = slots[index]
              if (order) return <KitchenCard key={order.id} order={order} now={now} onDoubleTap={onDoubleTap} />
              return <div key={`slot-${index}`} className="hidden rounded-card border-2 border-dashed border-neutral-200 xl:block" />
            })}
          </div>
        )}

        {ready.length > 0 && (
          <div className="surface flex shrink-0 items-center gap-3 overflow-x-auto rounded-card border border-line px-3 py-2 shadow-card">
            <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold tracking-[0.12em] text-emerald-700 uppercase">
              <CircleCheck size={16} />
              {t.kitchen.readyStrip}
            </span>
            {ready.slice(0, 10).map((order) => {
              const Icon = ORDER_TYPE_ICONS[order.type]
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => void reopen(order)}
                  title={t.kitchen.reopen}
                  className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-chip border border-emerald-200 bg-emerald-50 px-2.5 text-sm font-extrabold text-emerald-800 tabular-nums transition-colors hover:border-select hover:bg-brand-50 hover:text-coal"
                >
                  <Icon size={14} />
                  {formatOrderNumber(order.number)}
                  <Undo2 size={14} className="opacity-50" />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {confirming && (
        <Modal
          title={t.kitchen.readyTitle(formatOrderNumber(confirming.number))}
          onClose={() => setConfirming(null)}
          size="sm"
          footer={
            <div className="grid w-full grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirming(null)} className="btn-ghost h-16 rounded text-sm font-bold uppercase">
                {t.kitchen.readyNo}
              </button>
              <button type="button" autoFocus onClick={() => void confirmReady()} className="btn-primary h-16 rounded text-sm font-bold uppercase">
                {t.kitchen.readyYes}
              </button>
            </div>
          }
        >
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <span className="text-6xl font-black tabular-nums">{formatOrderNumber(confirming.number)}</span>
            <p className="text-sm text-neutral-500">{t.kitchen.readyHint}</p>
          </div>
        </Modal>
      )}
    </StaffLayout>
  )
}

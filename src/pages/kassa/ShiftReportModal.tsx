import { useBranches } from '@/api/queries'
import { useSession } from '@/api/session'
import { PAYMENT_ICONS } from '@/components/order/orderIcons'
import Modal from '@/components/ui/Modal'
import { PAYMENT_METHODS, type ShiftWithSummary } from '@/domain/types'
import { useT } from '@/i18n'
import { formatDateTime, formatMoney, formatNumber } from '@/lib/format'

/**
 * Smena topshirilgach chiqadigan tushum hisoboti (server yopilgan smenani jami bilan qaytaradi); faqat "Chiqish"
 * tugmasi bilan yopiladi.
 */
export default function ShiftReportModal({ shift, onDone }: { shift: ShiftWithSummary; onDone: () => void }) {
  const t = useT()
  const session = useSession()
  const { data: branches } = useBranches()
  const { summary } = shift
  const branch = branches?.find((b) => b.id === shift.branchId)

  const rows: [string, string][] = [
    [t.report.cashier, session?.name ?? '—'],
    [t.common.branch, branch?.name ?? '—'],
    [t.report.opened, formatDateTime(shift.openedAt)],
    [t.report.closed, shift.closedAt ? formatDateTime(shift.closedAt) : '—'],
    [t.report.orders, formatNumber(summary.orderCount)],
    [t.report.cancelled, formatNumber(summary.cancelledCount)],
  ]

  return (
    <Modal
      title={t.report.title}
      onClose={onDone}
      dismissable={false}
      size="sm"
      footer={
        <button type="button" autoFocus onClick={onDone} className="btn-primary h-12 w-full rounded text-sm font-bold tracking-[0.14em] uppercase">
          {t.report.done}
        </button>
      }
    >
      <dl className="divide-y divide-dashed divide-neutral-200 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 py-1.5">
            <dt className="text-neutral-500">{label}</dt>
            <dd className="font-semibold text-neutral-950 tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 space-y-1.5 rounded border border-neutral-200 p-3">
        {PAYMENT_METHODS.map((method) => {
          const Icon = PAYMENT_ICONS[method]
          return (
            <p key={method} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-neutral-600">
                <Icon size={16} className="text-neutral-400" />
                {t.payment[method]}
              </span>
              <span className="font-bold tabular-nums">{formatMoney(summary.byPayment[method], t)}</span>
            </p>
          )
        })}
      </div>
      <div className="mt-4 flex items-end justify-between gap-3 rounded bg-brand-50 px-3 py-3">
        <span className="text-xs font-bold tracking-[0.12em] text-neutral-600 uppercase">{t.report.total}</span>
        <span className="text-2xl font-black text-neutral-950 tabular-nums">{formatMoney(summary.total, t)}</span>
      </div>
    </Modal>
  )
}

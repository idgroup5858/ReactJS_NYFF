import { Clock } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useOutlet } from 'react-router'
import { useBranches, useShifts, useUsers } from '@/api/queries'
import { Card } from '@/components/ui/Card'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { selectClass, tdClass, thClass } from '@/components/ui/styles'
import { PAGE_SIZE } from '@/components/ui/usePagination'
import { addDays, dateKey, parseDateKey } from '@/domain/dates'
import { shiftMinutes } from '@/domain/rules'
import type { ID } from '@/domain/types'
import { useT } from '@/i18n'
import { formatDateTime, formatMoney, formatNumber, formatTime } from '@/lib/format'
import { useNow } from '@/lib/useNow'
import ListPlaceholder from '../orders/ListPlaceholder'
import PeriodFilter from '../PeriodFilter'
import { useLatest, usePeriod } from '../usePeriod'
import { shiftPath } from './paths'

type Status = 'all' | 'open' | 'closed'

/**
 * Smenalar (admin): davr, filial, kassir va holat (ochiq / yopilgan) bo'yicha; yuqorida jami (smenalar, hozir ochiqlar,
 * tushum, naqd — kassadagi pul), pastda 10 tadan jadval (server filtrlaydi va sahifalaydi). Qatorni bosganda — smena
 * sahifasi, undan buyurtma sahifasi (ichma-ich, orqaga tugmasi bilan). Ichki sahifa ochiqligida ham bu komponent
 * o'chmaydi — filtrlar orqaga qaytganda saqlanadi. Davrga davr bilan kesishgan smenalar kiradi (kecha ochilib, hali
 * yopilmagani "bugun"da ham ko'rinadi), ochiqlari tepada.
 */
export default function ShiftsPage() {
  const t = useT()
  const navigate = useNavigate()
  const outlet = useOutlet()
  const now = useNow(60_000)
  const branches = useBranches().data ?? []
  const users = useUsers().data ?? []
  const period = usePeriod('today')
  const { range } = period
  const [branchId, setBranchId] = useState<ID | 'all'>('all')
  const [cashierId, setCashierId] = useState<ID | 'all'>('all')
  const [status, setStatus] = useState<Status>('all')

  const params = {
    branchId: branchId === 'all' ? undefined : branchId,
    cashierId: cashierId === 'all' ? undefined : cashierId,
    open: status === 'all' ? undefined : status === 'open',
    // mahalliy kun chegaralari (ISO): shu oraliq bilan kesishgan smenalar
    from: parseDateKey(range.from).toISOString(),
    to: parseDateKey(addDays(range.to, 1)).toISOString(),
  }
  // filtr yoki davr o'zgarsa — 1-sahifa
  const filterKey = JSON.stringify(params)
  const [paging, setPaging] = useState({ key: filterKey, page: 1 })
  const page = paging.key === filterKey ? paging.page : 1
  const query = useShifts({ ...params, page, limit: PAGE_SIZE })
  if (query.data && query.data.items.length === 0 && query.data.total > 0 && page > 1) {
    setPaging({ key: filterKey, page: Math.ceil(query.data.total / PAGE_SIZE) })
  }
  const data = useLatest(query.data)
  const list = data?.items ?? []

  const branchName = (id: ID) => branches.find((b) => b.id === id)?.name ?? '—'
  const cashiers = users.filter((u) => u.role === 'cashier' && (branchId === 'all' || u.branchId === branchId))
  const singleDay = range.from === range.to

  const summary = [
    { label: t.admin.shifts.count, value: formatNumber(data?.summary.count ?? 0) },
    { label: t.admin.shifts.openNow, value: formatNumber(data?.summary.open ?? 0), tone: 'text-emerald-700' },
    { label: t.report.total, value: formatMoney(data?.summary.revenue ?? 0, t) },
    { label: t.payment.cash, value: formatMoney(data?.summary.cash ?? 0, t) },
  ]

  // smena yoki buyurtma sahifasi ochiq — ro'yxat o'rnida u ko'rinadi (holat yuqoridagi hook'larda saqlanib turadi)
  if (outlet) return outlet

  return (
    <div className="space-y-5">
      <PageHeader title={t.admin.shifts.title} description={t.admin.shifts.hint} />

      <Card className="space-y-3 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <PeriodFilter period={period} />
          <span className="flex-1" />
          <SegmentedControl
            label={t.common.branch}
            value={branchId}
            onChange={(value) => {
              setBranchId(value)
              setCashierId('all')
            }}
            options={[{ value: 'all', label: t.admin.reports.allBranches }, ...branches.map((b) => ({ value: b.id, label: b.name }))]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl<Status>
            label={t.admin.orders.status}
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: t.common.all },
              { value: 'open', label: t.admin.shifts.open },
              { value: 'closed', label: t.admin.shifts.closed },
            ]}
          />
          <select value={cashierId} onChange={(event) => setCashierId(event.target.value)} aria-label={t.admin.orders.cashier} className={`${selectClass} h-9! w-56!`}>
            <option value="all">{t.admin.orders.allCashiers}</option>
            {cashiers.map((user) => (
              <option key={user.id} value={user.id}>
                {branchId === 'all' && user.branchId ? `${user.name} · ${branchName(user.branchId)}` : user.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 gap-px border-b border-neutral-200 bg-neutral-200 lg:grid-cols-4">
          {summary.map((cell) => (
            <div key={cell.label} className="bg-white px-4 py-2.5">
              <p className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">{cell.label}</p>
              <p className={`text-base font-extrabold whitespace-nowrap ${cell.tone ?? ''}`}>{cell.value}</p>
            </div>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="p-4">
            <ListPlaceholder icon={Clock} empty={t.admin.shifts.empty} query={{ data, error: query.error }} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200">
                  <tr>
                    <th className={thClass}>{t.admin.orders.cashier}</th>
                    <th className={thClass}>{t.common.branch}</th>
                    <th className={thClass}>{t.report.opened}</th>
                    <th className={thClass}>{t.report.closed}</th>
                    <th className={thClass}>{t.admin.shifts.duration}</th>
                    <th className={`${thClass} text-right`}>{t.report.orders}</th>
                    <th className={`${thClass} text-right`}>{t.report.cancelled}</th>
                    <th className={`${thClass} text-right`}>{t.payment.cash}</th>
                    <th className={`${thClass} text-right`}>{t.payment.card}</th>
                    <th className={`${thClass} text-right`}>{t.payment.click}</th>
                    <th className={`${thClass} text-right`}>{t.report.total}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {list.map((shift) => {
                    const s = shift.summary
                    const minutes = shiftMinutes(shift, now)
                    const sameDay = shift.closedAt !== null && dateKey(new Date(shift.closedAt)) === dateKey(new Date(shift.openedAt))
                    const open = () => void navigate(shiftPath(shift.id))
                    return (
                      <tr key={shift.id} onClick={open} className="cursor-pointer transition-colors hover:bg-brand-50/60">
                        <td className={tdClass}>
                          <button type="button" onClick={open} className="cursor-pointer font-bold text-neutral-950 hover:underline">
                            {users.find((u) => u.id === shift.cashierId)?.name ?? '—'}
                          </button>
                        </td>
                        <td className={tdClass}>{branchName(shift.branchId)}</td>
                        <td className={`${tdClass} text-neutral-600 tabular-nums`}>{singleDay ? formatTime(shift.openedAt) : formatDateTime(shift.openedAt)}</td>
                        <td className={`${tdClass} tabular-nums`}>
                          {shift.closedAt ? (
                            <span className="text-neutral-600">{sameDay ? formatTime(shift.closedAt) : formatDateTime(shift.closedAt)}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-300 ring-inset">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {t.admin.shifts.stillOpen}
                            </span>
                          )}
                        </td>
                        <td className={`${tdClass} text-neutral-600`}>{t.admin.shifts.durationValue(Math.floor(minutes / 60), minutes % 60)}</td>
                        <td className={`${tdClass} text-right font-semibold tabular-nums`}>{formatNumber(s.orderCount)}</td>
                        <td className={`${tdClass} text-right tabular-nums ${s.cancelledCount > 0 ? 'font-semibold text-red-700' : 'text-neutral-400'}`}>{formatNumber(s.cancelledCount)}</td>
                        <td className={`${tdClass} text-right tabular-nums`}>{formatMoney(s.byPayment.cash, t)}</td>
                        <td className={`${tdClass} text-right tabular-nums`}>{formatMoney(s.byPayment.card, t)}</td>
                        <td className={`${tdClass} text-right tabular-nums`}>{formatMoney(s.byPayment.click, t)}</td>
                        <td className={`${tdClass} text-right font-extrabold text-neutral-950 tabular-nums`}>{formatMoney(s.total, t)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onChange={(next) => setPaging({ key: filterKey, page: next })} />
          </>
        )}
      </Card>
    </div>
  )
}

import { Plus, Receipt, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api, useDb } from '@/api'
import { useCurrentUser } from '@/api/session'
import { Card, CardHeader } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import { inputClass, selectClass, tdClass, thClass } from '@/components/ui/styles'
import PageHeader from '@/components/ui/PageHeader'
import { EXPENSE_KINDS, type ExpenseKind } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { formatMoney, formatNumber } from '@/lib/format'
import { confirmDialog, showToast } from '@/lib/swal'
import { useToday } from '@/lib/useNow'

/**
 * Rasxodlar (hozircha faqat kommunal: svet, gaz, suv, internet, boshqa): chapda qo'shish formasi, o'ngda tanlangan
 * oy va filial bo'yicha ro'yxat va turlar bo'yicha jami. Hisobotda tushumdan ayriladi.
 */
export default function ExpensesPage() {
  const t = useT()
  const db = useDb()
  const user = useCurrentUser()
  const today = useToday()
  const branches = db.branches.filter((b) => b.active)

  const [branchId, setBranchId] = useState(branches[0]?.id ?? '')
  const [kind, setKind] = useState<ExpenseKind>('electricity')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  const [month, setMonth] = useState(today.slice(0, 7))
  const [filterBranch, setFilterBranch] = useState('all')

  const list = db.expenses
    .filter((e) => e.date.startsWith(month) && (filterBranch === 'all' || e.branchId === filterBranch))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  const total = list.reduce((sum, e) => sum + e.amount, 0)

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) return
    try {
      await api.expenses.create({ branchId, kind, amount: Number(amount), date, note, createdBy: user.id })
      setAmount('')
      setNote('')
      showToast(t.admin.expenses.added)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  const remove = async (id: string) => {
    if (!(await confirmDialog(t.admin.expenses.deleteTitle, t.admin.expenses.deleteText, t.common.delete))) return
    try {
      await api.expenses.delete(id)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t.admin.expenses.title} description={t.admin.expenses.hint} />
      <div className="grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t.admin.expenses.add} />
          <form onSubmit={(event) => void save(event)} className="space-y-3 p-4">
            <Field label={t.common.branch} htmlFor="ex-branch">
              <select id="ex-branch" value={branchId} onChange={(event) => setBranchId(event.target.value)} className={selectClass}>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t.admin.expenses.kind} htmlFor="ex-kind">
              <select id="ex-kind" value={kind} onChange={(event) => setKind(event.target.value as ExpenseKind)} className={selectClass}>
                {EXPENSE_KINDS.map((value) => (
                  <option key={value} value={value}>
                    {t.admin.expenses.kinds[value]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t.admin.expenses.amount} htmlFor="ex-amount">
                <input
                  id="ex-amount"
                  value={amount === '' ? '' : formatNumber(Number(amount))}
                  onChange={(event) => setAmount(event.target.value.replace(/\D/g, '').slice(0, 11))}
                  inputMode="numeric"
                  className={`${inputClass} text-right font-bold tabular-nums`}
                />
              </Field>
              <Field label={t.common.date} htmlFor="ex-date">
                <input id="ex-date" type="date" value={date} max={today} onChange={(event) => setDate(event.target.value)} className={inputClass} />
              </Field>
            </div>
            <Field label={t.common.note} htmlFor="ex-note">
              <input id="ex-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={120} className={inputClass} />
            </Field>
            <button type="submit" disabled={!amount || !date} className="btn-primary flex h-11 w-full items-center justify-center gap-2 rounded text-sm font-bold">
              <Plus size={16} />
              {t.admin.expenses.add}
            </button>
          </form>
        </Card>

        <Card>
          <CardHeader
            title={t.admin.expenses.list}
            actions={
              <span className="flex flex-wrap items-center gap-2">
                <input type="month" value={month} max={today.slice(0, 7)} onChange={(event) => event.target.value && setMonth(event.target.value)} aria-label={t.admin.expenses.month} className={`${inputClass} h-9! w-40!`} />
                <select value={filterBranch} onChange={(event) => setFilterBranch(event.target.value)} aria-label={t.common.branch} className={`${selectClass} h-9! w-40!`}>
                  <option value="all">{t.admin.reports.allBranches}</option>
                  {db.branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </span>
            }
          />
          {list.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={Receipt} title={t.admin.expenses.empty} />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-px border-b border-neutral-200 bg-neutral-200 sm:grid-cols-3 2xl:grid-cols-6">
                {EXPENSE_KINDS.map((value) => (
                  <div key={value} className="bg-white px-3 py-2">
                    <p className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">{t.admin.expenses.kinds[value]}</p>
                    <p className="text-sm font-bold tabular-nums">{formatMoney(list.filter((e) => e.kind === value).reduce((sum, e) => sum + e.amount, 0), t)}</p>
                  </div>
                ))}
                <div className="bg-brand-50 px-3 py-2">
                  <p className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">{t.purchase.total}</p>
                  <p className="text-sm font-extrabold tabular-nums">{formatMoney(total, t)}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-neutral-200">
                    <tr>
                      <th className={thClass}>{t.common.date}</th>
                      <th className={thClass}>{t.common.branch}</th>
                      <th className={thClass}>{t.admin.expenses.kind}</th>
                      <th className={`${thClass} text-right`}>{t.admin.expenses.amount}</th>
                      <th className={thClass} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {list.map((expense) => (
                      <tr key={expense.id}>
                        <td className={`${tdClass} whitespace-nowrap tabular-nums`}>{expense.date.split('-').reverse().join('.')}</td>
                        <td className={tdClass}>{db.branches.find((b) => b.id === expense.branchId)?.name ?? '—'}</td>
                        <td className={tdClass}>
                          {t.admin.expenses.kinds[expense.kind]}
                          {expense.note && <span className="block text-xs text-neutral-500">{expense.note}</span>}
                        </td>
                        <td className={`${tdClass} text-right font-bold whitespace-nowrap tabular-nums`}>{formatMoney(expense.amount, t)}</td>
                        <td className={`${tdClass} text-right`}>
                          <button type="button" onClick={() => void remove(expense.id)} aria-label={t.common.delete} className="btn-icon-danger inline-flex h-8 w-8 items-center justify-center rounded">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

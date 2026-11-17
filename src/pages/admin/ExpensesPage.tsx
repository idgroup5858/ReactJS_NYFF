import { Plus, Receipt, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api } from '@/api'
import { useBranches, useExpenses, useIngredients } from '@/api/queries'
import { Card, CardHeader } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import { inputClass, selectClass, tdClass, thClass } from '@/components/ui/styles'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import { usePagination } from '@/components/ui/usePagination'
import { EXPENSE_KINDS, type DateKey, type Expense, type ExpenseKind, type ID } from '@/domain/types'
import { errorMessage, useLocalize, useT } from '@/i18n'
import { formatMoney, formatNumber } from '@/lib/format'
import { confirmDialog, showToast } from '@/lib/swal'
import { useToday } from '@/lib/useNow'
import IngredientPicker from '@/pages/warehouse/IngredientPicker'

/** mahsulotdan boshqa turlar — tanlash ro'yxatining boshida */
const GENERAL_KINDS = EXPENSE_KINDS.filter((kind) => kind !== 'ingredient')
const isGeneralKind = (id: string): id is ExpenseKind => (GENERAL_KINDS as string[]).includes(id)

/** Oyning oxirgi kuni: `2026-02` → `2026-02-28`. */
function monthEnd(month: string): DateKey {
  const [year, monthNo] = month.split('-').map(Number)
  return `${month}-${String(new Date(year, monthNo, 0).getDate()).padStart(2, '0')}`
}

/**
 * Chiqimlar (kommunal: svet, gaz, suv, internet, boshqa — va ombor mahsulotiga to'lov, qoldiqqa ta'sir qilmaydi): chapda
 * qo'shish formasi (turi — qidiruvli ro'yxat: boshida kommunal turlar, keyin mahsulot guruhlari), o'ngda tanlangan oy va
 * filial bo'yicha ro'yxat (10 tadan sahifalab) va turlar bo'yicha jami. Hisobotda tushumdan ayriladi.
 */
export default function ExpensesPage() {
  const t = useT()
  const localize = useLocalize()
  const today = useToday()
  const allBranches = useBranches().data ?? []
  const branches = allBranches.filter((b) => b.active)
  const allIngredients = useIngredients().data ?? []

  const [branchChoice, setBranchChoice] = useState('')
  // tanlanmagan bo'lsa — birinchi faol filial (filiallar keyinroq yuklanishi mumkin)
  const branchId = branchChoice || branches[0]?.id || ''
  const [kind, setKind] = useState<ExpenseKind>('electricity')
  // faqat `kind: 'ingredient'` da
  const [ingredientId, setIngredientId] = useState<ID>('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  const [month, setMonth] = useState(today.slice(0, 7))
  const [filterBranch, setFilterBranch] = useState('all')
  const [saving, setSaving] = useState(false)

  // tanlangan oy (1-kunidan oxirgi kunigacha) va filial — serverda filtrlanadi
  const expenses = useExpenses({ branchId: filterBranch === 'all' ? undefined : filterBranch, from: `${month}-01`, to: monthEnd(month) })
  const list = [...(expenses.data ?? [])].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  const total = list.reduce((sum, e) => sum + e.amount, 0)
  const { pageItems, pagination, reset } = usePagination(list, `${month}|${filterBranch}`)

  const choose = (id: ID) => {
    if (isGeneralKind(id)) {
      setKind(id)
      setIngredientId('')
    } else {
      setKind('ingredient')
      setIngredientId(id)
    }
  }
  /** jadvalda: mahsulot to'lovi — mahsulot nomi, qolganlari — turi */
  const kindLabel = (expense: Expense) => {
    const ingredient = expense.ingredientId ? allIngredients.find((i) => i.id === expense.ingredientId) : undefined
    return ingredient ? localize(ingredient.name) : t.admin.expenses.kinds[expense.kind]
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      await api.expenses.create({ branchId, kind, ...(kind === 'ingredient' && { ingredientId }), amount: Number(amount), date, note })
      setAmount('')
      setNote('')
      reset()
      showToast(t.admin.expenses.added)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    } finally {
      setSaving(false)
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
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader title={t.admin.expenses.add} />
          <form onSubmit={(event) => void save(event)} className="space-y-3 p-4">
            <Field label={t.common.branch} htmlFor="ex-branch">
              <select id="ex-branch" value={branchId} onChange={(event) => setBranchChoice(event.target.value)} className={selectClass}>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t.admin.expenses.kind} htmlFor="ex-kind">
              <IngredientPicker
                id="ex-kind"
                value={kind === 'ingredient' ? ingredientId : kind}
                onChange={choose}
                extra={{ title: t.admin.expenses.general, items: GENERAL_KINDS.map((value) => ({ id: value, label: t.admin.expenses.kinds[value] })) }}
                ingredients={allIngredients.filter((i) => i.active)}
                selected={allIngredients.find((i) => i.id === ingredientId)}
              />
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
            <button type="submit" disabled={!amount || !date || !branchId || (kind === 'ingredient' && !ingredientId) || saving} className="btn-primary flex h-11 w-full items-center justify-center gap-2 rounded text-sm font-bold">
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
                <input type="month" value={month} max={today.slice(0, 7)} onChange={(event) => event.target.value && setMonth(event.target.value)} aria-label={t.admin.expenses.month} className={`${inputClass} w-40!`} />
                <select value={filterBranch} onChange={(event) => setFilterBranch(event.target.value)} aria-label={t.common.branch} className={`${selectClass} w-40!`}>
                  <option value="all">{t.admin.reports.allBranches}</option>
                  {allBranches.map((branch) => (
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
              {/* yuklanayotganda — xuddi shu bo'sh kartochka (matnsiz), sahifa sakramasin */}
              <EmptyState icon={Receipt} title={expenses.data ? t.admin.expenses.empty : expenses.error ? errorMessage(expenses.error) : '\u00a0'} />
            </div>
          ) : (
            <>
              {/* 6 tur + jami: 2 / 4 ustunda jami ikki katak egallaydi — bo'sh katak qolmaydi */}
              <div className="grid grid-cols-2 gap-px border-b border-neutral-200 bg-neutral-200 sm:grid-cols-4 2xl:grid-cols-7">
                {EXPENSE_KINDS.map((value) => (
                  <div key={value} className="bg-surface px-3 py-2">
                    <p className="text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">{t.admin.expenses.kinds[value]}</p>
                    <p className="text-sm font-bold tabular-nums">{formatMoney(list.filter((e) => e.kind === value).reduce((sum, e) => sum + e.amount, 0), t)}</p>
                  </div>
                ))}
                <div className="col-span-2 bg-brand-50 px-3 py-2 2xl:col-span-1">
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
                    {pageItems.map((expense) => (
                      <tr key={expense.id}>
                        <td className={`${tdClass} whitespace-nowrap tabular-nums`}>{expense.date.split('-').reverse().join('.')}</td>
                        <td className={tdClass}>{allBranches.find((b) => b.id === expense.branchId)?.name ?? '—'}</td>
                        <td className={tdClass}>
                          {kindLabel(expense)}
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
              <Pagination {...pagination} />
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api } from '@/api'
import { useBranches, useUsers } from '@/api/queries'
import { useCurrentUser } from '@/api/session'
import { Card } from '@/components/ui/Card'
import Field from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { inputClass, selectClass, tdClass, thClass } from '@/components/ui/styles'
import Toggle from '@/components/ui/Toggle'
import { usePagination } from '@/components/ui/usePagination'
import UserAvatar from '@/components/ui/UserAvatar'
import { fullName, isValidEmail, isValidPassword, isValidPin, roleNeedsBranch, usesPassword } from '@/domain/rules'
import { ROLES, type Role, type User } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { formatDateTime } from '@/lib/format'
import { confirmDialog, showToast } from '@/lib/swal'
import CouriersCard from './CouriersCard'

/**
 * Xodim qo'shish / tahrirlash: ism, familiya, rol, filial (kassir uchun), PIN (tahrirda bo'sh — o'zgarmaydi), faollik.
 * Admin va kuryer — PIN o'rniga email va parol (admin — `/admin` da, kuryer — ilovadagi yashirin oynadan kiradi).
 */
function StaffForm({ user, onClose }: { user: User | null; onClose: () => void }) {
  const t = useT()
  const actor = useCurrentUser()
  const branches = (useBranches().data ?? []).filter((b) => b.active)
  const [name, setName] = useState(user?.name ?? '')
  const [surname, setSurname] = useState(user?.surname ?? '')
  const [role, setRole] = useState<Role>(user?.role ?? 'cashier')
  const [branchChoice, setBranchChoice] = useState(user?.branchId ?? '')
  // tanlanmagan bo'lsa — birinchi faol filial (filiallar forma ochilgandan keyin kelishi ham mumkin)
  const branchId = branchChoice || branches[0]?.id || ''
  const [pin, setPin] = useState('')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [active, setActive] = useState(user?.active ?? true)
  const [saving, setSaving] = useState(false)
  const self = user?.id === actor?.id
  const withPassword = usesPassword(role)
  // PIN ↔ parol o'zgarsa (masalan kassir → kuryer) eskisi yaramaydi — yangisi majburiy (server ham tekshiradi)
  const secretRequired = !user || usesPassword(user.role) !== withPassword

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    if (!surname.trim()) {
      showToast(t.errors.surname_required, 'error')
      return
    }
    if (withPassword && !isValidEmail(email)) {
      showToast(t.errors.invalid_email, 'error')
      return
    }
    if (withPassword && (secretRequired || password) && !isValidPassword(password)) {
      showToast(t.errors.invalid_password, 'error')
      return
    }
    if (!withPassword && (secretRequired || pin) && !isValidPin(pin)) {
      showToast(t.errors.invalid_pin, 'error')
      return
    }
    setSaving(true)
    try {
      await api.users.save({
        id: user?.id,
        name,
        surname,
        role,
        branchId: roleNeedsBranch(role) ? branchId : null,
        ...(withPassword ? { email, password } : { pin }),
        active,
      })
      showToast(t.common.saved)
      onClose()
    } catch (error) {
      showToast(errorMessage(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={user ? t.admin.staff.edit : t.admin.staff.add}
      onClose={onClose}
      footer={
        <button type="submit" form="staff-form" disabled={saving} className="btn-primary h-11 w-full rounded text-sm font-bold">
          {t.common.save}
        </button>
      }
    >
      <form id="staff-form" onSubmit={(event) => void save(event)} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t.admin.staff.name} htmlFor="st-name">
            <input id="st-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
          </Field>
          <Field label={t.admin.staff.surname} htmlFor="st-surname">
            <input id="st-surname" value={surname} onChange={(event) => setSurname(event.target.value)} className={inputClass} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t.admin.staff.role} htmlFor="st-role">
            <select id="st-role" value={role} disabled={self} onChange={(event) => setRole(event.target.value as Role)} className={selectClass}>
              {ROLES.map((value) => (
                <option key={value} value={value}>
                  {t.roles[value]}
                </option>
              ))}
            </select>
          </Field>
          {roleNeedsBranch(role) && (
            <Field label={t.common.branch} htmlFor="st-branch">
              <select id="st-branch" value={branchId} onChange={(event) => setBranchChoice(event.target.value)} className={selectClass}>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
        {withPassword ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t.admin.staff.email} htmlFor="st-email" hint={t.admin.staff.emailHint}>
              <input
                id="st-email"
                type="email"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(event) => setEmail(event.target.value.replace(/\s/g, '').slice(0, 100))}
                className={inputClass}
              />
            </Field>
            <Field
              label={secretRequired ? t.admin.staff.password : t.admin.staff.newPassword}
              htmlFor="st-password"
              hint={secretRequired ? t.admin.staff.passwordHint : t.admin.staff.passwordKeep}
            >
              <input
                id="st-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value.slice(0, 64))}
                className={inputClass}
              />
            </Field>
          </div>
        ) : (
          <Field
            label={secretRequired ? t.admin.staff.pin : t.admin.staff.newPin}
            htmlFor="st-pin"
            hint={secretRequired ? t.login.pinHint : t.admin.staff.pinKeep}
          >
            <input
              id="st-pin"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 8))}
              className={`${inputClass} text-lg tracking-[0.3em]`}
            />
          </Field>
        )}
        <Toggle checked={active} onChange={setActive} label={t.admin.staff.canLogin} />
        {self && <p className="text-xs text-neutral-500">{t.admin.staff.selfHint}</p>}
      </form>
    </Modal>
  )
}

/**
 * Xodimlar: rol bo'yicha filtr, jadval (rol, filial, holat, qo'shilgan sana), qo'shish, tahrirlash va o'chirish (faqat
 * hech qayerda izi yo'q xodim — aks holda server `in_use`, bloklash kerak).
 */
export default function StaffPage() {
  const t = useT()
  const actor = useCurrentUser()
  const usersQuery = useUsers()
  const branches = useBranches().data ?? []
  const [filter, setFilter] = useState<Role | 'all'>('all')
  const [editing, setEditing] = useState<User | 'new' | null>(null)
  const users = (usersQuery.data ?? [])
    .filter((u) => filter === 'all' || u.role === filter)
    .sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || fullName(a).localeCompare(fullName(b)))
  const { pageItems, pagination } = usePagination(users, filter)

  const remove = async (user: User) => {
    if (!(await confirmDialog(t.admin.staff.deleteTitle, `${fullName(user)}. ${t.admin.staff.deleteText}`, t.common.delete))) return
    try {
      await api.users.remove(user.id)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.admin.staff.title}
        description={t.admin.staff.hint}
        actions={
          <button type="button" onClick={() => setEditing('new')} className="btn-primary flex h-10 items-center gap-2 rounded px-4 text-xs font-bold">
            <Plus size={16} />
            {t.admin.staff.add}
          </button>
        }
      />
      <CouriersCard />
      <SegmentedControl<Role | 'all'>
        label={t.admin.staff.role}
        value={filter}
        onChange={setFilter}
        options={[{ value: 'all', label: t.common.all }, ...ROLES.map((role) => ({ value: role, label: t.roles[role] }))]}
      />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200">
              <tr>
                <th className={thClass}>{t.admin.staff.name}</th>
                <th className={thClass}>{t.admin.staff.role}</th>
                <th className={thClass}>{t.common.branch}</th>
                <th className={thClass}>{t.stock.status}</th>
                <th className={thClass}>{t.admin.staff.added}</th>
                <th className={thClass} />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {pageItems.map((user) => (
                <tr key={user.id} className={user.active ? '' : 'opacity-50'}>
                  <td className={tdClass}>
                    <span className="flex items-center gap-3">
                      <UserAvatar name={fullName(user)} />
                      <span>
                        <span className="block font-semibold">{fullName(user)}</span>
                        {user.email && <span className="block text-xs text-neutral-500">{user.email}</span>}
                      </span>
                    </span>
                  </td>
                  <td className={tdClass}>{t.roles[user.role]}</td>
                  <td className={tdClass}>{user.branchId ? (branches.find((b) => b.id === user.branchId)?.name ?? '—') : t.admin.staff.allBranches}</td>
                  <td className={tdClass}>
                    <span className={`rounded-chip px-2 py-0.5 text-[11px] font-bold uppercase ${user.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-200 text-neutral-600'}`}>
                      {user.active ? t.common.active : t.admin.staff.blocked}
                    </span>
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-neutral-500 tabular-nums`}>{formatDateTime(user.createdAt)}</td>
                  <td className={`${tdClass} whitespace-nowrap text-right`}>
                    <button type="button" onClick={() => setEditing(user)} aria-label={t.common.edit} className="btn-icon inline-flex h-8 w-8 items-center justify-center rounded">
                      <Pencil size={14} />
                    </button>
                    {user.id !== actor?.id && (
                      <button type="button" onClick={() => void remove(user)} aria-label={t.common.delete} className="btn-icon-danger inline-flex h-8 w-8 items-center justify-center rounded">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!usersQuery.data && !!usersQuery.error && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-neutral-500">
                    {errorMessage(usersQuery.error)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination {...pagination} />
      </Card>
      {editing && <StaffForm user={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

import { Pencil, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api, useDb } from '@/api'
import { useCurrentUser } from '@/api/session'
import { Card } from '@/components/ui/Card'
import Field from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import PageHeader from '@/components/ui/PageHeader'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { inputClass, selectClass, tdClass, thClass } from '@/components/ui/styles'
import Toggle from '@/components/ui/Toggle'
import UserAvatar from '@/components/ui/UserAvatar'
import { roleNeedsBranch } from '@/domain/logic/users'
import { ROLES, type Role, type User } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { formatDateTime } from '@/lib/format'
import { showToast } from '@/lib/swal'

/** Xodim qo'shish / tahrirlash: ism, rol, filial (kassir uchun), PIN (tahrirda bo'sh — o'zgarmaydi), faollik. */
function StaffForm({ user, onClose }: { user: User | null; onClose: () => void }) {
  const t = useT()
  const db = useDb()
  const actor = useCurrentUser()
  const branches = db.branches.filter((b) => b.active)
  const [name, setName] = useState(user?.name ?? '')
  const [role, setRole] = useState<Role>(user?.role ?? 'cashier')
  const [branchId, setBranchId] = useState(user?.branchId ?? branches[0]?.id ?? '')
  const [pin, setPin] = useState('')
  const [active, setActive] = useState(user?.active ?? true)
  const self = user?.id === actor?.id

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!actor) return
    try {
      await api.users.save({ id: user?.id, name, role, branchId: roleNeedsBranch(role) ? branchId : null, pin, active }, actor.id)
      showToast(t.common.saved)
      onClose()
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  return (
    <Modal
      title={user ? t.admin.staff.edit : t.admin.staff.add}
      onClose={onClose}
      footer={
        <button type="submit" form="staff-form" className="btn-primary h-11 w-full rounded text-sm font-bold">
          {t.common.save}
        </button>
      }
    >
      <form id="staff-form" onSubmit={(event) => void save(event)} className="space-y-3">
        <Field label={t.admin.staff.name} htmlFor="st-name">
          <input id="st-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
        </Field>
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
              <select id="st-branch" value={branchId} onChange={(event) => setBranchId(event.target.value)} className={selectClass}>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
        <Field label={user ? t.admin.staff.newPin : t.admin.staff.pin} htmlFor="st-pin" hint={user ? t.admin.staff.pinKeep : t.login.pinHint}>
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
        <Toggle checked={active} onChange={setActive} label={t.admin.staff.canLogin} />
        {self && <p className="text-xs text-neutral-500">{t.admin.staff.selfHint}</p>}
      </form>
    </Modal>
  )
}

/** Xodimlar: rol bo'yicha filtr, jadval (rol, filial, holat, qo'shilgan sana), qo'shish va tahrirlash. */
export default function StaffPage() {
  const t = useT()
  const db = useDb()
  const [filter, setFilter] = useState<Role | 'all'>('all')
  const [editing, setEditing] = useState<User | 'new' | null>(null)
  const users = db.users.filter((u) => filter === 'all' || u.role === filter).sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || a.name.localeCompare(b.name))

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
              {users.map((user) => (
                <tr key={user.id} className={user.active ? '' : 'opacity-50'}>
                  <td className={tdClass}>
                    <span className="flex items-center gap-3">
                      <UserAvatar name={user.name} />
                      <span className="font-semibold">{user.name}</span>
                    </span>
                  </td>
                  <td className={tdClass}>{t.roles[user.role]}</td>
                  <td className={tdClass}>{db.branches.find((b) => b.id === user.branchId)?.name ?? t.admin.staff.allBranches}</td>
                  <td className={tdClass}>
                    <span className={`rounded-chip px-2 py-0.5 text-[11px] font-bold uppercase ${user.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-200 text-neutral-600'}`}>
                      {user.active ? t.common.active : t.admin.staff.blocked}
                    </span>
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-neutral-500 tabular-nums`}>{formatDateTime(user.createdAt)}</td>
                  <td className={`${tdClass} text-right`}>
                    <button type="button" onClick={() => setEditing(user)} aria-label={t.common.edit} className="btn-icon inline-flex h-8 w-8 items-center justify-center rounded">
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {editing && <StaffForm user={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

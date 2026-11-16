import { TriangleAlert } from 'lucide-react'
import UserAvatar from '@/components/ui/UserAvatar'
import { fullName } from '@/domain/rules'
import type { StaffMember, Timestamp } from '@/domain/types'
import { useT } from '@/i18n'
import { formatDateTime, formatTime } from '@/lib/format'

/** Smena qachondan ochiq: bugun — `08:15`, boshqa kun — sana bilan. */
function since(iso: Timestamp): string {
  return new Date(iso).toDateString() === new Date().toDateString() ? formatTime(iso) : formatDateTime(iso)
}

/**
 * Kassirlar ro'yxati (kassa kirish ekrani): smenasini topshirmay ketgan kassir (`openShiftAt`) — tepada ogohlantirish
 * va kartochkasida belgi. Boshqa kassir kirsa, server o'sha smenani yopadi; kassirning o'zi kirsa — smenasi davom etadi.
 */
export default function UserStep({ users, onSelect }: { users: StaffMember[]; onSelect: (user: StaffMember) => void }) {
  const t = useT()
  if (users.length === 0) return <p className="py-8 text-center text-sm text-neutral-500">{t.login.noUsers}</p>

  const leftOpen = users.filter((user) => user.openShiftAt)

  return (
    <div className="space-y-3">
      {leftOpen.length > 0 && (
        <div role="alert" className="flex gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
          <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="min-w-0">
            {leftOpen.map((user) => (
              <p key={user.id} className="font-bold text-amber-900">
                {t.login.shiftLeftOpen(fullName(user), since(user.openShiftAt!))}
              </p>
            ))}
            <p className="text-xs text-neutral-600">{t.login.shiftLeftOpenHint}</p>
          </div>
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {users.map((user) => (
          <button
            key={user.id}
            type="button"
            onClick={() => onSelect(user)}
            className={`flex cursor-pointer items-center gap-3 rounded-card border bg-white px-4 py-3 text-left transition-colors hover:border-select hover:bg-brand-50 ${
              user.openShiftAt ? 'border-amber-200' : 'border-neutral-200'
            }`}
          >
            <UserAvatar name={fullName(user)} />
            <span className="min-w-0">
              <span className="block text-base leading-tight font-bold text-neutral-950">{fullName(user)}</span>
              <span className="block text-xs text-neutral-500">{t.roles[user.role]}</span>
              {user.openShiftAt && (
                <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900">
                  {t.login.shiftLeftOpenBadge(since(user.openShiftAt))}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

import UserAvatar from '@/components/ui/UserAvatar'
import type { AuthUser } from '@/domain/types'
import { useT } from '@/i18n'

export default function UserStep({ users, onSelect }: { users: AuthUser[]; onSelect: (user: AuthUser) => void }) {
  const t = useT()
  if (users.length === 0) return <p className="py-8 text-center text-sm text-neutral-500">{t.login.noUsers}</p>

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {users.map((user) => (
        <button
          key={user.id}
          type="button"
          onClick={() => onSelect(user)}
          className="flex cursor-pointer items-center gap-3 rounded-card border border-neutral-200 bg-white px-4 py-3 text-left transition-colors hover:border-select hover:bg-brand-50"
        >
          <UserAvatar name={user.name} />
          <span className="min-w-0">
            <span className="block text-base leading-tight font-bold text-neutral-950">{user.name}</span>
            <span className="block text-xs text-neutral-500">{t.roles[user.role]}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

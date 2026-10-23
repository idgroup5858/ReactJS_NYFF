import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  icon: LucideIcon
  title: string
  message?: ReactNode
  action?: ReactNode
}

/** Ma'lumot bo'lmaganda ko'rinadigan uzuq chiziqli kartochka. */
export default function EmptyState({ icon: Icon, title, message, action }: Props) {
  return (
    <div className="surface rounded-card border border-dashed border-neutral-300 px-6 py-16 text-center">
      <Icon className="mx-auto mb-3 text-neutral-300" size={36} />
      <p className="text-sm font-semibold text-neutral-700">{title}</p>
      {message && <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">{message}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

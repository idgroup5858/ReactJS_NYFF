import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { useT } from '@/i18n'

export type Crumb = { label: string; to?: string }

/** Ichma-ich sahifalar yo'li: ← (bir pog'ona yuqoriga) va "Smenalar › Smena · Dilnoza › #012"; oxirgisi — joriy sahifa. */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = useT()
  const back = items.length > 1 ? items[items.length - 2].to : undefined
  return (
    <nav aria-label={t.common.breadcrumbs} className="flex flex-wrap items-center gap-2.5 text-sm">
      {back && (
        <Link to={back} aria-label={t.common.back} title={t.common.back} className="btn-icon flex h-9 w-9 items-center justify-center rounded">
          <ChevronLeft size={18} />
        </Link>
      )}
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li key={`${index}-${item.label}`} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight size={14} className="text-neutral-300" />}
              {item.to && !last ? (
                <Link to={item.to} className="font-semibold text-neutral-500 transition-colors hover:text-neutral-950">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className="font-bold text-neutral-950">
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

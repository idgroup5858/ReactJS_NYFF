import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useT } from '@/i18n'

type Props = {
  /** joriy sahifa, 1 dan boshlanadi */
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}

/** Ko'rsatiladigan sahifa raqamlari: 1 … 4 5 6 … 12 (null — "…"). 7 tagacha bo'lsa — hammasi. */
function pageList(page: number, pages: number): (number | null)[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  const middle = [page - 1, page, page + 1].filter((p) => p > 1 && p < pages)
  return [1, ...(middle[0] > 2 ? [null] : []), ...middle, ...(middle[middle.length - 1] < pages - 1 ? [null] : []), pages]
}

/** Jadval ostidagi sahifalash: chapda "11–20 / 34 ta", o'ngda ‹ 1 2 3 ›. Bitta sahifaga sig'sa — ko'rinmaydi. */
export default function Pagination({ page, pageSize, total, onChange }: Props) {
  const t = useT()
  const pages = Math.ceil(total / pageSize)
  if (pages <= 1) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-4 py-3">
      <p className="text-xs text-neutral-500 tabular-nums">{t.common.pageRange(from, to, total)}</p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          aria-label={t.common.prevPage}
          title={t.common.prevPage}
          className="btn-icon flex h-8 w-8 items-center justify-center rounded"
        >
          <ChevronLeft size={16} />
        </button>
        {pageList(page, pages).map((item, index) =>
          item === null ? (
            <span key={`gap-${index}`} className="w-6 text-center text-xs text-neutral-400">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              aria-current={item === page ? 'page' : undefined}
              className={`h-8 min-w-8 rounded px-2 text-xs font-bold tabular-nums ${item === page ? 'btn-primary' : 'btn-icon'}`}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page === pages}
          aria-label={t.common.nextPage}
          title={t.common.nextPage}
          className="btn-icon flex h-8 w-8 items-center justify-center rounded"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  )
}

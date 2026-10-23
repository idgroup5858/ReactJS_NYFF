import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { useT } from '@/i18n'

type Props = {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** false — fon va Esc bilan yopilmaydi (masalan smena hisoboti: faqat tugma bilan) */
  dismissable?: boolean
}

const WIDTHS = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' }

/** Ilova oynasi — SweetAlert dialoglari bilan bir xil anatomiya: sarlavha · ✕ → matn → tugmalar. */
export default function Modal({ title, onClose, children, footer, size = 'md', dismissable = true }: Props) {
  const t = useT()

  useEffect(() => {
    if (!dismissable) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dismissable, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => dismissable && event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`page-enter flex max-h-full w-full flex-col overflow-hidden rounded-card border border-line bg-white shadow-2xl ${WIDTHS[size]}`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 py-2.5 pr-3 pl-5">
          <h2 className="title-section text-neutral-900">{title}</h2>
          {dismissable && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t.common.close}
              title={t.common.close}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex shrink-0 gap-2 border-t border-neutral-200 px-5 py-4">{footer}</div>}
      </div>
    </div>
  )
}

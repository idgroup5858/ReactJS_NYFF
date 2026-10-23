import type { ReactNode } from 'react'

export type SegmentOption<T extends string> = {
  value: T
  label: ReactNode
  /** tooltip va ekran o'quvchi uchun nom — yorliqda faqat ikonka qolganda kerak */
  title?: string
}

type Props<T extends string> = {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  /** qora fon ustida (header, kirish ekrani) */
  tone?: 'light' | 'dark'
}

/** Segmentli tanlov: yo'lak ichida faol variant ajralib turadi (qora fonda — sariq). */
export default function SegmentedControl<T extends string>({ options, value, onChange, label, tone = 'light' }: Props<T>) {
  const track = tone === 'dark' ? 'bg-white/10' : 'bg-neutral-200/70'
  const activeClass = tone === 'dark' ? 'bg-taxi text-coal' : 'bg-taxi text-coal shadow-sm'
  const idleClass = tone === 'dark' ? 'text-white/60 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'
  return (
    <div role="tablist" aria-label={label} className={`inline-flex h-9 max-w-full items-center gap-1 overflow-x-auto rounded p-1 ${track}`}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            title={option.title}
            aria-label={option.title}
            onClick={() => onChange(option.value)}
            className={`flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded px-3 text-xs font-semibold whitespace-nowrap transition-colors ${active ? activeClass : idleClass}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

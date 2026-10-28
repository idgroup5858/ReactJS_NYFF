import { Minus, Plus } from 'lucide-react'
import { useT } from '@/i18n'

type Props = {
  value: number
  onChange: (delta: -1 | 1) => void
  /** kiosk — kattaroq tugmalar; kassa savati — ixcham */
  size?: 'sm' | 'md' | 'lg'
  /** 1 da "−" bosilmasin (kioskda taom oynasi: 0 ga tushmaydi) */
  min?: number
}

/** Soni: − 2 + — sarg'ish va sariq kvadrat tugmalar. */
export default function QtyStepper({ value, onChange, size = 'md', min = 0 }: Props) {
  const t = useT()
  const box = { sm: 'h-7 w-7', md: 'h-9 w-9', lg: 'h-12 w-12' }[size]
  const icon = { sm: 14, md: 16, lg: 22 }[size]
  const number = { sm: 'w-6 text-sm', md: 'w-8 text-base', lg: 'w-10 text-xl' }[size]

  return (
    <span className={`inline-flex items-center ${size === 'sm' ? 'gap-1' : 'gap-1.5'}`}>
      <button
        type="button"
        onClick={() => onChange(-1)}
        disabled={value <= min}
        aria-label={t.kassa.decrease}
        className={`flex shrink-0 cursor-pointer items-center justify-center rounded bg-brand-100 text-coal transition-colors hover:bg-brand-200 disabled:cursor-not-allowed disabled:opacity-40 ${box}`}
      >
        <Minus size={icon} strokeWidth={2.5} />
      </button>
      <span className={`text-center font-extrabold tabular-nums ${number}`}>{value}</span>
      <button
        type="button"
        onClick={() => onChange(1)}
        aria-label={t.kassa.increase}
        className={`flex shrink-0 cursor-pointer items-center justify-center rounded bg-taxi text-coal transition-colors hover:bg-taxi-hover ${box}`}
      >
        <Plus size={icon} strokeWidth={2.5} />
      </button>
    </span>
  )
}

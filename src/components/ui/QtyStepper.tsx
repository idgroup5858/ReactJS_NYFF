import { Minus, Plus } from 'lucide-react'
import { useT } from '@/i18n'

type Props = {
  value: number
  onChange: (delta: -1 | 1) => void
  /** kiosk — kattaroq tugmalar */
  size?: 'md' | 'lg'
  /** 1 da "−" bosilmasin (kioskda taom oynasi: 0 ga tushmaydi) */
  min?: number
}

/** Soni: − 2 + — sarg'ish va sariq kvadrat tugmalar. */
export default function QtyStepper({ value, onChange, size = 'md', min = 0 }: Props) {
  const t = useT()
  const box = size === 'lg' ? 'h-12 w-12' : 'h-9 w-9'
  const icon = size === 'lg' ? 22 : 16

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(-1)}
        disabled={value <= min}
        aria-label={t.kassa.decrease}
        className={`flex shrink-0 cursor-pointer items-center justify-center rounded bg-brand-100 text-coal transition-colors hover:bg-brand-200 disabled:cursor-not-allowed disabled:opacity-40 ${box}`}
      >
        <Minus size={icon} strokeWidth={2.5} />
      </button>
      <span className={`text-center font-extrabold tabular-nums ${size === 'lg' ? 'w-10 text-xl' : 'w-8 text-base'}`}>{value}</span>
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

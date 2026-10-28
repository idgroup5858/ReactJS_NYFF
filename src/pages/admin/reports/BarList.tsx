import type { LucideIcon } from 'lucide-react'

export type BarListRow = {
  key: string
  label: string
  icon?: LucideIcon
  value: number
  /** o'ng tomondagi asosiy matn (summa) */
  valueText: string
  /** ostidagi kichik matn (buyurtmalar soni) */
  sub?: string
}

/**
 * Ulushlar ro'yxati: har bir qator o'z yorlig'i bilan (rang emas, yozuv ajratadi), bitta rangli chiziq — uzunligi
 * umumiy summadagi ulushi, ya'ni o'ngdagi foiz bilan bir xil (41% → chiziqning 41%i).
 */
export default function BarList({ rows, total }: { rows: BarListRow[]; total: number }) {
  return (
    <ul className="space-y-3">
      {rows.map(({ key, label, icon: Icon, value, valueText, sub }) => {
        const share = total > 0 ? (value / total) * 100 : 0
        return (
          <li key={key} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2 font-semibold text-neutral-800">
                {Icon && <Icon size={15} className="shrink-0 text-neutral-400" />}
                <span className="leading-tight">{label}</span>
              </span>
              <span className="shrink-0 text-right whitespace-nowrap tabular-nums">
                <span className="font-bold text-neutral-950">{valueText}</span>
                <span className="ml-2 text-xs text-neutral-500">{Math.round(share)}%</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
              <div className="h-full rounded-full bg-coal" style={{ width: `${share}%` }} />
            </div>
            {sub && <p className="text-xs text-neutral-500">{sub}</p>}
          </li>
        )
      })}
    </ul>
  )
}

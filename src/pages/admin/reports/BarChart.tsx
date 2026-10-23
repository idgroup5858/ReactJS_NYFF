import { useState } from 'react'
import { useT } from '@/i18n'
import { formatCompact } from '@/lib/format'

export type BarPoint = {
  key: string
  /** o'qdagi qisqa yorliq ("23", "14:00") */
  label: string
  /** tooltip sarlavhasi ("23.10.2026, payshanba") */
  title: string
  value: number
  /** tooltipdagi qo'shimcha qatorlar */
  details: string[]
}

type Props = {
  points: BarPoint[]
  /** qiymat matni (tooltip va jadvalda) */
  format: (value: number) => string
  /** o'q yorlig'i har nechanchi ustunda (30 kunda — har 5-chi) */
  labelEvery?: number
  caption: string
}

/** O'q chegarasi: eng katta qiymatdan yuqori, 4 ga bo'linganda ham "chiroyli" son (1, 2, 4, 6, 8 × 10ⁿ). */
function niceMax(value: number): number {
  if (value <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 4, 6, 8, 10].find((n) => n * power >= value) ?? 10
  return step * power
}

/**
 * Bitta qatorli ustunli diagramma (bitta seriya — legenda kerak emas, sarlavha nomlaydi): qora ingichka ustunlar,
 * 4px yumaloq uchlar, xira to'r chiziqlari; ustun ustiga kelganda tooltip. Ostida — jadval ko'rinishi.
 */
export default function BarChart({ points, format, labelEvery = 1, caption }: Props) {
  const t = useT()
  const [hover, setHover] = useState<number | null>(null)
  const max = niceMax(Math.max(0, ...points.map((p) => p.value)))
  const ticks = [1, 0.75, 0.5, 0.25, 0]
  const active = hover !== null ? points[hover] : null

  return (
    <figure className="space-y-3">
      <div className="relative flex h-64 gap-2">
        <div className="flex w-14 shrink-0 flex-col justify-between pb-6 text-right text-[11px] text-neutral-400 tabular-nums">
          {ticks.map((tick) => (
            <span key={tick} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {formatCompact(max * tick, t)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
            {ticks.map((tick) => (
              <span key={tick} className={`h-px w-full ${tick === 0 ? 'bg-neutral-300' : 'bg-neutral-200/70'}`} />
            ))}
          </div>
          <div className="absolute inset-0 flex items-stretch gap-[2px]" onMouseLeave={() => setHover(null)}>
            {points.map((point, index) => {
              const height = (point.value / max) * 100
              return (
                <div
                  key={point.key}
                  className="group relative flex min-w-0 flex-1 cursor-default flex-col justify-end pb-6"
                  onMouseEnter={() => setHover(index)}
                  onFocus={() => setHover(index)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  aria-label={`${point.title}: ${format(point.value)}`}
                >
                  <div className={`absolute inset-x-0 top-0 bottom-6 rounded-[4px] ${hover === index ? 'bg-neutral-900/[0.04]' : ''}`} />
                  <div
                    className={`relative mx-auto w-full max-w-10 rounded-t-[4px] transition-colors ${hover === index ? 'bg-select' : 'bg-coal'}`}
                    style={{ height: `${Math.max(point.value > 0 ? 1.5 : 0, height)}%` }}
                  />
                  <span className="absolute inset-x-0 bottom-0 truncate text-center text-[11px] text-neutral-500 tabular-nums">
                    {index % labelEvery === 0 ? point.label : ''}
                  </span>
                </div>
              )
            })}
          </div>
          {active && hover !== null && (
            <div
              className="pointer-events-none absolute top-0 z-10 w-48 -translate-x-1/2 rounded-card bg-coal px-3 py-2 text-xs text-white shadow-xl"
              style={{ left: `${Math.min(88, Math.max(12, ((hover + 0.5) / points.length) * 100))}%` }}
            >
              <p className="font-semibold text-white/70">{active.title}</p>
              <p className="text-base font-extrabold text-taxi tabular-nums">{format(active.value)}</p>
              {active.details.map((line) => (
                <p key={line} className="text-white/80 tabular-nums">
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-xs font-semibold text-neutral-500 hover:text-neutral-900">{t.admin.reports.tableView}</summary>
        <table className="mt-2 w-full text-sm">
          <caption className="sr-only">{caption}</caption>
          <tbody className="divide-y divide-neutral-100">
            {points.map((point) => (
              <tr key={point.key}>
                <td className="py-1 text-neutral-600">{point.title}</td>
                <td className="py-1 text-right font-semibold tabular-nums">{format(point.value)}</td>
                <td className="py-1 pl-4 text-right text-neutral-500 tabular-nums">{point.details.join(' · ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

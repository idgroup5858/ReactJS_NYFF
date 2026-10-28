import SegmentedControl from '@/components/ui/SegmentedControl'
import { inputClass } from '@/components/ui/styles'
import { useT } from '@/i18n'
import type { Period, Preset } from './usePeriod'

/** Davr tugmalari, "Tanlash"da — ikki sana maydoni (hisobotlar va buyurtmalar sahifasida bir xil). */
export default function PeriodFilter({ period }: { period: Period }) {
  const t = useT()
  const { today, preset, setPreset, custom, setCustom } = period
  return (
    <>
      <SegmentedControl<Preset>
        label={t.admin.reports.period}
        value={preset}
        onChange={setPreset}
        options={[
          { value: 'today', label: t.admin.reports.today },
          { value: 'yesterday', label: t.admin.reports.yesterday },
          { value: 'week', label: t.admin.reports.week },
          { value: 'month', label: t.admin.reports.month },
          { value: 'custom', label: t.admin.reports.custom },
        ]}
      />
      {preset === 'custom' && (
        <span className="flex items-center gap-2">
          <input type="date" value={custom.from} max={today} onChange={(event) => event.target.value && setCustom({ ...custom, from: event.target.value })} aria-label={t.admin.reports.from} className={`${inputClass} h-9! w-40!`} />
          <span className="text-neutral-400">—</span>
          <input type="date" value={custom.to} max={today} onChange={(event) => event.target.value && setCustom({ ...custom, to: event.target.value })} aria-label={t.admin.reports.to} className={`${inputClass} h-9! w-40!`} />
        </span>
      )}
    </>
  )
}

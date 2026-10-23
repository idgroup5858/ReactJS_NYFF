import { ChevronRight } from 'lucide-react'
import { useT } from '@/i18n'
import { MODE_ICONS, SCREEN_MODES, STAFF_MODES, type LoginMode } from './modes'

function ModeTile({ mode, onSelect }: { mode: LoginMode; onSelect: (mode: LoginMode) => void }) {
  const t = useT()
  const Icon = MODE_ICONS[mode]
  const { title, hint } = t.modes[mode]
  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      className="group flex cursor-pointer items-center gap-4 rounded-card border border-neutral-200 bg-white px-4 py-4 text-left transition-colors hover:border-select hover:bg-brand-50"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-coal text-taxi transition-colors group-hover:bg-taxi group-hover:text-coal">
        <Icon size={24} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-neutral-950">{title}</span>
        <span className="block text-xs text-neutral-500">{hint}</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-neutral-300 transition-colors group-hover:text-coal" />
    </button>
  )
}

function SectionLabel({ children }: { children: string }) {
  return <p className="mb-2 text-[10px] font-semibold tracking-[0.2em] text-neutral-400 uppercase">{children}</p>
}

export default function ModeStep({ onSelect }: { onSelect: (mode: LoginMode) => void }) {
  const t = useT()
  return (
    <div className="space-y-5">
      <div>
        <SectionLabel>{t.login.staff}</SectionLabel>
        <div className="grid gap-2 sm:grid-cols-2">
          {STAFF_MODES.map((mode) => (
            <ModeTile key={mode} mode={mode} onSelect={onSelect} />
          ))}
        </div>
      </div>
      <div>
        <SectionLabel>{t.login.screens}</SectionLabel>
        <div className="grid gap-2 sm:grid-cols-2">
          {SCREEN_MODES.map((mode) => (
            <ModeTile key={mode} mode={mode} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </div>
  )
}

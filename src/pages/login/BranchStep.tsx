import { ChevronRight, MapPin } from 'lucide-react'
import type { Branch } from '@/domain/types'
import { useT } from '@/i18n'
import { useSettings } from '@/store/settingsStore'

export default function BranchStep({ branches, onSelect }: { branches: Branch[]; onSelect: (branch: Branch) => void }) {
  const t = useT()
  const { lastBranchId } = useSettings()
  if (branches.length === 0) return <p className="py-8 text-center text-sm text-neutral-500">{t.login.noBranches}</p>

  return (
    <div className="space-y-2">
      {branches.map((branch) => (
        <button
          key={branch.id}
          type="button"
          onClick={() => onSelect(branch)}
          className="group flex w-full cursor-pointer items-center gap-4 rounded-card border border-neutral-200 bg-white px-4 py-3.5 text-left transition-colors hover:border-select hover:bg-brand-50"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-coal text-taxi">
            <MapPin size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="text-base font-bold text-neutral-950">{branch.name}</span>
              {branch.id === lastBranchId && (
                <span className="rounded bg-taxi px-1.5 py-px text-[10px] font-bold tracking-wider text-coal uppercase">{t.login.lastUsed}</span>
              )}
            </span>
            <span className="block text-xs text-neutral-500">{branch.address}</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-neutral-300 transition-colors group-hover:text-coal" />
        </button>
      ))}
    </div>
  )
}

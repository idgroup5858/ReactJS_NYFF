import { Hexagon, Store, Trash2, Undo2, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import Field from '@/components/ui/Field'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { inputClass, selectClass } from '@/components/ui/styles'
import Toggle from '@/components/ui/Toggle'
import type { Branch } from '@/domain/types'
import { useT } from '@/i18n'
import type { DeliveryDraft, DrawTool } from './draft'

type Props = {
  branch: Branch
  color: string
  draft: DeliveryDraft
  /** zaxira filial sifatida tanlash mumkin bo'lganlar */
  others: Branch[]
  onPatch: (patch: Partial<DeliveryDraft>) => void
  onUndo: () => void
  onClear: () => void
  onSave: () => void
  onClose: () => void
}

const toolButton = 'btn-ghost flex h-8 cursor-pointer items-center gap-1.5 rounded px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40'

/** Xarita yonidagi panel: nima chiziladi (hudud / filial joyi), hudud narxi, zaxira filial, online qabul qilish. */
export default function DeliveryEditor({ branch, color, draft, others, onPatch, onUndo, onClear, onSave, onClose }: Props) {
  const t = useT()
  const d = t.admin.delivery
  const points = draft.zone.length

  return (
    <Card className="flex min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="h-3.5 w-3.5 shrink-0 rounded-full shadow ring-2 ring-white" style={{ background: color }} />
        <p className="min-w-0 flex-1 truncate font-extrabold text-neutral-950">{branch.name}</p>
        <button type="button" onClick={onClose} aria-label={t.common.close} title={t.common.close} className="btn-icon flex h-8 w-8 items-center justify-center rounded">
          <X size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div className="space-y-2.5">
          <SegmentedControl<DrawTool>
            label={d.tool}
            value={draft.tool}
            onChange={(tool) => onPatch({ tool })}
            options={[
              { value: 'zone', label: <><Hexagon size={14} /> {d.toolZone}</> },
              { value: 'location', label: <><Store size={14} /> {d.toolLocation}</> },
            ]}
          />
          {draft.tool === 'zone' ? (
            <>
              <p className="text-xs leading-relaxed text-neutral-500">{d.zoneHelp}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`mr-auto text-sm font-bold ${points > 0 && points < 3 ? 'text-amber-700' : 'text-neutral-800'}`}>
                  {points > 0 && points < 3 ? d.minPoints : d.points(points)}
                </span>
                <button type="button" onClick={onUndo} disabled={draft.past.length === 0} className={toolButton}>
                  <Undo2 size={14} />
                  {d.undo}
                </button>
                <button type="button" onClick={onClear} disabled={points === 0} className={toolButton}>
                  <Trash2 size={14} />
                  {d.clear}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs leading-relaxed text-neutral-500">{d.locationHelp}</p>
              {draft.location ? (
                <p className="font-mono text-xs text-neutral-600">
                  {draft.location.lat.toFixed(5)}, {draft.location.lng.toFixed(5)}
                </p>
              ) : (
                <p className="text-xs font-semibold text-amber-700">{d.noLocation}</p>
              )}
            </>
          )}
        </div>

        <Field label={d.fee} htmlFor="dz-fee" hint={d.feeHint}>
          <div className="relative">
            <input
              id="dz-fee"
              value={draft.fee}
              onChange={(event) => onPatch({ fee: event.target.value.replace(/\D/g, '').slice(0, 7) })}
              inputMode="numeric"
              className={`${inputClass} pr-12 text-right font-bold tabular-nums`}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-neutral-400">{t.common.soum}</span>
          </div>
        </Field>

        <Field label={d.fallback} htmlFor="dz-fallback" hint={d.fallbackHint}>
          <select id="dz-fallback" value={draft.fallbackBranchId} onChange={(event) => onPatch({ fallbackBranchId: event.target.value })} className={selectClass}>
            <option value="">{d.fallbackNone}</option>
            {others.map((other) => (
              <option key={other.id} value={other.id}>
                {other.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="space-y-1">
          <Toggle checked={draft.onlineEnabled} onChange={(onlineEnabled) => onPatch({ onlineEnabled })} label={d.onlineToggle} />
          <p className="text-xs text-neutral-500">{d.onlineToggleHint}</p>
        </div>
      </div>

      <div className="flex gap-2 border-t border-line p-3">
        <button type="button" onClick={onClose} className="btn-ghost h-11 flex-1 cursor-pointer rounded text-sm font-semibold">
          {t.common.cancel}
        </button>
        <button type="button" onClick={onSave} className="btn-primary h-11 flex-1 cursor-pointer rounded text-sm font-bold">
          {t.common.save}
        </button>
      </div>
    </Card>
  )
}

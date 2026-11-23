import type { IngredientGroup } from '@/domain/types'
import { useLocalize } from '@/i18n'
import { assetUrl } from '@/lib/assetUrl'

/**
 * Guruh sarlavhasi: 3D ikonka (ikonkasiz guruhda — yo'q) + nomi + soni ("NON · 5") — qoldiqlar va mahsulotlar
 * sahifasida; `compact` — jadval ichida.
 */
export default function GroupHeading({ group, count, compact = false }: { group: IngredientGroup; count: number; compact?: boolean }) {
  const localize = useLocalize()
  return (
    <h3 className="flex items-center gap-2.5 text-[11px] font-bold tracking-[0.14em] text-neutral-500 uppercase">
      {group.icon && <img src={assetUrl(group.icon)} alt="" className={`shrink-0 object-contain ${compact ? 'h-6 w-6' : 'h-8 w-8'}`} loading="lazy" />}
      <span>
        {localize(group.name)} <span className="tabular-nums">· {count}</span>
      </span>
    </h3>
  )
}

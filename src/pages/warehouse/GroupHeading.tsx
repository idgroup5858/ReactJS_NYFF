import type { IngredientGroup } from '@/domain/types'
import { useT } from '@/i18n'
import { assetUrl } from '@/lib/assetUrl'
import { GROUP_ICONS } from '@/lib/groupIcons'

/** Guruh sarlavhasi: 3D ikonka + nomi + soni ("NON · 5") — qoldiqlar va mahsulotlar sahifasida; `compact` — jadval ichida. */
export default function GroupHeading({ group, count, compact = false }: { group: IngredientGroup; count: number; compact?: boolean }) {
  const t = useT()
  return (
    <h3 className="flex items-center gap-2.5 text-[11px] font-bold tracking-[0.14em] text-neutral-500 uppercase">
      <img src={assetUrl(GROUP_ICONS[group])} alt="" className={`shrink-0 object-contain ${compact ? 'h-6 w-6' : 'h-8 w-8'}`} loading="lazy" />
      <span>
        {t.stock.groups[group]} <span className="tabular-nums">· {count}</span>
      </span>
    </h3>
  )
}

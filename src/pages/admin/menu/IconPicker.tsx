import { ImageOff } from 'lucide-react'
import { useT } from '@/i18n'
import { assetUrl } from '@/lib/assetUrl'
import { CATEGORY_ICONS } from '@/lib/categoryIcons'

type Props = {
  value: string
  onChange: (value: string) => void
  /** tanlanadigan ikonkalar; berilmasa — kategoriya ikonkalari */
  icons?: string[]
  /** "ikonkasiz" katagi yozuvi va pastdagi izoh; berilmasa — kategoriyaniki */
  noIconLabel?: string
  hint?: string
}

/**
 * Ikonka tanlash (3D ikonkalar to'plami) yoki ikonkasiz: kategoriyada (unda kategoriya rasmi ko'rinadi) va ombor
 * guruhida (`icons`, `noIconLabel`, `hint` bilan).
 */
export default function IconPicker({ value, onChange, icons = CATEGORY_ICONS, noIconLabel, hint }: Props) {
  const t = useT()
  const noIcon = noIconLabel ?? t.admin.menu.noIcon
  const cell = (selected: boolean) =>
    `flex aspect-square cursor-pointer items-center justify-center rounded border-2 bg-surface p-1 transition-colors ${selected ? 'border-select' : 'border-transparent hover:border-neutral-300'}`

  return (
    <div className="space-y-2">
      <div className="grid max-h-40 grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1.5 overflow-y-auto rounded-card border border-neutral-200 bg-neutral-50 p-1.5">
        <button type="button" onClick={() => onChange('')} aria-pressed={value === ''} title={noIcon} aria-label={noIcon} className={cell(value === '')}>
          <ImageOff size={18} className="text-neutral-400" />
        </button>
        {icons.map((src) => (
          <button key={src} type="button" onClick={() => onChange(src)} aria-pressed={src === value} className={cell(src === value)}>
            <img src={assetUrl(src)} alt="" className="h-full w-full object-contain" loading="lazy" />
          </button>
        ))}
      </div>
      <p className="text-xs text-neutral-500">{hint ?? t.admin.menu.iconHint}</p>
    </div>
  )
}

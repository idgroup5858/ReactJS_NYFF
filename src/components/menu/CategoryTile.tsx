import FoodImage from '@/components/ui/FoodImage'
import type { Category } from '@/domain/types'
import { useLocalize } from '@/i18n'
import { useSettings } from '@/store/settingsStore'
import CategoryIcon from './CategoryIcon'

type Props = {
  category: Category
  active: boolean
  onClick: () => void
  /** kiosk — kattaroq (sensorli ekran, uzoqdan ko'rinsin) */
  size?: 'md' | 'lg'
}

/**
 * Tepadagi qatordagi kategoriya (kassa "tepada" sozlamasi, kiosk): rasm, ostida nom. Tanlangani — to'q sariq chegara
 * (qora emas) va sarg'ish fon. "Zamonaviy" mavzuda — gorizontal "chip": kulrang kvadratda 3D ikonka va nomi.
 * Uzun nom kesilmaydi — ikkinchi qatorga o'tadi. Kassadagi chap menyu — [CategorySidebar].
 */
export default function CategoryTile({ category, active, onClick, size = 'md' }: Props) {
  const localize = useLocalize()
  const { theme, iconStyle } = useSettings()
  const name = localize(category.name)
  const lg = size === 'lg'
  const state = active ? 'border-select bg-brand-50' : 'border-transparent'

  if (theme === 'modern') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`flex min-w-0 shrink-0 cursor-pointer items-center gap-2.5 rounded-card border-2 p-1.5 pr-3 text-left shadow-card transition-colors ${active ? state : `${state} bg-white hover:border-neutral-200`}`}
      >
        <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-media bg-page text-neutral-800 ${lg ? 'h-12 w-12' : 'h-10 w-10'}`}>
          <CategoryIcon category={category} box={lg ? 'h-10 w-10' : 'h-8 w-8'} line={lg ? 26 : 22} />
        </span>
        <span className={`min-w-0 flex-1 leading-tight ${lg ? 'text-base' : 'text-[13px]'} ${active ? 'font-bold text-neutral-950' : 'font-medium text-neutral-700'}`}>{name}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex shrink-0 cursor-pointer flex-col items-center gap-1.5 rounded-card border-2 bg-white p-1 pb-2 text-center shadow-card transition-colors ${lg ? 'w-36' : 'w-28'} ${active ? state : `${state} hover:border-neutral-200`}`}
    >
      {iconStyle === 'photo' ? (
        <FoodImage src={category.image} alt={name} className="aspect-square w-full rounded-media" />
      ) : (
        <span className={`flex aspect-square w-full items-center justify-center rounded-media bg-page ${active ? 'text-coal' : 'text-neutral-700'}`}>
          <CategoryIcon category={category} box={lg ? 'h-20 w-20' : 'h-14 w-14'} line={lg ? 56 : 40} />
        </span>
      )}
      <span
        className={`w-full px-1 leading-tight ${lg ? 'text-base' : 'text-[13px]'} ${active ? 'font-extrabold text-neutral-950 gomeal:font-semibold' : 'font-semibold text-neutral-700 gomeal:font-normal gomeal:text-neutral-500'}`}
      >
        {name}
      </span>
    </button>
  )
}

import FoodImage from '@/components/ui/FoodImage'
import type { Category } from '@/domain/types'
import { assetUrl } from '@/lib/assetUrl'
import { categoryIcon } from '@/lib/categoryIcons'
import { useSettings } from '@/store/settingsStore'

type Props = {
  category: Category
  /** 3D ikonka / rasm o'lchami (Tailwind klasslari) */
  box: string
}

/**
 * Kategoriya belgisi — "Ikonkalar" sozlamasiga ko'ra (mavzudan alohida): rangli 3D yoki rasm. 3D ikonkasi yo'q
 * kategoriyada — rasmi.
 */
export default function CategoryIcon({ category, box }: Props) {
  const { iconStyle } = useSettings()
  const icon = categoryIcon(category)
  if (iconStyle === '3d' && icon) return <img src={assetUrl(icon)} alt="" className={`shrink-0 object-contain ${box}`} />
  return <FoodImage src={category.image} alt="" className={`shrink-0 rounded-[6px] ${box}`} />
}

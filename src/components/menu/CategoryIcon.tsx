import { createElement } from 'react'
import FoodImage from '@/components/ui/FoodImage'
import type { Category } from '@/domain/types'
import { categoryIcon } from '@/lib/categoryIcons'
import { useSettings } from '@/store/settingsStore'
import { lineIconFor } from './foodIcons'

type Props = {
  category: Category
  /** 3D ikonka / rasm o'lchami (Tailwind klasslari) */
  box: string
  /** chiziqli ikonka o'lchami, px */
  line: number
}

/**
 * Kategoriya belgisi — "Ikonkalar" sozlamasiga ko'ra (mavzudan alohida): chiziqli (admin menyusidagi kabi, rangi
 * matnniki), rangli 3D yoki rasm. 3D ikonkasi yo'q kategoriyada — rasmi.
 */
export default function CategoryIcon({ category, box, line }: Props) {
  const { iconStyle } = useSettings()
  const icon = categoryIcon(category)
  if (iconStyle === 'line') return createElement(lineIconFor(icon), { size: line, strokeWidth: 1.75, className: 'shrink-0' })
  if (iconStyle === '3d' && icon) return <img src={icon} alt="" className={`shrink-0 object-contain ${box}`} />
  return <FoodImage src={category.image} alt="" className={`shrink-0 rounded-[6px] ${box}`} />
}

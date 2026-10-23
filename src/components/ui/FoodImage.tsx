import { UtensilsCrossed } from 'lucide-react'
import { useState } from 'react'
import { assetUrl } from '@/lib/assetUrl'

type Props = {
  src: string
  alt: string
  className?: string
}

/** Taom / kategoriya rasmi; fayl topilmasa — kulrang fonda ikonka (rasm keyin qo'shilsa o'zi chiqadi). */
export default function FoodImage({ src, alt, className = '' }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  if (failedSrc === src || !src) {
    return (
      <div className={`flex items-center justify-center bg-neutral-100 text-neutral-300 ${className}`} role="img" aria-label={alt}>
        <UtensilsCrossed size={28} />
      </div>
    )
  }
  return <img src={assetUrl(src)} alt={alt} loading="lazy" draggable={false} onError={() => setFailedSrc(src)} className={`object-cover ${className}`} />
}

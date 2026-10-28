import { UtensilsCrossed } from 'lucide-react'
import { useState } from 'react'
import { assetUrl } from '@/lib/assetUrl'
import { useSettings, type ImageFit } from '@/store/settingsStore'

type Props = {
  src: string
  alt: string
  className?: string
  /** berilmasa — qurilma sozlamasi (Ko'rinish → Taom rasmlari); bezak rasmlarida (kiosk bosh ekrani) — o'zi beriladi */
  fit?: ImageFit
}

/** Taom / kategoriya rasmi; fayl topilmasa — kulrang fonda ikonka (rasm keyin qo'shilsa o'zi chiqadi). */
export default function FoodImage({ src, alt, className = '', fit }: Props) {
  const { imageFit } = useSettings()
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  if (failedSrc === src || !src) {
    return (
      <div className={`flex items-center justify-center bg-neutral-100 text-neutral-300 ${className}`} role="img" aria-label={alt}>
        <UtensilsCrossed size={28} />
      </div>
    )
  }
  const objectFit = (fit ?? imageFit) === 'contain' ? 'object-contain' : 'object-cover'
  return <img src={assetUrl(src)} alt={alt} loading="lazy" draggable={false} onError={() => setFailedSrc(src)} className={`${objectFit} ${className}`} />
}

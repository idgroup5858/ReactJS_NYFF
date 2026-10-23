import { useDb } from '@/api'
import FoodImage from '@/components/ui/FoodImage'
import { inputClass } from '@/components/ui/styles'
import { useT } from '@/i18n'

/** Rasm tanlash: mavjud taom / kategoriya rasmlari to'ri yoki o'z manzili (URL). Backend ulanganda — fayl yuklash. */
export default function ImagePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const t = useT()
  const db = useDb()
  const images = [...new Set([...db.categories.map((c) => c.image), ...db.products.map((p) => p.image)].filter(Boolean))]

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <FoodImage src={value} alt="" className="h-16 w-16 shrink-0 rounded-card border border-neutral-200" />
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="/images/products/…" aria-label={t.common.image} className={inputClass} />
      </div>
      <div className="grid max-h-40 grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-1.5 overflow-y-auto rounded-card border border-neutral-200 bg-neutral-50 p-1.5">
        {images.map((src) => (
          <button
            key={src}
            type="button"
            onClick={() => onChange(src)}
            aria-pressed={src === value}
            className={`aspect-square cursor-pointer overflow-hidden rounded border-2 transition-colors ${src === value ? 'border-select' : 'border-transparent hover:border-neutral-300'}`}
          >
            <FoodImage src={src} alt="" className="h-full w-full" />
          </button>
        ))}
      </div>
      <p className="text-xs text-neutral-500">{t.admin.menu.imageHint}</p>
    </div>
  )
}

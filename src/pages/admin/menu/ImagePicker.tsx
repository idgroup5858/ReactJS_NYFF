import { LoaderCircle, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { api } from '@/api'
import { useCategories, useImages, useProducts } from '@/api/queries'
import FoodImage from '@/components/ui/FoodImage'
import { inputClass } from '@/components/ui/styles'
import type { ImageFolder } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { showToast } from '@/lib/swal'

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif'
/** server ham shuni tekshiradi (`invalid_image`) — katta faylni yubormasdan oldin aytamiz */
const MAX_BYTES = 5 * 1024 * 1024

type Props = {
  value: string
  onChange: (value: string) => void
  /** yuklangan rasm qaysi papkaga: taom — `products`, kategoriya — `categories` */
  folder: ImageFolder
}

/**
 * Rasm tanlash: serverdagi hamma rasm to'ri (`uploads/products` va `categories` — qo'lda tashlanganlari ham, eng
 * yangisi birinchi). "Yuklash" yoki to'rga sudrab tashlash — kompyuterdan: server saqlaydi va rasm darhol tanlanadi.
 * Yo'lni qo'lda yozish ham mumkin.
 */
export default function ImagePicker({ value, onChange, folder }: Props) {
  const t = useT()
  const { data: files = [], reload } = useImages()
  const categories = useCategories().data ?? []
  const products = useProducts().data ?? []
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  // oyna ochilganda — papkaga hozirgina tashlangan rasmlar ham ko'rinsin
  useEffect(() => {
    reload()
  }, [reload])

  // bazada ishlatilgan, lekin papkada yo'q rasm (boshqa manzil) — oxirida
  const used = [...categories.map((c) => c.image), ...products.map((p) => p.image)].filter(Boolean)
  const images = [...new Set([...files.map((file) => file.path), ...used])]
  const names = new Map(files.map((file) => [file.path, file.name]))

  const upload = async (list: FileList) => {
    const chosen = [...list].filter((file) => file.type.startsWith('image/'))
    if (chosen.length === 0) return
    if (chosen.some((file) => file.size > MAX_BYTES)) {
      showToast(t.errors.invalid_image, 'error')
      return
    }
    setUploading(true)
    try {
      let last: string | null = null
      for (const file of chosen) last = (await api.images.upload(file, folder)).path
      if (last) onChange(last)
      showToast(t.admin.menu.imageUploaded)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    } finally {
      setUploading(false)
    }
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    if (!uploading) void upload(event.dataTransfer.files)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <FoodImage src={value} alt="" className="h-16 w-16 shrink-0 rounded-card border border-neutral-200" />
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="/images/products/…" aria-label={t.common.image} className={`${inputClass} min-w-0`} />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="btn-ghost flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded px-3 text-xs font-bold disabled:cursor-wait"
        >
          {uploading ? <LoaderCircle size={15} className="animate-spin" /> : <Upload size={15} />}
          {uploading ? t.admin.menu.uploadingImage : t.admin.menu.uploadImage}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(event) => {
            if (event.target.files) void upload(event.target.files)
            event.target.value = ''
          }}
        />
      </div>
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false)
        }}
        onDrop={onDrop}
        className={`grid max-h-48 grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-1.5 overflow-y-auto rounded-card border p-1.5 transition-colors ${dragging ? 'border-select bg-brand-50' : 'border-neutral-200 bg-neutral-50'}`}
      >
        {images.map((src) => (
          <button
            key={src}
            type="button"
            onClick={() => onChange(src)}
            aria-pressed={src === value}
            title={names.get(src) ?? src}
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

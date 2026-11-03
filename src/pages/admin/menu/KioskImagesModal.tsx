import { useState, type FormEvent } from 'react'
import { api } from '@/api'
import { useKioskImages } from '@/api/queries'
import FoodImage from '@/components/ui/FoodImage'
import FormFooter from '@/components/ui/FormFooter'
import Modal from '@/components/ui/Modal'
import { errorMessage, useT } from '@/i18n'
import { showToast } from '@/lib/swal'
import ImagePicker from './ImagePicker'

/**
 * Admin: kiosk bosh ekranidagi 3 ta doira rasmi (o'rtadagi katta, tepadagi va pastdagi kichik) — joy tanlanadi, keyin
 * pastdagi to'rdan rasm bosiladi (yangi rasm — "Yuklash" bilan). Saqlangach kiosk keyingi ochilishda yangisini ko'rsatadi.
 */
export default function KioskImagesModal({ onClose }: { onClose: () => void }) {
  const t = useT()
  const current = useKioskImages().data
  const [draft, setDraft] = useState<string[] | null>(null)
  const images = draft ?? current ?? ['', '', '']
  const [slot, setSlot] = useState(0)
  const [saving, setSaving] = useState(false)

  const save = async (event: FormEvent) => {
    event.preventDefault()
    // yuklanmasdan saqlansa — bo'sh doiralar yozilib qolmasin
    if (saving || (!draft && !current)) return
    setSaving(true)
    try {
      await api.images.saveKiosk(images)
      showToast(t.common.saved)
      onClose()
    } catch (error) {
      showToast(errorMessage(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={t.admin.menu.kioskImages} onClose={onClose} size="lg" footer={<FormFooter formId="kiosk-images-form" saving={saving} />}>
      <form id="kiosk-images-form" onSubmit={(event) => void save(event)} className="space-y-4">
        <p className="text-sm text-neutral-500">{t.admin.menu.kioskImagesHint}</p>
        {/* kiosk ekranidagidek: oq doira, sariq halqa */}
        <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label={t.admin.menu.kioskImages}>
          {t.admin.menu.kioskSlots.map((label, index) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={slot === index}
              onClick={() => setSlot(index)}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 p-3 transition-colors ${slot === index ? 'border-select bg-brand-50' : 'border-neutral-200 hover:border-neutral-300'}`}
            >
              <FoodImage src={images[index] ?? ''} alt="" fit="contain" className="h-24 w-24 rounded-full bg-white p-1.5 ring-4 ring-taxi" />
              <span className="text-xs font-bold">{label}</span>
            </button>
          ))}
        </div>
        <ImagePicker value={images[slot] ?? ''} onChange={(src) => setDraft(images.map((old, index) => (index === slot ? src : old)))} folder="products" />
      </form>
    </Modal>
  )
}

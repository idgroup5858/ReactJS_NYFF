import { useState, type FormEvent } from 'react'
import { api } from '@/api'
import Field from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import { inputClass } from '@/components/ui/styles'
import Toggle from '@/components/ui/Toggle'
import type { Category, LocalizedText } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { showToast } from '@/lib/swal'
import IconPicker from './IconPicker'
import ImagePicker from './ImagePicker'

/** Kategoriya qo'shish / tahrirlash: nomi 3 tilda, rasmi, ikonkasi, faolligi (faol emas — kassa va kioskda ko'rinmaydi). */
export default function CategoryForm({ category, onClose }: { category: Category | null; onClose: () => void }) {
  const t = useT()
  const [name, setName] = useState<LocalizedText>(category?.name ?? { uz: '', ru: '', en: '' })
  const [image, setImage] = useState(category?.image ?? '')
  // server ikonkani doim satr qilib beradi: '' — ikonkasiz
  const [icon, setIcon] = useState(category?.icon ?? '')
  const [active, setActive] = useState(category?.active ?? true)
  const [saving, setSaving] = useState(false)

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      await api.menu.saveCategory({ id: category?.id, name, image, icon, active })
      showToast(t.common.saved)
      onClose()
    } catch (error) {
      showToast(errorMessage(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={category ? t.admin.menu.editCategory : t.admin.menu.addCategory}
      onClose={onClose}
      size="lg"
      footer={
        <button type="submit" form="category-form" disabled={saving} className="btn-primary h-11 w-full rounded text-sm font-bold">
          {t.common.save}
        </button>
      }
    >
      {/* ikki ustun — kichik monitorda ham balandligi sig'sin; ikonkalar to'ri pastda butun kenglikda (qatorlar kam) */}
      <form id="category-form" onSubmit={(event) => void save(event)} className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
        <div className="space-y-3">
          {(['uz', 'ru', 'en'] as const).map((lang) => (
            <Field key={lang} label={lang === 'uz' ? t.common.nameUz : lang === 'ru' ? t.common.nameRu : t.common.nameEn} htmlFor={`cat-${lang}`}>
              <input id={`cat-${lang}`} autoFocus={lang === 'uz'} value={name[lang]} onChange={(event) => setName({ ...name, [lang]: event.target.value })} className={inputClass} />
            </Field>
          ))}
          <Toggle checked={active} onChange={setActive} label={t.common.active} />
        </div>
        <Field label={t.common.image}>
          <ImagePicker value={image} onChange={setImage} folder="categories" />
        </Field>
        <div className="sm:col-span-2">
          <Field label={t.admin.menu.icon}>
            <IconPicker value={icon} onChange={setIcon} />
          </Field>
        </div>
      </form>
    </Modal>
  )
}

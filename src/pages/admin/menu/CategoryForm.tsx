import { useState, type FormEvent } from 'react'
import { api } from '@/api'
import Field from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import { inputClass } from '@/components/ui/styles'
import Toggle from '@/components/ui/Toggle'
import type { Category, LocalizedText } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { categoryIcon } from '@/lib/categoryIcons'
import { showToast } from '@/lib/swal'
import IconPicker from './IconPicker'
import ImagePicker from './ImagePicker'

/** Kategoriya qo'shish / tahrirlash: nomi 3 tilda, rasmi, ikonkasi, faolligi (faol emas — kassa va kioskda ko'rinmaydi). */
export default function CategoryForm({ category, onClose }: { category: Category | null; onClose: () => void }) {
  const t = useT()
  const [name, setName] = useState<LocalizedText>(category?.name ?? { uz: '', ru: '', en: '' })
  const [image, setImage] = useState(category?.image ?? '')
  const [icon, setIcon] = useState((category && categoryIcon(category)) ?? '')
  const [active, setActive] = useState(category?.active ?? true)

  const save = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await api.menu.saveCategory({ id: category?.id, name, image, icon, active })
      showToast(t.common.saved)
      onClose()
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  return (
    <Modal
      title={category ? t.admin.menu.editCategory : t.admin.menu.addCategory}
      onClose={onClose}
      footer={
        <button type="submit" form="category-form" className="btn-primary h-11 w-full rounded text-sm font-bold">
          {t.common.save}
        </button>
      }
    >
      <form id="category-form" onSubmit={(event) => void save(event)} className="space-y-3">
        {(['uz', 'ru', 'en'] as const).map((lang) => (
          <Field key={lang} label={lang === 'uz' ? t.common.nameUz : lang === 'ru' ? t.common.nameRu : t.common.nameEn} htmlFor={`cat-${lang}`}>
            <input id={`cat-${lang}`} autoFocus={lang === 'uz'} value={name[lang]} onChange={(event) => setName({ ...name, [lang]: event.target.value })} className={inputClass} />
          </Field>
        ))}
        <Field label={t.common.image}>
          <ImagePicker value={image} onChange={setImage} />
        </Field>
        <Field label={t.admin.menu.icon}>
          <IconPicker value={icon} onChange={setIcon} />
        </Field>
        <Toggle checked={active} onChange={setActive} label={t.common.active} />
      </form>
    </Modal>
  )
}

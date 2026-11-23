import { ChevronDown, ChevronUp, PackageSearch, Pencil, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api } from '@/api'
import { useIngredientGroups, useIngredients } from '@/api/queries'
import EmptyState from '@/components/ui/EmptyState'
import Field from '@/components/ui/Field'
import FormFooter from '@/components/ui/FormFooter'
import Modal from '@/components/ui/Modal'
import { inputClass } from '@/components/ui/styles'
import Toggle from '@/components/ui/Toggle'
import { OTHER_GROUP, type IngredientGroup, type LocalizedText } from '@/domain/types'
import { errorMessage, useLocalize, useT } from '@/i18n'
import { assetUrl } from '@/lib/assetUrl'
import { GROUP_ICONS } from '@/lib/groupIcons'
import { confirmDialog, showToast } from '@/lib/swal'
import IconPicker from '@/pages/admin/menu/IconPicker'
import { sortGroups } from './groupSections'

const iconButton = 'btn-icon flex h-8 w-8 shrink-0 items-center justify-center rounded'

/**
 * Guruh qo'shish / tahrirlash: nomi 3 tilda, kioskdagi taom tarkibida ko'rinishi, ikonkasi. O'chirishda ichidagi
 * mahsulotlar "Boshqa" ga o'tadi — bu tasdiqlash oynasining o'zida aytiladi (foydalanuvchi so'radi); "Boshqa" ning o'zi
 * o'chirilmaydi (o'chirish tugmasi yo'q, o'rniga izoh). [count] — guruhdagi mahsulotlar (faol bo'lmaganlari ham).
 */
function GroupForm({ group, count, other, onClose }: { group: IngredientGroup | null; count: number; other: IngredientGroup | undefined; onClose: () => void }) {
  const t = useT()
  const localize = useLocalize()
  const [name, setName] = useState<LocalizedText>(group?.name ?? { uz: '', ru: '', en: '' })
  const [icon, setIcon] = useState(group?.icon ?? '')
  const [inComposition, setInComposition] = useState(group?.inComposition ?? true)
  const [saving, setSaving] = useState(false)
  const isOther = group?.id === OTHER_GROUP

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      await api.ingredientGroups.save({ id: group?.id, name, icon, inComposition })
      showToast(t.common.saved)
      onClose()
    } catch (error) {
      showToast(errorMessage(error), 'error')
      setSaving(false)
    }
  }

  /** "Non" (12 ta) → "Boshqa"; "Boshqa" tarkibda ko'rinmasa, tarkibda ko'rinadigan guruhdan o'tganlar u yerdan yo'qoladi */
  const remove = async (current: IngredientGroup) => {
    const otherName = other ? localize(other.name) : ''
    const text =
      count === 0
        ? t.groups.deleteEmpty
        : [t.groups.deleteMoves(count, otherName), current.inComposition && other && !other.inComposition ? t.groups.deleteHidden(otherName) : '']
            .filter(Boolean)
            .join(' ')
    if (!(await confirmDialog(t.groups.deleteTitle(localize(current.name)), text, t.common.delete))) return
    setSaving(true)
    try {
      await api.ingredientGroups.remove(current.id)
      showToast(t.groups.deleted)
      onClose()
    } catch (error) {
      showToast(errorMessage(error), 'error')
      setSaving(false)
    }
  }

  return (
    <Modal
      title={group ? t.groups.edit : t.groups.add}
      onClose={onClose}
      size="lg"
      footer={<FormFooter formId="group-form" saving={saving} onDelete={group && !isOther ? () => void remove(group) : undefined} />}
    >
      {/* eniga keng, past (POS monitori): 3 tildagi nom bir qatorda, ostida tarkib belgisi, keyin ikonkalar */}
      <form id="group-form" onSubmit={(event) => void save(event)} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          {(['uz', 'ru', 'en'] as const).map((lang) => (
            <Field key={lang} label={lang === 'uz' ? t.common.nameUz : lang === 'ru' ? t.common.nameRu : t.common.nameEn} htmlFor={`grp-${lang}`}>
              <input id={`grp-${lang}`} autoFocus={lang === 'uz'} value={name[lang]} onChange={(event) => setName({ ...name, [lang]: event.target.value })} className={inputClass} />
            </Field>
          ))}
        </div>
        <div>
          <Toggle checked={inComposition} onChange={setInComposition} label={t.groups.inComposition} />
          <p className="mt-0.5 pl-10 text-xs text-neutral-500">{t.groups.inCompositionHint}</p>
        </div>
        <Field label={t.admin.menu.icon}>
          <IconPicker value={icon} onChange={setIcon} icons={GROUP_ICONS} noIconLabel={t.groups.noIcon} hint={t.groups.iconHint} />
        </Field>
        {group && isOther && <p className="text-xs text-neutral-500">{t.groups.otherFixed(localize(group.name))}</p>}
      </form>
    </Modal>
  )
}

/**
 * Ombor guruhlari (faqat admin — Mahsulotlar → «Guruhlar»): ikonka, nom, mahsulotlar soni, tartib (↑ / ↓ — omborda
 * shu tartibda chiqadi), tahrirlash, «Yangi guruh». Forma shu oyna o'rnida ochiladi va yopilganda ro'yxatga qaytadi
 * (ikki oyna ustma-ust bo'lsa, Esc ikkalasini yopardi).
 */
export default function IngredientGroupsModal({ onClose }: { onClose: () => void }) {
  const t = useT()
  const localize = useLocalize()
  const groupsQuery = useIngredientGroups()
  const groups = sortGroups(groupsQuery.data ?? [])
  const ingredients = useIngredients().data ?? []
  const [editing, setEditing] = useState<IngredientGroup | 'new' | null>(null)
  const countOf = (id: string) => ingredients.filter((ingredient) => ingredient.group === id).length

  if (editing) {
    const group = editing === 'new' ? null : editing
    return (
      <GroupForm
        group={group}
        count={group ? countOf(group.id) : 0}
        other={groups.find((g) => g.id === OTHER_GROUP)}
        onClose={() => setEditing(null)}
      />
    )
  }

  const move = async (id: string, direction: -1 | 1) => {
    try {
      await api.ingredientGroups.move(id, direction)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  return (
    <Modal
      title={t.groups.title}
      onClose={onClose}
      size="lg"
      footer={
        <button type="button" onClick={() => setEditing('new')} className="btn-primary flex h-9 flex-1 items-center justify-center gap-2 rounded text-sm font-bold">
          <Plus size={16} />
          {t.groups.add}
        </button>
      }
    >
      <p className="mb-2.5 text-xs text-neutral-500">{t.groups.hint}</p>
      {!groupsQuery.data && groupsQuery.error ? (
        <EmptyState icon={PackageSearch} title={errorMessage(groupsQuery.error)} />
      ) : (
        // ikki ustun — oyna past bo'lsin; tartib ustun bo'ylab yuqoridan pastga (keyin o'ng ustun)
        <ol className="gap-x-3 sm:columns-2">
          {groups.map((group, index) => (
            <li key={group.id} className="mb-1.5 flex break-inside-avoid items-center gap-2 rounded-card border border-neutral-200 p-1.5">
              {group.icon ? (
                <img src={assetUrl(group.icon)} alt="" className="h-8 w-8 shrink-0 object-contain" loading="lazy" />
              ) : (
                <span className="h-8 w-8 shrink-0 rounded bg-neutral-100" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm leading-tight font-bold text-neutral-950">{localize(group.name)}</span>
                <span className="block truncate text-xs text-neutral-500">
                  {t.groups.items(countOf(group.id))}
                  {!group.inComposition && ` · ${t.groups.hiddenBadge}`}
                </span>
              </span>
              <button type="button" disabled={index === 0} onClick={() => void move(group.id, -1)} aria-label={t.common.up} title={t.common.up} className={iconButton}>
                <ChevronUp size={14} />
              </button>
              <button type="button" disabled={index === groups.length - 1} onClick={() => void move(group.id, 1)} aria-label={t.common.down} title={t.common.down} className={iconButton}>
                <ChevronDown size={14} />
              </button>
              <button type="button" onClick={() => setEditing(group)} aria-label={t.common.edit} title={t.common.edit} className={iconButton}>
                <Pencil size={14} />
              </button>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  )
}

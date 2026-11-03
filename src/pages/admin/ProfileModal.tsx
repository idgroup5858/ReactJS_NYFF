import { useState, type FormEvent } from 'react'
import { changePassword, updateProfile, useCurrentUser } from '@/api/session'
import { SectionTitle } from '@/components/ui/Card'
import Field from '@/components/ui/Field'
import Modal from '@/components/ui/Modal'
import { inputClass } from '@/components/ui/styles'
import { isValidEmail, isValidPassword } from '@/domain/rules'
import { errorMessage, useT } from '@/i18n'
import { showToast } from '@/lib/swal'

/**
 * Admin "Profil": ism, familiya, email va parol (joriysi bilan). Yangi bazadagi `admin@gmail.com` / `123456789` shu
 * yerda almashtiriladi. Unutilgan parol — Telegram botda `/parol` yoki boshqa admin "Xodimlar" da.
 */
export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const t = useT()
  const user = useCurrentUser()
  const [name, setName] = useState(user?.name ?? '')
  const [surname, setSurname] = useState(user?.surname ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState<'profile' | 'password' | null>(null)

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    if (!surname.trim()) return showToast(t.errors.surname_required, 'error')
    if (!isValidEmail(email)) return showToast(t.errors.invalid_email, 'error')
    setSaving('profile')
    try {
      await updateProfile({ name, surname, email })
      showToast(t.admin.profile.saved)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    } finally {
      setSaving(null)
    }
  }

  const savePassword = async (event: FormEvent) => {
    event.preventDefault()
    if (saving || !oldPassword) return
    if (!isValidPassword(newPassword)) return showToast(t.errors.invalid_password, 'error')
    setSaving('password')
    try {
      await changePassword(oldPassword, newPassword)
      setOldPassword('')
      setNewPassword('')
      showToast(t.admin.profile.passwordChanged)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    } finally {
      setSaving(null)
    }
  }

  return (
    <Modal title={t.admin.profile.title} onClose={onClose}>
      <div className="space-y-6">
        <form onSubmit={(event) => void saveProfile(event)} className="space-y-3">
          <SectionTitle>{t.admin.profile.personal}</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t.admin.staff.name} htmlFor="pr-name">
              <input id="pr-name" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
            </Field>
            <Field label={t.admin.staff.surname} htmlFor="pr-surname">
              <input id="pr-surname" value={surname} onChange={(event) => setSurname(event.target.value)} className={inputClass} />
            </Field>
          </div>
          <Field label={t.admin.staff.email} htmlFor="pr-email">
            <input
              id="pr-email"
              type="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(event) => setEmail(event.target.value.replace(/\s/g, '').slice(0, 100))}
              className={inputClass}
            />
          </Field>
          <button type="submit" disabled={saving !== null} className="btn-primary h-11 w-full rounded text-sm font-bold">
            {t.common.save}
          </button>
        </form>

        <form onSubmit={(event) => void savePassword(event)} className="space-y-3 border-t border-neutral-200 pt-5">
          <SectionTitle>{t.admin.profile.password}</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t.admin.profile.currentPassword} htmlFor="pr-old">
              <input
                id="pr-old"
                type="password"
                autoComplete="current-password"
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value.slice(0, 64))}
                className={inputClass}
              />
            </Field>
            <Field label={t.admin.profile.newPassword} htmlFor="pr-new" hint={t.admin.profile.passwordHint}>
              <input
                id="pr-new"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value.slice(0, 64))}
                className={inputClass}
              />
            </Field>
          </div>
          <button type="submit" disabled={saving !== null || !oldPassword || !newPassword} className="btn-ghost h-11 w-full rounded text-sm font-bold">
            {t.admin.profile.changePassword}
          </button>
          <p className="text-xs text-neutral-500">{t.admin.profile.forgot}</p>
        </form>
      </div>
    </Modal>
  )
}

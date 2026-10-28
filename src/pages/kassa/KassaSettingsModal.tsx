import { PanelLeft, PanelTop } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api } from '@/api'
import Modal from '@/components/ui/Modal'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { isValidPin } from '@/domain/rules'
import { errorMessage, useT } from '@/i18n'
import { showToast } from '@/lib/swal'
import {
  ICON_STYLES,
  IMAGE_FITS,
  setCategoryPosition,
  setIconStyle,
  setImageFit,
  setTheme,
  THEMES,
  useSettings,
  type CategoryPosition,
  type IconStyle,
  type ImageFit,
  type Theme,
} from '@/store/settingsStore'

function PinField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-neutral-600">
        {label}
      </label>
      <input
        id={id}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 8))}
        className="h-10 w-full rounded border border-neutral-300 bg-white px-3 text-lg tracking-[0.3em]"
      />
    </div>
  )
}

/** Kassa sozlamalari: kategoriyalar joyi va ko'rinish (shu qurilma uchun), kassirning o'z PIN'ini almashtirish. */
export default function KassaSettingsModal({ onClose }: { onClose: () => void }) {
  const t = useT()
  const { categoryPosition, theme, iconStyle, imageFit } = useSettings()
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState<string | null>(null)

  const savePin = async (event: FormEvent) => {
    event.preventDefault()
    if (!isValidPin(newPin)) return setError(t.errors.invalid_pin)
    if (newPin !== repeat) return setError(t.kassaSettings.mismatch)
    try {
      await api.users.changeOwnPin(oldPin, newPin)
      setOldPin('')
      setNewPin('')
      setRepeat('')
      setError(null)
      showToast(t.kassaSettings.pinChanged)
    } catch (caught) {
      setError(errorMessage(caught))
    }
  }

  return (
    <Modal title={t.kassaSettings.title} onClose={onClose}>
      <div className="space-y-6">
        <section className="space-y-2">
          <h3 className="text-[11px] font-bold tracking-[0.14em] text-neutral-500 uppercase">{t.kassaSettings.categories}</h3>
          <SegmentedControl<CategoryPosition>
            label={t.kassaSettings.categories}
            value={categoryPosition}
            onChange={setCategoryPosition}
            options={[
              { value: 'left', label: <><PanelLeft size={14} /> {t.kassaSettings.left}</> },
              { value: 'top', label: <><PanelTop size={14} /> {t.kassaSettings.top}</> },
            ]}
          />
        </section>

        <section className="space-y-2">
          <h3 className="text-[11px] font-bold tracking-[0.14em] text-neutral-500 uppercase">{t.theme.title}</h3>
          <SegmentedControl<Theme>
            label={t.theme.title}
            value={theme}
            onChange={setTheme}
            options={THEMES.map((value) => ({ value, label: t.theme[value] }))}
          />
        </section>

        <section className="space-y-2">
          <h3 className="text-[11px] font-bold tracking-[0.14em] text-neutral-500 uppercase">{t.theme.icons}</h3>
          <SegmentedControl<IconStyle>
            label={t.theme.icons}
            value={iconStyle}
            onChange={setIconStyle}
            options={ICON_STYLES.map((value) => ({ value, label: t.theme.iconStyles[value] }))}
          />
        </section>

        <section className="space-y-2">
          <h3 className="text-[11px] font-bold tracking-[0.14em] text-neutral-500 uppercase">{t.theme.imageFit}</h3>
          <SegmentedControl<ImageFit>
            label={t.theme.imageFit}
            value={imageFit}
            onChange={setImageFit}
            options={IMAGE_FITS.map((value) => ({ value, label: t.theme.imageFits[value] }))}
          />
        </section>

        <form onSubmit={(event) => void savePin(event)} className="space-y-3 border-t border-neutral-200 pt-5">
          <h3 className="text-[11px] font-bold tracking-[0.14em] text-neutral-500 uppercase">{t.kassaSettings.pinTitle}</h3>
          <PinField id="old-pin" label={t.kassaSettings.oldPin} value={oldPin} onChange={setOldPin} />
          <div className="grid gap-3 sm:grid-cols-2">
            <PinField id="new-pin" label={t.kassaSettings.newPin} value={newPin} onChange={setNewPin} />
            <PinField id="repeat-pin" label={t.kassaSettings.confirmPin} value={repeat} onChange={setRepeat} />
          </div>
          <p className={`text-xs ${error ? 'font-semibold text-red-700' : 'text-neutral-400'}`}>{error ?? t.login.pinHint}</p>
          <button
            type="submit"
            disabled={oldPin.length < 4 || newPin.length < 4 || repeat.length < 4}
            className="btn-dark h-10 w-full rounded text-xs font-bold tracking-[0.12em] uppercase"
          >
            {t.kassaSettings.savePin}
          </button>
        </form>
      </div>
    </Modal>
  )
}

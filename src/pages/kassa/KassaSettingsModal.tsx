import { PanelLeft, PanelTop, Play, Volume2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { api } from '@/api'
import Modal from '@/components/ui/Modal'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { inputClass } from '@/components/ui/styles'
import Toggle from '@/components/ui/Toggle'
import { isValidPin } from '@/domain/rules'
import { errorMessage, useT } from '@/i18n'
import { playAlert, type AlertSound } from '@/lib/alertSound'
import { showToast } from '@/lib/swal'
import {
  ICON_STYLES,
  IMAGE_FITS,
  MIN_ALERT_VOLUME,
  setAlertVolume,
  setCategoryPosition,
  setIconStyle,
  setImageFit,
  setOfflineEnabled,
  setOfflineUrl,
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

/**
 * Kassa sozlamalari: kategoriyalar joyi va ko'rinish, yangi buyurtma ovozi balandligi va offline kassa (shu qurilma
 * uchun), kassirning o'z PIN'ini almashtirish.
 */
export default function KassaSettingsModal({ onClose }: { onClose: () => void }) {
  const t = useT()
  const { categoryPosition, theme, iconStyle, imageFit, offlineEnabled, offlineUrl, alertVolume } = useSettings()
  const volumePercent = Math.round(alertVolume * 100)
  const testSounds: { kind: AlertSound; label: string }[] = [
    { kind: 'online', label: t.kassaSettings.testOnline },
    { kind: 'kiosk', label: t.kassaSettings.testKiosk },
  ]
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

  // POS monitorlari past — oyna bo'yiga emas, eniga: chapda ko'rinish, o'ngda offline kassa va PIN
  return (
    <Modal title={t.kassaSettings.title} onClose={onClose} size="lg">
      <div className="grid gap-6 md:grid-cols-2">
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
        </div>

        <div className="space-y-6 border-t border-neutral-200 pt-5 md:border-t-0 md:border-l md:pt-0 md:pl-6">
          <section className="space-y-2">
            <h3 className="text-[11px] font-bold tracking-[0.14em] text-neutral-500 uppercase">{t.kassaSettings.soundTitle}</h3>
            <div className="flex items-center gap-3">
              <Volume2 size={16} className="shrink-0 text-neutral-500" />
              <input
                type="range"
                min={MIN_ALERT_VOLUME * 100}
                max={100}
                step={10}
                value={volumePercent}
                onChange={(event) => setAlertVolume(Number(event.target.value) / 100)}
                aria-label={t.kassaSettings.volume}
                className="h-2 min-w-0 flex-1 cursor-pointer"
              />
              <span className="w-10 shrink-0 text-right text-sm font-semibold text-neutral-700 tabular-nums">{volumePercent}%</span>
            </div>
            <div className="flex gap-2">
              {testSounds.map(({ kind, label }) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => playAlert(kind, alertVolume)}
                  title={t.kassaSettings.testSound}
                  className="btn-ghost inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded text-xs font-bold"
                >
                  <Play size={13} /> {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-400">{t.kassaSettings.soundHint}</p>
          </section>

          <section className="space-y-2 border-t border-neutral-200 pt-5">
            <h3 className="text-[11px] font-bold tracking-[0.14em] text-neutral-500 uppercase">{t.offline.settingsTitle}</h3>
            <Toggle checked={offlineEnabled} onChange={setOfflineEnabled} label={t.offline.settingsEnable} />
            {offlineEnabled && (
              <div>
                <label htmlFor="offline-url" className="mb-1 block text-xs font-semibold text-neutral-600">
                  {t.offline.settingsUrl}
                </label>
                <input
                  id="offline-url"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  defaultValue={offlineUrl}
                  onBlur={(event) => setOfflineUrl(event.target.value)}
                  className={inputClass}
                />
              </div>
            )}
            <p className="text-xs text-neutral-400">{t.offline.settingsHint}</p>
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
      </div>
    </Modal>
  )
}

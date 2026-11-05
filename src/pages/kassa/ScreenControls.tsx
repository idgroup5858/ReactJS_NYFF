import { Maximize, Minimize, Minus, Plus } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { HeaderAction } from '@/components/layout/StaffLayout'
import { useT } from '@/i18n'
import { MENU_SCALES, setMenuScale, useSettings } from '@/store/settingsStore'

const subscribeFullscreen = (onChange: () => void) => {
  document.addEventListener('fullscreenchange', onChange)
  return () => document.removeEventListener('fullscreenchange', onChange)
}
const isFullscreen = () => document.fullscreenElement !== null

/**
 * Sahifa to'liq ekranda (Fullscreen API). Esc yoki brauzer o'zi chiqarsa ham kuzatiladi. F11 dagi brauzer to'liq ekrani
 * bu yerda ko'rinmaydi (sahifa uni bilmaydi) — tugma "to'liq ekran" holatida qoladi, bosilsa baribir to'liq ekranga o'tadi.
 */
function useFullscreen(): boolean {
  return useSyncExternalStore(subscribeFullscreen, isFullscreen)
}

const STEP_BUTTON =
  'flex h-full w-8 cursor-pointer items-center justify-center transition-colors enabled:hover:text-taxi disabled:cursor-default disabled:opacity-30'

/**
 * Kassa header'i (online va offline): to'liq ekran va taom kartochkalari o'lchami "− 80% +" — POS monitori kichik
 * bo'lsa kichraytiriladi, 100% dan katta qilinmaydi. O'lcham shu kompyuterda saqlanadi.
 */
export default function ScreenControls() {
  const t = useT()
  const fullscreen = useFullscreen()
  const { menuScale } = useSettings()
  const index = MENU_SCALES.indexOf(menuScale)
  const smaller = MENU_SCALES[index - 1]
  const larger = MENU_SCALES[index + 1]

  const toggleFullscreen = () => {
    const request = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()
    // brauzer ruxsat bermasa — hech narsa bo'lmaydi
    request.catch(() => undefined)
  }

  return (
    <>
      {document.fullscreenEnabled && (
        <HeaderAction
          label={fullscreen ? t.kassaSettings.exitFullscreen : t.kassaSettings.fullscreen}
          icon={fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          onClick={toggleFullscreen}
        />
      )}
      <div className="flex h-9 shrink-0 items-center rounded border border-coal-line bg-coal-soft text-white/80">
        <button
          type="button"
          onClick={() => smaller !== undefined && setMenuScale(smaller)}
          disabled={smaller === undefined}
          title={t.kassaSettings.menuSmaller}
          aria-label={t.kassaSettings.menuSmaller}
          className={STEP_BUTTON}
        >
          <Minus size={16} />
        </button>
        <span className="w-9 text-center text-xs font-semibold tabular-nums">{Math.round(menuScale * 100)}%</span>
        <button
          type="button"
          onClick={() => larger !== undefined && setMenuScale(larger)}
          disabled={larger === undefined}
          title={t.kassaSettings.menuLarger}
          aria-label={t.kassaSettings.menuLarger}
          className={STEP_BUTTON}
        >
          <Plus size={16} />
        </button>
      </div>
    </>
  )
}

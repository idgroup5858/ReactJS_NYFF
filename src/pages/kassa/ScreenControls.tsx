import { Maximize, Minimize, Minus, Plus } from 'lucide-react'
import { HeaderAction } from '@/components/layout/StaffLayout'
import { useT } from '@/i18n'
import { toggleFullscreen, useFullscreen } from '@/lib/fullscreen'
import { MENU_SCALES, setMenuScale, useSettings } from '@/store/settingsStore'

const STEP_BUTTON =
  'flex h-full w-8 cursor-pointer items-center justify-center transition-colors enabled:hover:text-taxi disabled:cursor-default disabled:opacity-30'

/**
 * Kassa header'i (online va offline): to'liq ekran va taom kartochkalari o'lchami "− 80% +" — POS monitori kichik
 * bo'lsa kichraytiriladi, 100% dan katta qilinmaydi. O'lcham shu kompyuterda saqlanadi. Kassir PIN bilan kirganda kassa
 * o'zi to'liq ekranda ochiladi (`enterFullscreen` — kirish oynalarida); F11 dagi to'liq ekranda tugma "to'liq ekran"
 * holatida qoladi.
 */
export default function ScreenControls() {
  const t = useT()
  const fullscreen = useFullscreen()
  const { menuScale } = useSettings()
  const index = MENU_SCALES.indexOf(menuScale)
  const smaller = MENU_SCALES[index - 1]
  const larger = MENU_SCALES[index + 1]

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

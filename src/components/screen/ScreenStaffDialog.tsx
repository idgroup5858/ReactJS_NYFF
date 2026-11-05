import { ArrowLeftRight, LogOut, Maximize } from 'lucide-react'
import { useNavigate } from 'react-router'
import Modal from '@/components/ui/Modal'
import PinPad from '@/components/ui/PinPad'
import { pinFailure, useT } from '@/i18n'
import { enterFullscreen, exitFullscreen } from '@/lib/fullscreen'

type Props = {
  /** ekran kodi serverda tekshiriladi (TV — navbat so'rovi, kiosk — `check`); xato — `ApiError` */
  verify: (code: string) => Promise<unknown>
  /** "Filialni almashtirish" — kirish ekranidagi shu ekran turining filial qadami */
  changeBranchPath: string
  /** kod shu sahifada allaqachon kiritilgan — darhol amallar */
  unlocked: boolean
  onUnlock: () => void
  onRelock: () => void
  onClose: () => void
}

/**
 * TV / kiosk xodim oynasi (logotip 10 soniya bosib turilganda — `useScreenStaff`): ekran kodi raqam tugmalari bilan
 * (klaviaturasiz sensorli ekran); to'g'ri bo'lsa — to'liq ekrandan chiqadi va amallar: "To'liq ekranga qaytish",
 * "Filialni almashtirish", "Ish joyini almashtirish".
 */
export default function ScreenStaffDialog({ verify, changeBranchPath, unlocked, onUnlock, onRelock, onClose }: Props) {
  const t = useT()
  const navigate = useNavigate()

  const submit = async (code: string) => {
    try {
      await verify(code)
    } catch (error) {
      return pinFailure(error)
    }
    exitFullscreen()
    onUnlock()
    return null
  }

  const action = 'flex h-14 w-full items-center justify-center gap-2 rounded text-sm font-bold'
  return (
    <Modal title={t.screenStaff.title} onClose={onClose} size="sm">
      {unlocked ? (
        <div className="space-y-2 py-1">
          <p className="pb-1 text-sm text-neutral-600">{t.screenStaff.unlocked}</p>
          <button
            type="button"
            onClick={() => {
              enterFullscreen()
              onRelock()
              onClose()
            }}
            className={`btn-primary ${action}`}
          >
            <Maximize size={18} />
            {t.screenStaff.backToFullscreen}
          </button>
          <button type="button" onClick={() => void navigate(changeBranchPath)} className={`btn-ghost ${action}`}>
            <ArrowLeftRight size={18} />
            {t.login.changeBranch}
          </button>
          <button type="button" onClick={() => void navigate('/')} className={`btn-ghost ${action}`}>
            <LogOut size={18} />
            {t.screenStaff.switchMode}
          </button>
        </div>
      ) : (
        <PinPad hint={t.screenStaff.codeHint} submitLabel={t.screenStaff.submit} onSubmit={submit} />
      )}
    </Modal>
  )
}

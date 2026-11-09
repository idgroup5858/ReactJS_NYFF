import { Lock, UserRoundCog } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { api } from '@/api'
import { ApiError } from '@/api/http'
import { logout, unlockSession } from '@/api/session'
import Brand from '@/components/layout/Brand'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import FaceIdRequestPanel from '@/components/ui/FaceIdRequestPanel'
import PinPad from '@/components/ui/PinPad'
import UserAvatar from '@/components/ui/UserAvatar'
import { fullName } from '@/domain/rules'
import type { AuthUser } from '@/domain/types'
import { pinFailure, useT, type PinFailure } from '@/i18n'

/**
 * Kassir "Bloklash"ni bosganda kassa ustini to'liq yopadi. Faqat shu kassirning PIN'i bilan ochiladi (server
 * tekshiradi, token yangilanadi); boshqa xodim kirmoqchi bo'lsa — chiqish (smena yopilmaydi). FaceID filialida —
 * kassir shu filialda bo'lishi kerak (oxirgi o'tishi — shu yerda «Kirish»); terminal ishlamasa — admindan ruxsat.
 */
export default function LockScreen({ user }: { user: AuthUser }) {
  const t = useT()
  const navigate = useNavigate()
  const [faceIdPin, setFaceIdPin] = useState<string | null>(null)

  // xato matni PIN pad ostida chiqadi (kirish ekranidagi kabi)
  const unlock = async (pin: string): Promise<PinFailure | null> => {
    try {
      await unlockSession(pin)
      return null
    } catch (error) {
      setFaceIdPin(error instanceof ApiError && error.code === 'faceid_checkin_required' ? pin : null)
      return pinFailure(error)
    }
  }

  const switchUser = () => {
    logout()
    void navigate('/', { replace: true })
  }

  const branchId = user.branchId

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-coal">
      <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <Brand size="lg" />
        <LanguageSwitcher tone="dark" />
      </header>
      {/* ixcham — POS monitorda (768 px) PIN pad va "Ochish" tugmasi bitta ekranga sig'sin */}
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 pb-4">
        <div className="page-enter w-full max-w-sm overflow-hidden rounded-card bg-white shadow-2xl">
          <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded bg-coal text-taxi">
              <Lock size={18} />
            </span>
            <div>
              <h1 className="text-[13px] font-bold tracking-[0.14em] text-neutral-950 uppercase">{t.lock.title}</h1>
              <p className="text-xs text-neutral-500">{t.lock.hint}</p>
            </div>
          </div>
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-3">
              <UserAvatar name={fullName(user)} />
              <div>
                <p className="text-lg font-bold text-neutral-950">{fullName(user)}</p>
                <p className="text-xs text-neutral-500">{t.roles[user.role]}</p>
              </div>
            </div>
            <PinPad onSubmit={unlock} submitLabel={t.lock.unlock} />
            {faceIdPin && branchId && (
              <FaceIdRequestPanel
                key={faceIdPin}
                request={() => api.faceId.requestByPin(user.id, faceIdPin, branchId)}
                approvedHint={t.faceId.enterPinAgain}
              />
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={switchUser}
          className="flex h-10 cursor-pointer items-center gap-2 rounded border border-coal-line px-4 text-xs font-semibold text-white/70 transition-colors hover:border-taxi hover:text-taxi"
        >
          <UserRoundCog size={16} />
          {t.lock.switchUser}
        </button>
      </main>
    </div>
  )
}

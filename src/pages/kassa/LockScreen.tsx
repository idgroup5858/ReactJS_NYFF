import { Lock, UserRoundCog } from 'lucide-react'
import { useNavigate } from 'react-router'
import { logout, unlockSession } from '@/api/session'
import Brand from '@/components/layout/Brand'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import PinPad from '@/components/ui/PinPad'
import UserAvatar from '@/components/ui/UserAvatar'
import type { AuthUser } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'

/**
 * 5 daqiqa harakatsizlikdan keyin kassa ustini to'liq yopadi. Faqat shu kassirning PIN'i bilan ochiladi (server
 * tekshiradi, token yangilanadi); boshqa xodim kirmoqchi bo'lsa — chiqish (smena yopilmaydi).
 */
export default function LockScreen({ user }: { user: AuthUser }) {
  const t = useT()
  const navigate = useNavigate()

  // xato matni PIN pad ostida chiqadi (kirish ekranidagi kabi)
  const unlock = async (pin: string): Promise<string | null> => {
    try {
      await unlockSession(pin)
      return null
    } catch (error) {
      return errorMessage(error)
    }
  }

  const switchUser = () => {
    logout()
    void navigate('/', { replace: true })
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-coal">
      <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <Brand size="lg" />
        <LanguageSwitcher tone="dark" />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 pb-10">
        <div className="page-enter w-full max-w-md overflow-hidden rounded-card bg-white shadow-2xl">
          <div className="flex items-center gap-3 border-b border-neutral-200 px-5 py-4">
            <span className="flex h-10 w-10 items-center justify-center rounded bg-coal text-taxi">
              <Lock size={18} />
            </span>
            <div>
              <h1 className="text-[13px] font-bold tracking-[0.14em] text-neutral-950 uppercase">{t.lock.title}</h1>
              <p className="text-xs text-neutral-500">{t.lock.hint}</p>
            </div>
          </div>
          <div className="space-y-5 p-5">
            <div className="flex items-center gap-3">
              <UserAvatar name={user.name} size="lg" />
              <div>
                <p className="text-lg font-bold text-neutral-950">{user.name}</p>
                <p className="text-xs text-neutral-500">{t.roles[user.role]}</p>
              </div>
            </div>
            <PinPad onSubmit={unlock} submitLabel={t.lock.unlock} />
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

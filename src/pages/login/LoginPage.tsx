import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { useDb } from '@/api'
import { homePathFor, login, useCurrentUser } from '@/api/session'
import Brand from '@/components/layout/Brand'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import type { Branch, User } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { setLastBranch } from '@/store/settingsStore'
import { SectionTitle } from '@/components/ui/Card'
import PinPad from '@/components/ui/PinPad'
import UserAvatar from '@/components/ui/UserAvatar'
import BranchStep from './BranchStep'
import ModeStep from './ModeStep'
import UserStep from './UserStep'
import { isScreenMode, needsBranch, parseMode, type LoginMode } from './modes'

type Shell = {
  title: string
  subtitle?: string
  /** oldingi qadamning manzil parametrlari; `undefined` — birinchi qadam */
  back?: Record<string, string>
  wide?: boolean
  content: ReactNode
}

/**
 * Kirish: ish joyi → (filial) → xodim → PIN. Har bir qadam manzilda (`?mode=&branch=&user=`), shuning uchun
 * brauzerning "orqaga" tugmasi ham qadamma-qadam qaytaradi. TV va kiosk — PINsiz, filial tanlangach ochiladi.
 */
export default function LoginPage() {
  const t = useT()
  const db = useDb()
  const currentUser = useCurrentUser()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  useDocumentTitle()

  if (currentUser) return <Navigate to={homePathFor(currentUser.role)} replace />

  const mode = parseMode(params.get('mode'))
  const branches = db.branches.filter((b) => b.active)
  const branch = branches.find((b) => b.id === params.get('branch'))
  if (mode && isScreenMode(mode) && branch) return <Navigate to={`/${mode}/${branch.id}`} replace />

  // shu ish joyiga (va filialga) tegishli faol xodimlar — manzildagi `user` ham shu ro'yxatdan bo'lishi shart
  const users = mode
    ? db.users.filter((u) => u.active && u.role === mode && (!needsBranch(mode) || u.branchId === branch?.id))
    : []
  const user = users.find((u) => u.id === params.get('user'))

  const go = (next: Record<string, string>) => setParams(next)

  const selectMode = (next: LoginMode) => go({ mode: next })

  const selectBranch = (selectedMode: LoginMode, selected: Branch) => {
    setLastBranch(selected.id)
    if (isScreenMode(selectedMode)) void navigate(`/${selectedMode}/${selected.id}`)
    else go({ mode: selectedMode, branch: selected.id })
  }

  const selectUser = (selected: User) => go({ ...Object.fromEntries(params), user: selected.id })

  const submitPin = async (pin: string): Promise<string | null> => {
    if (!user) return null
    try {
      const session = await login(user.id, pin)
      void navigate(homePathFor(session.role), { replace: true })
      return null
    } catch (error) {
      return errorMessage(error)
    }
  }

  let shell: Shell
  if (!mode) {
    shell = { title: t.login.chooseMode, wide: true, content: <ModeStep onSelect={selectMode} /> }
  } else if (needsBranch(mode) && !branch) {
    shell = {
      title: t.login.chooseBranch,
      subtitle: t.modes[mode].title,
      back: {},
      content: <BranchStep branches={branches} onSelect={(selected) => selectBranch(mode, selected)} />,
    }
  } else if (!user) {
    shell = {
      title: t.login.chooseUser,
      subtitle: [t.modes[mode].title, branch?.name].filter(Boolean).join(' · '),
      back: needsBranch(mode) ? { mode } : {},
      wide: users.length > 2,
      content: <UserStep users={users} onSelect={selectUser} />,
    }
  } else {
    shell = {
      title: t.login.enterPin,
      subtitle: [t.modes[mode].title, branch?.name].filter(Boolean).join(' · '),
      back: branch ? { mode, branch: branch.id } : { mode },
      content: (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <UserAvatar name={user.name} size="lg" />
            <div>
              <p className="text-lg font-bold text-neutral-950">{user.name}</p>
              <p className="text-xs text-neutral-500">{t.roles[user.role]}</p>
            </div>
          </div>
          <PinPad key={user.id} onSubmit={submitPin} />
        </div>
      ),
    }
  }

  const stepKey = [mode, branch?.id, user?.id].join('|')

  return (
    <div className="flex min-h-screen flex-col bg-coal">
      <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <Brand size="lg" />
        <LanguageSwitcher tone="dark" />
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pt-4 pb-10 sm:items-center">
        <div key={stepKey} className={`page-enter w-full overflow-hidden rounded-card bg-white shadow-2xl ${shell.wide ? 'max-w-3xl' : 'max-w-md'}`}>
          <div className="flex items-center gap-3 border-b border-neutral-200 px-5 py-4">
            {shell.back && (
              <button
                type="button"
                onClick={() => go(shell.back ?? {})}
                aria-label={t.common.back}
                title={t.common.back}
                className="btn-icon flex h-9 w-9 shrink-0 items-center justify-center rounded"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <div className="min-w-0">
              <SectionTitle as="h1">{shell.title}</SectionTitle>
              {shell.subtitle && <p className="mt-0.5 pl-3 text-xs text-neutral-500 gomeal:pl-0 modern:pl-0">{shell.subtitle}</p>}
            </div>
          </div>
          <div className="p-5">{shell.content}</div>
        </div>
      </main>

      <footer className="pb-4 text-center text-[11px] tracking-[0.2em] text-white/25 uppercase">{t.appName}</footer>
    </div>
  )
}

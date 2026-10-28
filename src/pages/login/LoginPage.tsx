import { ChevronLeft, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { useBranches, useStaffList } from '@/api/queries'
import { homePathFor, login, useCurrentUser } from '@/api/session'
import Brand from '@/components/layout/Brand'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import type { AuthUser, Branch, ID } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { setLastBranch } from '@/store/settingsStore'
import { SectionTitle } from '@/components/ui/Card'
import PinPad from '@/components/ui/PinPad'
import UserAvatar from '@/components/ui/UserAvatar'
import BranchStep from './BranchStep'
import ModeStep from './ModeStep'
import UserStep from './UserStep'
import { isScreenMode, isStaffMode, needsBranch, parseMode, type LoginMode, type ScreenMode, type StaffMode } from './modes'

type Step = 'mode' | 'branch' | 'user' | 'pin'

type Shell = {
  step: Step
  title: string
  subtitle?: string
  /** oldingi qadamning manzil parametrlari; `undefined` — birinchi qadam */
  back?: Record<string, string>
  wide?: boolean
  content: ReactNode
}

/** Tanlangan ish joyi (va filial) xodimlari — kerakli tanlov bo'lmaguncha so'ralmaydi. */
function useLoginStaff(role: StaffMode | null, branchId: ID | null) {
  const branch = role && needsBranch(role) ? branchId : null
  const ready = role !== null && (!needsBranch(role) || branch !== null)
  return useStaffList({ branchId: branch, role }, { enabled: ready })
}

/** Qadam ma'lumoti yuklanmoqda yoki xato — bo'sh ro'yxat xabari o'rnida, balandligi bir xil (karta sakramaydi). */
function StepStatus({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const t = useT()
  if (!error) {
    return (
      <div className="flex justify-center py-8 text-neutral-300">
        <LoaderCircle size={20} className="animate-spin" />
      </div>
    )
  }
  return (
    <div className="space-y-3 py-8 text-center">
      <p className="text-sm font-semibold text-red-700">{errorMessage(error)}</p>
      <button type="button" onClick={onRetry} className="btn-ghost h-10 rounded px-4 text-sm font-bold">
        {t.login.retry}
      </button>
    </div>
  )
}

/**
 * Kirish: ish joyi → (filial) → xodim → PIN. Har bir qadam manzilda (`?mode=&branch=&user=`), shuning uchun
 * brauzerning "orqaga" tugmasi ham qadamma-qadam qaytaradi. TV va kiosk — PINsiz va kodsiz: ish joyi → filial →
 * ekran ochiladi (`/tv/:branchId`, `/kiosk/:branchId`).
 */
export default function LoginPage() {
  const t = useT()
  const currentUser = useCurrentUser()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  useDocumentTitle()

  const mode = parseMode(params.get('mode'))
  const branchParam = params.get('branch')
  const userParam = params.get('user')
  const branchesQuery = useBranches()
  const staffQuery = useLoginStaff(mode && isStaffMode(mode) ? mode : null, branchParam)

  // TV / kiosk sessiyasiz ishlaydi — shu tabda xodim kirgan bo'lsa ham ekran filialini tanlash mumkin
  if (currentUser && !(mode && isScreenMode(mode))) return <Navigate to={homePathFor(currentUser.role)} replace />

  const branches = (branchesQuery.data ?? []).filter((b) => b.active)
  const branch = branches.find((b) => b.id === branchParam)
  // shu ish joyiga (va filialga) tegishli faol xodimlar — manzildagi `user` ham shu ro'yxatdan bo'lishi shart
  const users = staffQuery.data ?? []
  const user = users.find((u) => u.id === userParam)

  const go = (next: Record<string, string>) => setParams(next)

  const selectMode = (next: LoginMode) => go({ mode: next })

  const selectBranch = (selectedMode: LoginMode, selected: Branch) => {
    setLastBranch(selected.id)
    go({ mode: selectedMode, branch: selected.id })
  }

  // TV va kiosk — filial tanlanishi bilan ekran ochiladi ("orqaga" — shu filial tanloviga qaytaradi)
  const openScreen = (screen: ScreenMode, selected: Branch) => {
    setLastBranch(selected.id)
    void navigate(`/${screen}/${selected.id}`)
  }

  const selectUser = (selected: AuthUser) => go({ ...Object.fromEntries(params), user: selected.id })

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

  // ma'lumot kelguncha qadam manzildan aniqlanadi — yuklangach sarlavha va karta sakramaydi
  const branchPending = !branchesQuery.data
  const staffPending = !staffQuery.data
  const subtitle = mode ? [t.modes[mode].title, branch?.name].filter(Boolean).join(' · ') : undefined

  /** Filial tanlash qadami — kassir / oshpaz yordamchisi va TV / kiosk uchun bir xil. */
  const branchStep = (selectedMode: LoginMode, onSelect: (selected: Branch) => void): Shell => ({
    step: 'branch',
    title: t.login.chooseBranch,
    subtitle: t.modes[selectedMode].title,
    back: {},
    content: branchPending ? <StepStatus error={branchesQuery.error} onRetry={branchesQuery.reload} /> : <BranchStep branches={branches} onSelect={onSelect} />,
  })

  let shell: Shell
  if (!mode) {
    shell = { step: 'mode', title: t.login.chooseMode, wide: true, content: <ModeStep onSelect={selectMode} /> }
  } else if (isScreenMode(mode)) {
    shell = branchStep(mode, (selected) => openScreen(mode, selected))
  } else if (needsBranch(mode) && !branch && !(branchParam && branchPending)) {
    shell = branchStep(mode, (selected) => selectBranch(mode, selected))
  } else if (!user && !(userParam && staffPending)) {
    shell = {
      step: 'user',
      title: t.login.chooseUser,
      subtitle,
      back: needsBranch(mode) ? { mode } : {},
      wide: users.length > 2,
      content: staffPending ? <StepStatus error={staffQuery.error} onRetry={staffQuery.reload} /> : <UserStep users={users} onSelect={selectUser} />,
    }
  } else {
    shell = {
      step: 'pin',
      title: t.login.enterPin,
      subtitle,
      back: branchParam ? { mode, branch: branchParam } : { mode },
      content: user ? (
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
      ) : (
        <StepStatus error={staffQuery.error} onRetry={staffQuery.reload} />
      ),
    }
  }

  const stepKey = [shell.step, mode, branchParam, userParam].join('|')

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

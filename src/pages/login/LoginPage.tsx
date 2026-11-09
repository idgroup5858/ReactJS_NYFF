import { ChevronLeft, LoaderCircle } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { api } from '@/api'
import { ApiError } from '@/api/http'
import { useBranches, useStaffList } from '@/api/queries'
import { homePathFor, login, useCurrentUser } from '@/api/session'
import Brand from '@/components/layout/Brand'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import { fullName } from '@/domain/rules'
import type { AuthUser, Branch, ID } from '@/domain/types'
import { errorMessage, pinFailure, useT, type PinFailure } from '@/i18n'
import { enterFullscreen } from '@/lib/fullscreen'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { setLastBranch, setLastLogin, useSettings, type LastLogin } from '@/store/settingsStore'
import { SectionTitle } from '@/components/ui/Card'
import FaceIdRequestPanel from '@/components/ui/FaceIdRequestPanel'
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

/** Ish joylari ro'yxati — oxirgi kirilgan joyga avtomatik o'tmasdan ("orqaga" bilan qaytilganda). */
const MODE_LIST = { step: 'mode' }

/**
 * Shu kompyuterda oxirgi kirilgan ish joyi (va filial) manzili — kirish ekrani tanlovlarsiz shu yerdan ochiladi.
 * Filial keyin o'chirilgan/nofaol bo'lsa, odatdagi filial tanlash ko'rinadi.
 */
function rememberedParams(last: LastLogin | null): Record<string, string> | null {
  const mode = parseMode(last?.mode ?? null)
  if (!last || !mode || !isStaffMode(mode)) return null
  if (!needsBranch(mode)) return { mode }
  return last.branchId ? { mode, branch: last.branchId } : null
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
 *
 * Kassa va oshpaz yordamchisi alohida kompyuterlarda: muvaffaqiyatli kirilgan ish joyi va filial eslab qolinadi,
 * keyingi safar sahifa to'g'ridan-to'g'ri o'sha xodimlar ro'yxatidan ochiladi. Adashib tanlangan bo'lsa — har qadamda
 * "orqaga" bor (`?step=mode` — ish joylari, avtomatik o'tishsiz) va xodimlar ostida "Boshqa filial tanlash".
 */
export default function LoginPage() {
  const t = useT()
  const { lastLogin } = useSettings()
  const currentUser = useCurrentUser()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  useDocumentTitle()

  const mode = parseMode(params.get('mode'))
  const branchParam = params.get('branch')
  const userParam = params.get('user')
  const branchesQuery = useBranches()
  const staffQuery = useLoginStaff(mode && isStaffMode(mode) ? mode : null, branchParam)
  // FaceID: PIN to'g'ri, lekin terminaldan o'tilmagan — shu PIN bilan admindan ruxsat so'rash mumkin (xodim almashsa — yo'q)
  const [faceIdPin, setFaceIdPin] = useState<{ userId: string; pin: string } | null>(null)

  // TV / kiosk sessiyasiz ishlaydi — shu tabda xodim kirgan bo'lsa ham ekran filialini tanlash mumkin
  if (currentUser && !(mode && isScreenMode(mode))) return <Navigate to={homePathFor(currentUser.role)} replace />

  const remembered = params.toString() === '' ? rememberedParams(lastLogin) : null
  if (remembered) return <Navigate to={{ search: `?${new URLSearchParams(remembered).toString()}` }} replace />

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

  // TV va kiosk — filial tanlanishi bilan ekran ochiladi, darhol to'liq ekranda (mijozdan manzil qatori yashirin)
  const openScreen = (screen: ScreenMode, selected: Branch) => {
    enterFullscreen()
    setLastBranch(selected.id)
    void navigate(`/${screen}/${selected.id}`)
  }

  const selectUser = (selected: AuthUser) => go({ ...Object.fromEntries(params), user: selected.id })

  const submitPin = async (pin: string): Promise<PinFailure | null> => {
    if (!user) return null
    const branchId = mode && needsBranch(mode) ? (branch?.id ?? null) : null
    try {
      // bir nechta filialda ishlaydigan xodim — sessiya shu tanlangan filialniki
      const session = await login(user.id, pin, branchId)
      // kassa va oshxona — darhol to'liq ekranda (sahifa yuklanishini kutmay: brauzer ruxsati PIN bosilgandan bir necha soniya)
      if (session.role === 'cashier' || session.role === 'kitchen') enterFullscreen()
      if (mode) setLastLogin({ mode, branchId })
      void navigate(homePathFor(session.role), { replace: true })
      return null
    } catch (error) {
      const faceId = error instanceof ApiError && error.code === 'faceid_checkin_required'
      setFaceIdPin(faceId ? { userId: user.id, pin } : null)
      return pinFailure(error)
    }
  }
  const faceIdRequest = faceIdPin && user && faceIdPin.userId === user.id && branch ? { ...faceIdPin, branchId: branch.id } : null

  // ma'lumot kelguncha qadam manzildan aniqlanadi — yuklangach sarlavha va karta sakramaydi
  const branchPending = !branchesQuery.data
  const staffPending = !staffQuery.data
  const subtitle = mode ? [t.modes[mode].title, branch?.name].filter(Boolean).join(' · ') : undefined

  /** Filial tanlash qadami — kassir / oshpaz yordamchisi va TV / kiosk uchun bir xil. */
  const branchStep = (selectedMode: LoginMode, onSelect: (selected: Branch) => void): Shell => ({
    step: 'branch',
    title: t.login.chooseBranch,
    subtitle: t.modes[selectedMode].title,
    back: MODE_LIST,
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
      back: needsBranch(mode) ? { mode } : MODE_LIST,
      wide: users.length > 2,
      content: (
        <>
          {staffPending ? <StepStatus error={staffQuery.error} onRetry={staffQuery.reload} /> : <UserStep users={users} onSelect={selectUser} />}
          {needsBranch(mode) && (
            <button
              type="button"
              onClick={() => go({ mode })}
              className="mx-auto mt-4 block cursor-pointer text-xs text-neutral-500 underline-offset-2 hover:text-coal hover:underline"
            >
              {t.login.otherBranch}
            </button>
          )}
        </>
      ),
    }
  } else {
    shell = {
      step: 'pin',
      title: t.login.enterPin,
      subtitle,
      back: branchParam ? { mode, branch: branchParam } : { mode },
      content: user ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <UserAvatar name={fullName(user)} />
            <div>
              <p className="text-lg font-bold text-neutral-950">{fullName(user)}</p>
              <p className="text-xs text-neutral-500">{t.roles[user.role]}</p>
            </div>
          </div>
          <PinPad key={user.id} onSubmit={submitPin} />
          {faceIdRequest && (
            <FaceIdRequestPanel
              key={`${faceIdRequest.userId}|${faceIdRequest.pin}`}
              request={() => api.faceId.requestByPin(faceIdRequest.userId, faceIdRequest.pin, faceIdRequest.branchId)}
              approvedHint={t.faceId.enterPinAgain}
            />
          )}
        </div>
      ) : (
        <StepStatus error={staffQuery.error} onRetry={staffQuery.reload} />
      ),
    }
  }

  const stepKey = [shell.step, mode, branchParam, userParam].join('|')

  return (
    <div className="flex min-h-screen flex-col bg-coal">
      <header className="flex items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <Brand size="lg" />
        <LanguageSwitcher tone="dark" />
      </header>

      {/* ixcham — POS monitorda (768 px) PIN pad va "Kirish" tugmasi bitta ekranga sig'sin */}
      <main className="flex flex-1 items-start justify-center px-4 pt-2 pb-4 sm:items-center">
        <div key={stepKey} className={`page-enter w-full overflow-hidden rounded-card bg-white shadow-2xl ${shell.wide ? 'max-w-3xl' : 'max-w-sm'}`}>
          <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
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
          <div className="p-4">{shell.content}</div>
        </div>
      </main>

      <footer className="pb-3 text-center text-[11px] tracking-[0.2em] text-white/25 uppercase">{t.appName}</footer>
    </div>
  )
}

import { LogOut, MapPin } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useBranches } from '@/api/queries'
import { logout, useCurrentUser } from '@/api/session'
import { fullName, initials } from '@/domain/rules'
import { useT } from '@/i18n'
import Brand from './Brand'
import ColorModeToggle from './ColorModeToggle'
import { HEADER_BUTTON } from './headerButton'
import LanguageSwitcher from './LanguageSwitcher'
import Sidebar, { type NavGroup } from './Sidebar'
import ThemeMenu from './ThemeMenu'
import { useColorModeRoot } from './useColorModeRoot'

type Props = {
  title: string
  children: ReactNode
  /** header'dagi qo'shimcha tugmalar (til tanlovidan oldin) — [HeaderAction] */
  actions?: ReactNode
  /** bo'lim sahifalari (admin, ombor) — chapda yig'iladigan menyu */
  nav?: NavGroup[]
  /** "Chiqish" bosilganda (kassir uchun — smenani topshirish savoli); berilmasa darhol chiqadi */
  onLogout?: () => void
  /** `page` — markazda cheklangan kenglik va chekka bo'shliqlar (admin, ombor); `fill` — butun ekran (kassa) */
  variant?: 'page' | 'fill'
  /** yashirin tugma — logotip 10 soniya bosib turilsa (oshxona: to'liq ekran) */
  onBrandHold?: () => void
  /** chap menyusiz, lekin back-office sahifa (NBU test) — qorong'i rejim tugmasi bilan; menyusi borlarda o'zi yoqiq */
  colorMode?: boolean
}

type ActionProps = {
  label: string
  icon: ReactNode
  onClick: () => void
  /** masalan tayyor buyurtmalar soni — qora doirada */
  badge?: number
  /** yorliq kichik ekranda yashirinadi, faqat ikonka qoladi */
  compact?: boolean
}

/** Header'dagi tugma (Chiqish bilan bir xil ko'rinishda) — qora panel ustida. */
export function HeaderAction({ label, icon, onClick, badge, compact = true }: ActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={HEADER_BUTTON}
    >
      {icon}
      <span className={compact ? 'hidden xl:inline' : 'hidden sm:inline'}>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-taxi px-1 text-[11px] font-bold text-coal tabular-nums ring-2 ring-coal">
          {badge}
        </span>
      )}
    </button>
  )
}

/**
 * Xodim ekranlari qobig'i: tepada qora panel (brend · bo'lim · filial | amallar · til · xodim · chiqish), admin va omborda —
 * chapda yig'iladigan menyu ([Sidebar]).
 */
export default function StaffLayout({ title, children, actions, nav, onLogout, variant = 'page', onBrandHold, colorMode = false }: Props) {
  const t = useT()
  const branches = useBranches().data
  const user = useCurrentUser()
  const navigate = useNavigate()
  const branch = user?.branchId ? branches?.find((b) => b.id === user.branchId) : undefined
  // qorong'i rejim — faqat back-office'da (chap menyusi bor sahifalar: admin, ombor; menyusizlardan — NBU test)
  const backOffice = nav !== undefined || colorMode
  useColorModeRoot(backOffice)

  const defaultLogout = () => {
    // admin umumiy kirish ekranida yo'q — o'zining kirish oynasiga (`/admin`)
    const home = user?.role === 'admin' ? '/admin' : '/'
    logout()
    void navigate(home, { replace: true })
  }

  return (
    <div className={`flex flex-col ${variant === 'fill' ? 'h-screen' : 'min-h-screen'}`}>
      <header className="sticky top-0 z-30 shrink-0 bg-coal text-white dark:shadow-[0_1px_0_var(--color-line)]">
        <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="shrink-0" aria-label={t.common.home}>
            <Brand onHold={onBrandHold} />
          </Link>
          <span className="hidden h-6 w-px bg-coal-line sm:block" />
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <h1 className="title-section truncate text-white">{title}</h1>
            {branch && (
              <span className="hidden items-center gap-1.5 rounded-chip bg-coal-soft px-2 py-1 text-xs font-medium text-white/75 md:inline-flex">
                <MapPin size={12} className="text-taxi" />
                {branch.name}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {actions}
            {backOffice && <ColorModeToggle />}
            <ThemeMenu />
            <div className="hidden sm:block">
              <LanguageSwitcher tone="dark" />
            </div>
            {user && (
              <span className="hidden items-center gap-2 lg:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-taxi text-xs font-bold text-coal">
                  {initials(fullName(user))}
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-semibold">{fullName(user)}</span>
                  <span className="block text-[11px] text-white/50">{t.roles[user.role]}</span>
                </span>
              </span>
            )}
            <HeaderAction label={t.common.logout} icon={<LogOut size={16} />} onClick={onLogout ?? defaultLogout} compact={false} />
          </div>
        </div>
      </header>

      {variant === 'fill' ? (
        <main className="min-h-0 flex-1">{children}</main>
      ) : nav ? (
        <div className="flex flex-1">
          <Sidebar groups={nav} />
          <main className="min-w-0 flex-1 p-4 sm:p-6">
            <div className="page-enter mx-auto max-w-screen-2xl">{children}</div>
          </main>
        </div>
      ) : (
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
          <div className="page-enter">{children}</div>
        </main>
      )}
    </div>
  )
}

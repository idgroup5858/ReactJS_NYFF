import { X } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink } from 'react-router'
import { useCurrentUser } from '@/api/session'
import { fullName, initials } from '@/domain/rules'
import { useT } from '@/i18n'
import Brand from './Brand'
import ColorModeToggle from './ColorModeToggle'
import { HEADER_BUTTON } from './headerButton'
import LanguageSwitcher from './LanguageSwitcher'
import { SidebarBadge, SidebarGroupTitle, type NavGroup } from './Sidebar'
import { sidebarItemClass } from './sidebarItemClass'
import ThemeMenu from './ThemeMenu'

/** Chap menyu shu kenglikdan boshlab ko'rinadi (`md`); undan torida — shu oyna. */
const DESKTOP_QUERY = '(min-width: 768px)'

/**
 * Telefonda chap menyu o'rniga (☰): chapdan chiqadi — tepada brend, xodim, til / rang rejimi / mavzu (telefonda header'ga
 * sig'maydi), ostida bo'limlar nomi bilan. Bo'lim tanlanganda, fonga bosilganda, Esc yoki ekran kengayganda (planshetni
 * yotqizganda — chap menyu chiqadi) yopiladi.
 */
export default function NavDrawer({ groups, onClose }: { groups: NavGroup[]; onClose: () => void }) {
  const t = useT()
  const user = useCurrentUser()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const desktop = window.matchMedia(DESKTOP_QUERY)
    const onWiden = () => desktop.matches && onClose()
    // orqadagi sahifa menyu ostida surilmasin
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    desktop.addEventListener('change', onWiden)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
      desktop.removeEventListener('change', onWiden)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t.common.menu}
        className="drawer-enter absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-2xl dark:bg-coal dark:shadow-[1px_0_0_var(--color-line)]"
      >
        <div className="shrink-0 space-y-3 bg-coal px-4 pt-2.5 pb-4 text-white">
          <div className="flex h-9 items-center justify-between gap-3">
            <Brand />
            <button type="button" onClick={onClose} aria-label={t.common.close} title={t.common.close} className={HEADER_BUTTON}>
              <X size={16} />
            </button>
          </div>
          {user && (
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-taxi text-xs font-bold text-coal">{initials(fullName(user))}</span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-semibold">{fullName(user)}</span>
                <span className="block text-[11px] text-white/50">{t.roles[user.role]}</span>
              </span>
            </div>
          )}
          {/* mavzu oynasi tugmaning o'ng chetidan pastga ochiladi — tugma o'ngda, oyna menyu ichida qoladi */}
          <div className="flex items-center justify-between gap-2">
            <LanguageSwitcher tone="dark" />
            <div className="flex items-center gap-2">
              <ColorModeToggle />
              <ThemeMenu />
            </div>
          </div>
        </div>
        <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
          {groups.map((group) => (
            <div key={group.title} className="space-y-1">
              <SidebarGroupTitle collapsed={false} first>
                {group.title}
              </SidebarGroupTitle>
              {group.items.map(({ to, label, icon: Icon, end, badge }) => (
                <NavLink key={to} to={to} end={end} onClick={onClose} className={({ isActive }) => sidebarItemClass(isActive, false)}>
                  <Icon size={18} className="shrink-0" />
                  <span className="min-w-0 flex-1">{label}</span>
                  {badge !== undefined && badge > 0 && <SidebarBadge value={badge} collapsed={false} />}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </div>
  )
}

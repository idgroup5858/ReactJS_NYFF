import { NavLink } from 'react-router'
import { SidebarBadge, type NavItem } from './Sidebar'

/** Tab: ikonka · nom · belgi; tanlangani — sariq (chap menyu bandidek). Planshetda barmoq bilan bosishga yetarli (40 px). */
function tabClass(active: boolean): string {
  return `relative flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded px-4 text-sm font-semibold whitespace-nowrap transition-colors ${active ? 'bg-taxi text-coal' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950'}`
}

/**
 * Bo'lim tablari — header ostida yopishqoq qator (ta'minotchi: chap menyu o'rniga, eni butunlay ro'yxatlarga qoladi).
 * Sig'masa — yonga suriladi.
 */
export default function NavTabs({ items }: { items: NavItem[] }) {
  return (
    <div className="sticky top-14 z-20 shrink-0 bg-surface px-4 shadow-card sm:px-6 dark:bg-coal dark:shadow-[0_1px_0_var(--color-line)]">
      <nav className="mx-auto flex max-w-screen-2xl gap-1 overflow-x-auto py-1.5">
        {items.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => tabClass(isActive)}>
            <Icon size={18} className="shrink-0" />
            {label}
            {badge !== undefined && badge > 0 && <SidebarBadge value={badge} collapsed={false} />}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

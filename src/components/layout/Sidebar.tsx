import { PanelLeftClose, PanelLeftOpen, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { useT } from '@/i18n'
import { setSidebarCollapsed, useSettings } from '@/store/settingsStore'
import { sidebarItemClass } from './sidebarItemClass'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  /** faqat aynan shu manzilda faol (bosh sahifa uchun) */
  end?: boolean
  badge?: number
}

export type NavGroup = { title: string; items: NavItem[] }

type PanelProps = {
  collapsed: boolean
  onToggle: () => void
  /** joylashuv: admin'da — sticky, kassada — ota blok balandligida */
  className?: string
  children: ReactNode
}

/**
 * Chap menyu qobig'i — admin / ombor bo'limlari va kassa kategoriyalari uchun bir xil: oq panel, ichida bandlar, pastda
 * "Menyuni yig'ish". Yig'ilganda faqat ikonkalar qoladi (nomi — sichqoncha ustida).
 */
export function SidebarPanel({ collapsed, onToggle, className = '', children }: PanelProps) {
  const t = useT()
  const toggleLabel = collapsed ? t.common.expandMenu : t.common.collapseMenu
  return (
    <aside className={`flex shrink-0 flex-col bg-white shadow-card transition-[width] duration-200 ${collapsed ? 'w-[72px]' : 'w-60'} ${className}`}>
      <nav className="flex-1 space-y-4 overflow-x-hidden overflow-y-auto p-3">{children}</nav>
      <button
        type="button"
        onClick={onToggle}
        title={toggleLabel}
        aria-label={toggleLabel}
        aria-expanded={!collapsed}
        className={`m-3 flex h-10 shrink-0 cursor-pointer items-center gap-3 rounded px-3 text-sm font-semibold whitespace-nowrap text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-950 ${collapsed ? 'justify-center' : ''}`}
      >
        {collapsed ? <PanelLeftOpen size={18} className="shrink-0" /> : <PanelLeftClose size={18} className="shrink-0" />}
        {!collapsed && toggleLabel}
      </button>
    </aside>
  )
}

/** Guruh sarlavhasi; yig'ilganda — guruhlar orasida chiziq. */
export function SidebarGroupTitle({ collapsed, first, children }: { collapsed: boolean; first: boolean; children: ReactNode }) {
  if (collapsed) return first ? null : <div className="mx-2 mb-3 h-px bg-neutral-200" />
  return <p className="px-3 pb-1 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">{children}</p>
}

/** Son belgisi: `alert` — qizil (kutilayotgan ish), `muted` — kulrang (miqdor). Yig'ilganda ikonka burchagida. */
export function SidebarBadge({ value, collapsed, tone = 'alert', active = false }: { value: number; collapsed: boolean; tone?: 'alert' | 'muted'; active?: boolean }) {
  const color = tone === 'alert' ? 'bg-red-600 text-white' : active ? 'bg-white text-coal' : 'bg-neutral-100 text-neutral-500'
  return (
    <span
      className={`flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[11px] font-bold tabular-nums ${color} ${collapsed ? 'absolute top-0.5 right-1 ring-2 ring-white' : ''}`}
    >
      {value}
    </span>
  )
}

/**
 * Admin / ombor chap menyusi: guruhlar bo'yicha (admin uchun boshqaruv va ombor doim birga — bo'lim almashganda menyu
 * yo'qolmaydi). Yig'ilish holati shu qurilmada saqlanadi.
 */
export default function Sidebar({ groups }: { groups: NavGroup[] }) {
  const { sidebarCollapsed: collapsed } = useSettings()

  return (
    <SidebarPanel collapsed={collapsed} onToggle={() => setSidebarCollapsed(!collapsed)} className="sticky top-14 h-[calc(100vh-3.5rem)]">
      {groups.map((group, index) => (
        <div key={group.title} className="space-y-1">
          <SidebarGroupTitle collapsed={collapsed} first={index === 0}>
            {group.title}
          </SidebarGroupTitle>
          {group.items.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              aria-label={collapsed ? label : undefined}
              className={({ isActive }) => sidebarItemClass(isActive, collapsed)}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="min-w-0 flex-1">{label}</span>}
              {badge !== undefined && badge > 0 && <SidebarBadge value={badge} collapsed={collapsed} />}
            </NavLink>
          ))}
        </div>
      ))}
    </SidebarPanel>
  )
}

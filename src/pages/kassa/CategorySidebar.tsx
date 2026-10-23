import { SidebarBadge, SidebarGroupTitle, SidebarPanel } from '@/components/layout/Sidebar'
import { sidebarItemClass } from '@/components/layout/sidebarItemClass'
import CategoryIcon from '@/components/menu/CategoryIcon'
import type { Category, ID } from '@/domain/types'
import { useLocalize, useT } from '@/i18n'
import { setCategoryRailCollapsed, useSettings } from '@/store/settingsStore'

type Props = {
  categories: Category[]
  activeId: ID | null
  /** kategoriya id → faol taomlar soni */
  counts: Map<ID, number>
  onSelect: (id: ID) => void
}

/**
 * Kassaning chap kategoriyalar menyusi — admin paneldagi menyu bilan bir xil: ikonka · nom · taomlar soni, tanlangani
 * sariq, pastda "Menyuni yig'ish" (yig'ilganda faqat ikonkalar). Holati shu qurilmada saqlanadi.
 */
export default function CategorySidebar({ categories, activeId, counts, onSelect }: Props) {
  const t = useT()
  const localize = useLocalize()
  const { categoryRailCollapsed: collapsed } = useSettings()

  return (
    <SidebarPanel collapsed={collapsed} onToggle={() => setCategoryRailCollapsed(!collapsed)} className="h-full">
      <div className="space-y-1">
        <SidebarGroupTitle collapsed={collapsed} first>
          {t.admin.menu.categories}
        </SidebarGroupTitle>
        {categories.map((category) => {
          const name = localize(category.name)
          const active = category.id === activeId
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category.id)}
              aria-pressed={active}
              title={collapsed ? name : undefined}
              aria-label={collapsed ? name : undefined}
              className={sidebarItemClass(active, collapsed)}
            >
              <CategoryIcon category={category} box="h-6 w-6" line={18} />
              {!collapsed && <span className="min-w-0 flex-1">{name}</span>}
              {!collapsed && <SidebarBadge value={counts.get(category.id) ?? 0} collapsed={false} tone="muted" active={active} />}
            </button>
          )
        })}
      </div>
    </SidebarPanel>
  )
}

import { SidebarBadge, SidebarGroupTitle, SidebarPanel } from '@/components/layout/Sidebar'
import { sidebarItemClass } from '@/components/layout/sidebarItemClass'
import CategoryIcon from '@/components/menu/CategoryIcon'
import CategoryTile from '@/components/menu/CategoryTile'
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
 * sariq, pastda "Menyuni yig'ish". Yig'ilganda — tepadagi qatorning kartochkalari ([CategoryTile], aynan o'sha
 * o'lchamda) ustma-ust, sahifa fonida (oq panelda oq kartochka ajralmaydi), taomlar sonisiz. Holati shu qurilmada
 * saqlanadi.
 */
export default function CategorySidebar({ categories, activeId, counts, onSelect }: Props) {
  const t = useT()
  const localize = useLocalize()
  const { categoryRailCollapsed: collapsed } = useSettings()

  return (
    // 136px — kartochka (112px) + ikki chekkada `p-3`
    <SidebarPanel collapsed={collapsed} onToggle={() => setCategoryRailCollapsed(!collapsed)} className="h-full" collapsedClass="w-[136px] bg-page">
      {collapsed ? (
        <div className="flex flex-col gap-3">
          {categories.map((category) => (
            <CategoryTile key={category.id} category={category} active={category.id === activeId} onClick={() => onSelect(category.id)} />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          <SidebarGroupTitle collapsed={false} first>
            {t.admin.menu.categories}
          </SidebarGroupTitle>
          {categories.map((category) => {
            const active = category.id === activeId
            return (
              <button key={category.id} type="button" onClick={() => onSelect(category.id)} aria-pressed={active} className={sidebarItemClass(active, false)}>
                <CategoryIcon category={category} box="h-6 w-6" />
                <span className="min-w-0 flex-1">{localize(category.name)}</span>
                <SidebarBadge value={counts.get(category.id) ?? 0} collapsed={false} tone="muted" active={active} />
              </button>
            )
          })}
        </div>
      )}
    </SidebarPanel>
  )
}

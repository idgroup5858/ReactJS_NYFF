import { Calculator, LayoutDashboard, MonitorSmartphone, Tv, Warehouse, type LucideIcon } from 'lucide-react'

/** Kirish ekranidagi ish joylari: uchtasi xodim roli (PIN bilan), ikkitasi ekran (faqat filial tanlanadi). */
export type LoginMode = 'cashier' | 'supplier' | 'admin' | 'tv' | 'kiosk'
export type ScreenMode = 'tv' | 'kiosk'

export const STAFF_MODES: LoginMode[] = ['cashier', 'supplier', 'admin']
export const SCREEN_MODES: ScreenMode[] = ['tv', 'kiosk']
const ALL_MODES: LoginMode[] = [...STAFF_MODES, ...SCREEN_MODES]

export const MODE_ICONS: Record<LoginMode, LucideIcon> = {
  cashier: Calculator,
  supplier: Warehouse,
  admin: LayoutDashboard,
  tv: Tv,
  kiosk: MonitorSmartphone,
}

export function parseMode(value: string | null): LoginMode | null {
  return ALL_MODES.find((mode) => mode === value) ?? null
}

/** Admin va ta'minotchi filialga bog'lanmagan. */
export function needsBranch(mode: LoginMode): boolean {
  return mode !== 'admin' && mode !== 'supplier'
}

export function isScreenMode(mode: LoginMode): mode is ScreenMode {
  return mode === 'tv' || mode === 'kiosk'
}

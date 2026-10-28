import { Calculator, ChefHat, LayoutDashboard, MonitorSmartphone, Tv, Warehouse } from 'lucide-react'
import type { ComponentType } from 'react'
import type { Role } from '@/domain/types'

/**
 * Kirish ekranidagi ish joylari: to'rttasi xodim roli (PIN bilan), ikkitasi ekran (PINsiz va kodsiz — filial tanlanadi).
 * Mijozning mobil ilovasi (Android / iOS) va kuryer ilovasi (Android) — alohida, backend'ning `/mobile` va `/courier`
 * API'lari bilan.
 */
export type StaffMode = Exclude<Role, 'courier'>
export type LoginMode = StaffMode | 'tv' | 'kiosk'
export type ScreenMode = 'tv' | 'kiosk'

export const STAFF_MODES: StaffMode[] = ['cashier', 'kitchen', 'supplier', 'admin']
export const SCREEN_MODES: ScreenMode[] = ['tv', 'kiosk']
const ALL_MODES: LoginMode[] = [...STAFF_MODES, ...SCREEN_MODES]

export const MODE_ICONS: Record<LoginMode, ComponentType<{ size?: number }>> = {
  cashier: Calculator,
  kitchen: ChefHat,
  supplier: Warehouse,
  admin: LayoutDashboard,
  tv: Tv,
  kiosk: MonitorSmartphone,
}

export function parseMode(value: string | null): LoginMode | null {
  return ALL_MODES.find((mode) => mode === value) ?? null
}

export function isScreenMode(mode: LoginMode): mode is ScreenMode {
  return mode === 'tv' || mode === 'kiosk'
}

/** Xodim roli — PIN bilan kiradi. */
export function isStaffMode(mode: LoginMode): mode is StaffMode {
  return !isScreenMode(mode)
}

/** Kassir va oshpaz yordamchisi filialni tanlaydi; admin va ta'minotchi filialga bog'lanmagan. */
export function needsBranch(mode: LoginMode): boolean {
  return mode === 'cashier' || mode === 'kitchen'
}

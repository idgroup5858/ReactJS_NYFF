import { Calculator, ChefHat, MonitorSmartphone, Tv, Warehouse } from 'lucide-react'
import type { ComponentType } from 'react'
import type { Role } from '@/domain/types'

/**
 * Kirish ekranidagi ish joylari: uchtasi xodim roli (PIN bilan), ikkitasi ekran (PINsiz va kodsiz — filial tanlanadi).
 * Admin bu yerda yo'q — u `/admin` manzilida email va parol bilan kiradi (umumiy ekranda ko'rinmasin). Mijozning mobil
 * ilovasi va kuryer qismi (Android) — alohida, backend'ning `/mobile` va `/courier` API'lari bilan.
 */
export type StaffMode = Exclude<Role, 'courier' | 'admin'>
export type LoginMode = StaffMode | 'tv' | 'kiosk'
export type ScreenMode = 'tv' | 'kiosk'

export const STAFF_MODES: StaffMode[] = ['cashier', 'kitchen', 'supplier']
export const SCREEN_MODES: ScreenMode[] = ['tv', 'kiosk']
const ALL_MODES: LoginMode[] = [...STAFF_MODES, ...SCREEN_MODES]

export const MODE_ICONS: Record<LoginMode, ComponentType<{ size?: number }>> = {
  cashier: Calculator,
  kitchen: ChefHat,
  supplier: Warehouse,
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

/** Kassir va oshpaz yordamchisi filialni tanlaydi; ta'minotchi filialga bog'lanmagan. */
export function needsBranch(mode: LoginMode): boolean {
  return mode === 'cashier' || mode === 'kitchen'
}

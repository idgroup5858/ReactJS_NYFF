import { LANGS, type ID, type Lang } from '@/domain/types'
import { createStore, useStore } from './createStore'
import { onStorageChange, readJson, writeJson } from './storage'
import { SETTINGS_STORAGE_KEY } from './storageKeys'

/** Kassada kategoriyalar joyi: chap ustunda yoki tepada qator bo'lib. */
export type CategoryPosition = 'left' | 'top'

/**
 * Ko'rinish: `soft` — Yumshoq, `gomeal` — GoMeal andozasi (standart), `modern` — Zamonaviy (ikonkali kategoriyalar,
 * kulrang qutidagi taom rasmi). Hammasida qora header + sariq aksent.
 */
export const THEMES = ['soft', 'gomeal', 'modern'] as const
export type Theme = (typeof THEMES)[number]

/** Kategoriya ikonkalari (mavzudan alohida): chiziqli, rangli 3D (standart) yoki rasm. */
export const ICON_STYLES = ['line', '3d', 'photo'] as const
export type IconStyle = (typeof ICON_STYLES)[number]

/**
 * Taom va kategoriya rasmlari ramkada: `contain` — rasm butunligicha, atrofida bo'sh joy qolishi mumkin (standart;
 * shishalar, fonsiz PNG uchun); `cover` — ramkani to'ldiradi, chetlari qirqiladi.
 */
export const IMAGE_FITS = ['cover', 'contain'] as const
export type ImageFit = (typeof IMAGE_FITS)[number]

/** Ombor ro'yxatlari (qoldiqlar, mahsulotlar): kartochkalar to'ri yoki ixcham jadval. */
export const LIST_VIEWS = ['grid', 'list'] as const
export type ListView = (typeof LIST_VIEWS)[number]

/** Shu qurilmaning sozlamalari (localStorage) — kompyuter/planshet bo'yicha, xodim bo'yicha emas. */
export interface DeviceSettings {
  lang: Lang
  categoryPosition: CategoryPosition
  /** oxirgi tanlangan filial — kirish ekranida birinchi bo'lib turadi */
  lastBranchId: ID | null
  theme: Theme
  iconStyle: IconStyle
  imageFit: ImageFit
  /** admin / ombor chap menyusi faqat ikonkalar holatida */
  sidebarCollapsed: boolean
  /** kassadagi chap kategoriyalar menyusi faqat ikonkalar holatida */
  categoryRailCollapsed: boolean
  /** qoldiqlar va mahsulotlar sahifasining ko'rinishi */
  warehouseView: ListView
}

function sanitize(raw: unknown): DeviceSettings {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof DeviceSettings, unknown>>
  return {
    lang: LANGS.find((lang) => lang === value.lang) ?? 'uz',
    categoryPosition: value.categoryPosition === 'top' ? 'top' : 'left',
    lastBranchId: typeof value.lastBranchId === 'string' ? value.lastBranchId : null,
    theme: THEMES.find((theme) => theme === value.theme) ?? 'gomeal',
    iconStyle: ICON_STYLES.find((style) => style === value.iconStyle) ?? '3d',
    imageFit: IMAGE_FITS.find((fit) => fit === value.imageFit) ?? 'contain',
    sidebarCollapsed: value.sidebarCollapsed === true,
    categoryRailCollapsed: value.categoryRailCollapsed === true,
    warehouseView: LIST_VIEWS.find((view) => view === value.warehouseView) ?? 'grid',
  }
}

export const settingsStore = createStore<DeviceSettings>(sanitize(readJson(SETTINGS_STORAGE_KEY)))

onStorageChange(SETTINGS_STORAGE_KEY, () => settingsStore.set(sanitize(readJson(SETTINGS_STORAGE_KEY))))

export function useSettings(): DeviceSettings {
  return useStore(settingsStore)
}

function save(patch: Partial<DeviceSettings>): void {
  const next = { ...settingsStore.get(), ...patch }
  settingsStore.set(next)
  writeJson(SETTINGS_STORAGE_KEY, next)
}

export const setLang = (lang: Lang) => save({ lang })
export const setCategoryPosition = (categoryPosition: CategoryPosition) => save({ categoryPosition })
export const setLastBranch = (lastBranchId: ID) => save({ lastBranchId })
export const setTheme = (theme: Theme) => save({ theme })
export const setIconStyle = (iconStyle: IconStyle) => save({ iconStyle })
export const setImageFit = (imageFit: ImageFit) => save({ imageFit })
export const setSidebarCollapsed = (sidebarCollapsed: boolean) => save({ sidebarCollapsed })
export const setCategoryRailCollapsed = (categoryRailCollapsed: boolean) => save({ categoryRailCollapsed })
export const setWarehouseView = (warehouseView: ListView) => save({ warehouseView })

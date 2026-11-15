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

/**
 * Admin / ombor panelining rang rejimi: `light` — yorug' (standart), `dark` — qorong'i (VS Code "Dark Modern" ranglari).
 * Faqat back-office'ga qo'llanadi — kassa, kiosk, oshxona, TV doim yorug'.
 */
export type ColorMode = 'light' | 'dark'

/** Kategoriya ikonkalari (mavzudan alohida): rangli 3D (standart) yoki rasm. */
export const ICON_STYLES = ['3d', 'photo'] as const
export type IconStyle = (typeof ICON_STYLES)[number]

/**
 * Taom va kategoriya rasmlari ramkada: `contain` — rasm butunligicha, atrofida bo'sh joy qolishi mumkin (standart;
 * shishalar, fonsiz PNG uchun); `cover` — ramkani to'ldiradi, chetlari qirqiladi.
 */
export const IMAGE_FITS = ['cover', 'contain'] as const
export type ImageFit = (typeof IMAGE_FITS)[number]

/** Ombor ro'yxatlari (qoldiqlar, mahsulotlar): kartochkalar to'ri yoki ixcham jadval (standart). */
export const LIST_VIEWS = ['grid', 'list'] as const
export type ListView = (typeof LIST_VIEWS)[number]

/**
 * Kassa: taom kartochkalari va ulardan pastdagi tugmalar o'lchami — POS monitori kichik bo'lsa kichraytiriladi. `1` — asl
 * o'lcham va eng kattasi (kattalashtirish yo'q).
 */
export const MENU_SCALES = [0.6, 0.7, 0.8, 0.9, 1] as const
export type MenuScale = (typeof MENU_SCALES)[number]

/** Ta'minotchining ombor tablari (planshet: chap menyu o'rniga tepada) — tartibi ekrandagidek. */
export const WAREHOUSE_TABS = ['stock', 'purchase', 'transfer', 'ingredients'] as const
export type WarehouseTab = (typeof WAREHOUSE_TABS)[number]

/** Ko'chirish formasi ochilgandagi yo'nalish; `null` — avtomatik (markaziy → birinchi boshqa ombor). */
export interface TransferDefaults {
  from: ID | null
  to: ID | null
}

/** Shu kompyuterda oxirgi muvaffaqiyatli kirilgan ish joyi (`cashier` / `kitchen` / `supplier`) va filiali. */
export interface LastLogin {
  mode: string
  branchId: ID | null
}

/** Shu qurilmaning sozlamalari (localStorage) — kompyuter/planshet bo'yicha, xodim bo'yicha emas. */
export interface DeviceSettings {
  lang: Lang
  categoryPosition: CategoryPosition
  /** oxirgi tanlangan filial — kirish ekranida "Oxirgi" belgisi bilan turadi */
  lastBranchId: ID | null
  /**
   * kassa va oshpaz yordamchisi alohida kompyuterlarda — kirish ekrani ish joyi va filialni so'ramay, to'g'ridan-to'g'ri
   * shu yerning xodimlar ro'yxatidan ochiladi
   */
  lastLogin: LastLogin | null
  theme: Theme
  /** admin / ombor: yorug' yoki qorong'i */
  colorMode: ColorMode
  iconStyle: IconStyle
  imageFit: ImageFit
  /** admin / ombor chap menyusi faqat ikonkalar holatida */
  sidebarCollapsed: boolean
  /** kassadagi chap kategoriyalar menyusi faqat ikonkalar holatida */
  categoryRailCollapsed: boolean
  /** qoldiqlar va mahsulotlar sahifasining ko'rinishi */
  warehouseView: ListView
  /** ta'minotchi: tepadagi qatorda yashirilgan ombor tablari (kamida bittasi ko'rinadi) */
  hiddenWarehouseTabs: WarehouseTab[]
  /** ombor: ko'chirish formasi shu yo'nalish bilan ochiladi */
  transferDefaults: TransferDefaults
  /** kassa: internet uzilsa shu kompyuterdagi offline kassaga o'tadi (offline server o'rnatilgan bo'lsa) */
  offlineEnabled: boolean
  /** offline server manzili (kassa kompyuterida, `NestJS_NYFF` — `node dist/offline/main`) */
  offlineUrl: string
  /**
   * kassa: yangi buyurtma ovozining balandligi (0.3…1). O'chirib bo'lmaydi — kassir o'chirib qo'yib, yana buyurtmani
   * ko'rmay qolmasin
   */
  alertVolume: number
  /** kassa (online va offline): taomlar to'ri va undan pastdagi tugmalar o'lchami */
  menuScale: MenuScale
}

/** Offline server standart manzili (`OFFLINE_PORT=3100`). */
export const DEFAULT_OFFLINE_URL = 'http://localhost:3100'

export const MIN_ALERT_VOLUME = 0.3
const DEFAULT_ALERT_VOLUME = 0.8

function clampVolume(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return DEFAULT_ALERT_VOLUME
  return Math.min(1, Math.max(MIN_ALERT_VOLUME, raw))
}

function sanitizeLastLogin(raw: unknown): LastLogin | null {
  if (!raw || typeof raw !== 'object') return null
  const { mode, branchId } = raw as Record<string, unknown>
  if (typeof mode !== 'string' || !mode) return null
  return { mode, branchId: typeof branchId === 'string' ? branchId : null }
}

function sanitizeHiddenTabs(raw: unknown): WarehouseTab[] {
  if (!Array.isArray(raw)) return []
  const hidden = WAREHOUSE_TABS.filter((tab) => raw.includes(tab))
  // hammasi yashirilgan (qo'lda tahrirlangan) — bo'sh qator qolmasin
  return hidden.length < WAREHOUSE_TABS.length ? hidden : []
}

function sanitizeTransferDefaults(raw: unknown): TransferDefaults {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const id = (field: unknown) => (typeof field === 'string' && field ? field : null)
  return { from: id(value.from), to: id(value.to) }
}

function sanitize(raw: unknown): DeviceSettings {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof DeviceSettings, unknown>>
  return {
    lang: LANGS.find((lang) => lang === value.lang) ?? 'uz',
    categoryPosition: value.categoryPosition === 'top' ? 'top' : 'left',
    lastBranchId: typeof value.lastBranchId === 'string' ? value.lastBranchId : null,
    lastLogin: sanitizeLastLogin(value.lastLogin),
    theme: THEMES.find((theme) => theme === value.theme) ?? 'gomeal',
    colorMode: value.colorMode === 'dark' ? 'dark' : 'light',
    iconStyle: ICON_STYLES.find((style) => style === value.iconStyle) ?? '3d',
    imageFit: IMAGE_FITS.find((fit) => fit === value.imageFit) ?? 'contain',
    sidebarCollapsed: value.sidebarCollapsed === true,
    categoryRailCollapsed: value.categoryRailCollapsed === true,
    warehouseView: LIST_VIEWS.find((view) => view === value.warehouseView) ?? 'list',
    hiddenWarehouseTabs: sanitizeHiddenTabs(value.hiddenWarehouseTabs),
    transferDefaults: sanitizeTransferDefaults(value.transferDefaults),
    offlineEnabled: value.offlineEnabled === true,
    offlineUrl: typeof value.offlineUrl === 'string' && value.offlineUrl.trim() ? value.offlineUrl.trim() : DEFAULT_OFFLINE_URL,
    alertVolume: clampVolume(value.alertVolume),
    menuScale: MENU_SCALES.find((scale) => scale === value.menuScale) ?? 1,
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
export const setLastLogin = (lastLogin: LastLogin) => save({ lastLogin })
export const setTheme = (theme: Theme) => save({ theme })
export const setColorMode = (colorMode: ColorMode) => save({ colorMode })
export const setIconStyle = (iconStyle: IconStyle) => save({ iconStyle })
export const setImageFit = (imageFit: ImageFit) => save({ imageFit })
export const setSidebarCollapsed = (sidebarCollapsed: boolean) => save({ sidebarCollapsed })
export const setCategoryRailCollapsed = (categoryRailCollapsed: boolean) => save({ categoryRailCollapsed })
export const setWarehouseView = (warehouseView: ListView) => save({ warehouseView })
/** Oxirgi ko'rinib turgan tab yashirilmaydi. */
export function setWarehouseTabVisible(tab: WarehouseTab, visible: boolean): void {
  const others = settingsStore.get().hiddenWarehouseTabs.filter((hidden) => hidden !== tab)
  const next = visible ? others : [...others, tab]
  if (next.length >= WAREHOUSE_TABS.length) return
  save({ hiddenWarehouseTabs: WAREHOUSE_TABS.filter((value) => next.includes(value)) })
}
export const setTransferDefaults = (transferDefaults: TransferDefaults) => save({ transferDefaults })
export const setOfflineEnabled = (offlineEnabled: boolean) => save({ offlineEnabled })
export const setOfflineUrl = (offlineUrl: string) => save({ offlineUrl })
export const setAlertVolume = (alertVolume: number) => save({ alertVolume: clampVolume(alertVolume) })
export const setMenuScale = (menuScale: MenuScale) => save({ menuScale })

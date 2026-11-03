import { readJson, removeKey, writeJson } from './storage'
import { screenCodeStorageKey } from './storageKeys'

/** Kod bilan ochiladigan zal ekranlari: TV (navbat) va kiosk (buyurtma) — har filialda har biriga alohida kod. */
export type ScreenKind = 'tv' | 'kiosk'

/** Kod — 8 raqam (admin "Filiallar" → "TV kodi" / "Kiosk kodi"). */
export const SCREEN_CODE_LENGTH = 8

const CODE_PATTERN = new RegExp(`^\\d{${SCREEN_CODE_LENGTH}}$`)

/**
 * Shu brauzerda saqlangan filial kodi (`localStorage`, muddatsiz): ekranda bir marta kiritiladi; admin "Navbat ekrani" /
 * "Kiosk" ni ochganda — admin panel o'zi yozadi (admin kod termaydi).
 */
export function readScreenCode(kind: ScreenKind, branchId: string): string | null {
  const value = readJson(screenCodeStorageKey(kind, branchId))
  return typeof value === 'string' && CODE_PATTERN.test(value) ? value : null
}

export function rememberScreenCode(kind: ScreenKind, branchId: string, code: string): void {
  if (CODE_PATTERN.test(code)) writeJson(screenCodeStorageKey(kind, branchId), code)
}

/** Kod endi ishlamaydi (admin yangilagan) — ekran yana so'raydi. */
export function forgetScreenCode(kind: ScreenKind, branchId: string): void {
  removeKey(screenCodeStorageKey(kind, branchId))
}

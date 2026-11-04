import { ApiError } from '@/api/http'
import { AppError, type ErrorCode } from '@/domain/errors'
import type { Lang, LocalizedText } from '@/domain/types'
import { settingsStore, useSettings } from '@/store/settingsStore'
import { en } from './en'
import { ru } from './ru'
import { uz, type Dict } from './uz'

const DICTS: Record<Lang, Dict> = { uz, ru, en }

export const LANG_LABELS: Record<Lang, string> = { uz: "O'zbekcha", ru: 'Русский', en: 'English' }

export function useT(): Dict {
  return DICTS[useSettings().lang]
}

/** Uch tildagi nomdan joriy tildagisi; bo'sh bo'lsa — o'zbekchasi. */
export function useLocalize(): (text: LocalizedText) => string {
  const { lang } = useSettings()
  return (text) => text[lang] || text.uz
}

/** React tashqarisida (masalan, catch ichida) xato matni: server xato kodi bo'yicha joriy tilda. */
export function errorMessage(error: unknown): string {
  const dict = DICTS[settingsStore.get().lang]
  // qaysi filialda ochiq smena qolgani — kassir o'sha yerga borsin yoki adminga aytsin
  if (error instanceof ApiError && error.code === 'shift_open_elsewhere' && error.detail) return dict.shiftOpenAt(error.detail)
  // tabel raqami kimda ekani — admin o'sha xodimni tekshirsin
  if (error instanceof ApiError && error.code === 'employee_no_taken' && error.detail) return dict.employeeNoTakenBy(error.detail)
  // `detail` — qolgan urinishlar: oxirgisida ogohlantiramiz (keyingi xato — 5 daqiqa blok)
  if (error instanceof ApiError && error.code === 'wrong_pin' && error.detail === '1') return dict.wrongPinLastTry
  if (error instanceof ApiError && error.code in dict.errors) return dict.errors[error.code as ErrorCode]
  if (error instanceof AppError) return dict.errors[error.code]
  console.error(error)
  return dict.unknownError
}

/** PIN pad uchun xato: matn va blok bo'lsa — necha soniya kutish (`PinPad` sanaydi, tugmalar o'chadi). */
export interface PinFailure {
  message: string
  lockSeconds?: number
}

/** Server blok vaqtini aytmasa (IP bo'yicha chegara — PIN bilan kirish daqiqasiga 20 ta) — shuncha soniya kutiladi. */
const IP_LOCK_SECONDS = 60

/**
 * PIN kiritishdagi xato (kirish, kassa bloki, offline kassa): `too_many_attempts` da `detail` — blokda qolgan vaqt
 * (`"273s"`), yo'q bo'lsa — IP chegarasi (1 daqiqa).
 */
export function pinFailure(error: unknown): PinFailure {
  const message = errorMessage(error)
  if (!(error instanceof ApiError) || error.code !== 'too_many_attempts') return { message }
  const seconds = /^(\d+)s$/.exec(error.detail ?? '')
  return { message, lockSeconds: seconds ? Number(seconds[1]) : IP_LOCK_SECONDS }
}

export function currentDict(): Dict {
  return DICTS[settingsStore.get().lang]
}

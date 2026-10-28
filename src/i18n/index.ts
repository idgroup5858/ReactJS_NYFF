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
  if (error instanceof ApiError && error.code in dict.errors) return dict.errors[error.code as ErrorCode]
  if (error instanceof AppError) return dict.errors[error.code]
  console.error(error)
  return dict.unknownError
}

export function currentDict(): Dict {
  return DICTS[settingsStore.get().lang]
}

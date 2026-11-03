/** Foydalanuvchiga ko'rsatiladigan xatolar — matni i18n dagi `errors[code]` dan olinadi. */
export type ErrorCode =
  | 'not_found'
  | 'wrong_pin'
  | 'invalid_pin'
  | 'user_inactive'
  | 'empty_order'
  | 'product_unavailable'
  | 'invalid_qty'
  | 'invalid_price'
  | 'invalid_status'
  | 'already_decided'
  | 'same_warehouse'
  | 'shift_not_open'
  | 'name_required'
  | 'insufficient_stock'
  | 'branch_required'
  | 'invalid_amount'
  | 'self_action'
  | 'recipe_required'
  | 'phone_required'
  | 'address_required'
  | 'zone_too_small'
  | 'invalid_location'
  | 'forbidden'
  | 'invalid_image'
  | 'surname_required'
  | 'in_use'
  // ── offline kassa (kassa kompyuteridagi server): oxirgi raqam aniq emas ──
  | 'number_required'
  // ── faqat backend (NestJS_NYFF `src/common/errors.ts`) ──
  | 'unauthorized'
  | 'invalid_input'
  | 'too_many_attempts'
  | 'branch_closed'
  | 'location_required'
  // ── kuryer (asosan Android ilovasida; vebda — xodim kuryer ishiga aralashganda) ──
  | 'off_duty'
  | 'already_taken'
  | 'other_branch'
  | 'courier_busy'
  | 'not_ready'
  // ── admin va kuryer email va paroli (admin "Xodimlar" da ochadi) ──
  | 'wrong_login'
  | 'wrong_password'
  | 'invalid_email'
  | 'invalid_password'
  | 'email_taken'
  // ── zal ekranlari kodi — admin "Filiallar" → "TV kodi" / "Kiosk kodi" ──
  | 'wrong_tv_code'
  | 'wrong_kiosk_code'
  // ── AI yordamchi va Telegram bot (admin "AI" bo'limi) ──
  | 'ai_not_configured'
  | 'ai_failed'
  | 'telegram_token_invalid'
  | 'telegram_unreachable'
  | 'telegram_not_connected'
  /** server javob bermadi (tarmoq / server o'chiq) */
  | 'network'

export class AppError extends Error {
  readonly code: ErrorCode

  constructor(code: ErrorCode, message: string = code) {
    super(message)
    this.name = 'AppError'
    this.code = code
  }
}

export function fail(code: ErrorCode, detail?: string): never {
  throw new AppError(code, detail ? `${code}: ${detail}` : code)
}

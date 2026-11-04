/** Foydalanuvchiga ko'rsatiladigan xatolar — matni i18n dagi `errors[code]` dan olinadi. */
export type ErrorCode =
  | 'not_found'
  | 'wrong_pin'
  | 'invalid_pin'
  | 'user_inactive'
  | 'empty_order'
  | 'product_unavailable'
  /** faqat zalda beriladigan taom (choynakdagi choy) olib ketish / dostavka buyurtmasida */
  | 'dine_in_only'
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
  | 'image_in_use'
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
  /** kassirning boshqa filialda ochiq smenasi bor (`detail` — o'sha filial nomi; matni — `errors.shiftOpenAt`) */
  | 'shift_open_elsewhere'
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
  // ── FaceID (filial terminali → HR tizimi → markaz; admin "Filiallar" → "FaceID tekshiruvi") ──
  /** smena ochish / kassaga kirish — terminalda «Kirish» kerak (yoki boshqa filialda «Kirish» bosilgan) */
  | 'faceid_checkin_required'
  /** smenani topshirish — terminalda «Chiqish» kerak */
  | 'faceid_checkout_required'
  /** tabel raqami shu filialda boshqa kassirda (`detail` — kimda) */
  | 'employee_no_taken'
  | 'invalid_employee_no'
  /** Telegram bot ulanmagan yoki hech bir admin chatiga yetmadi — ruxsat so'rab bo'lmaydi */
  | 'faceid_request_unavailable'
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

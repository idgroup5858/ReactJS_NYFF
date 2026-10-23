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

import type { LocalizedText, MenuProduct } from '@/domain/types'

/**
 * Kioskda ko'rsatiladigan tarkib: retseptdagi mahsulotlar (qadoq, yog', ziravorlarsiz — server ajratadi), birinchi
 * [limit] tasi.
 */
export function compositionText(product: Pick<MenuProduct, 'composition'>, localize: (text: LocalizedText) => string, limit = 5): string {
  return product.composition.slice(0, limit).map(localize).join(', ')
}

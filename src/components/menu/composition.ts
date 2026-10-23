import type { Db, LocalizedText, Product } from '@/domain/types'

/** Kioskda ko'rsatiladigan tarkib: retseptdagi mahsulotlar (qadoq, yog', ziravorlarsiz), birinchi [limit] tasi. */
export function compositionText(db: Db, product: Product, localize: (text: LocalizedText) => string, limit = 5): string {
  const names = product.recipe.flatMap((line) => {
    const ingredient = db.ingredients.find((i) => i.id === line.ingredientId)
    return ingredient && ingredient.group !== 'packaging' && ingredient.group !== 'other' ? [localize(ingredient.name)] : []
  })
  return names.slice(0, limit).join(', ')
}

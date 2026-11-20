import { createContext, useContext, useEffect, useRef } from 'react'

/** Mini app ichidagi o'tishlar — mini app qaysi yo'lga ulangani (`/telegram`) sahifalarga bog'liq emas. */
export interface Nav {
  /** sahifa: `''` — bosh sahifa, `checkout`, `order/<id>` … */
  go(path: string, options?: { replace?: boolean }): void
  /** oldingi sahifa; tarix bo'lmasa (to'g'ridan-to'g'ri ochilgan) — bosh sahifa */
  back(): void
  /** bosh sahifa — orqadagi sahifalar tarixdan olib tashlanadi (Android `popUpTo<HomeRoute>`) */
  home(): void
  /** bosh sahifagacha qaytib, [path] ochiladi — undan "orqaga" bosh sahifaga (buyurtma berilgach, to'langach) */
  reset(path: string): void
  /** "Orqaga" (sarlavhadagi va Telegram'dagi) o'rniga [handler]; qaytaradi — bekor qilish */
  intercept(handler: () => void): () => void
}

export const NavContext = createContext<Nav | null>(null)

export function useNav(): Nav {
  const nav = useContext(NavContext)
  if (!nav) throw new Error('useNav — TelegramApp ichida ishlatiladi')
  return nav
}

/** Sahifa ochiq ekan "Orqaga" ni o'zi hal qiladi ([handler] `null` — odatdagidek). */
export function useBackHandler(handler: (() => void) | null): void {
  const nav = useNav()
  const latest = useRef(handler)
  useEffect(() => {
    latest.current = handler
  })
  const active = handler != null
  useEffect(() => {
    if (!active) return
    return nav.intercept(() => latest.current?.())
  }, [nav, active])
}

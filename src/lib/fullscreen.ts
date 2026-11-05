import { useEffect, useSyncExternalStore } from 'react'

/**
 * Sahifaning to'liq ekrani (Fullscreen API) — F11 dagidek, lekin Esc yoki kassadagi tugma bilan chiqiladi. Brauzer uni
 * faqat foydalanuvchi bosgandan keyin bir necha soniya ichida ruxsat beradi; ruxsat bo'lmasa — hech narsa bo'lmaydi.
 * F11 dagi brauzer to'liq ekrani bu yerda ko'rinmaydi (sahifa uni bilmaydi).
 */

const subscribe = (onChange: () => void) => {
  document.addEventListener('fullscreenchange', onChange)
  return () => document.removeEventListener('fullscreenchange', onChange)
}
const isFullscreen = () => document.fullscreenElement !== null

/** To'liq ekrandami — Esc yoki brauzer o'zi chiqarsa ham yangilanadi. */
export function useFullscreen(): boolean {
  return useSyncExternalStore(subscribe, isFullscreen)
}

/**
 * To'liq ekranga: kassir / oshpaz yordamchisi PIN bilan kirganda, TV / kiosk filiali tanlanganda yoki kodi kiritilganda
 * (bosilgani — brauzer uchun ruxsat).
 */
export function enterFullscreen(): void {
  if (!document.fullscreenEnabled || document.fullscreenElement) return
  document.documentElement.requestFullscreen().catch(() => undefined)
}

export function toggleFullscreen(): void {
  if (!document.fullscreenElement) return enterFullscreen()
  exitFullscreen()
}

export function exitFullscreen(): void {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined)
}

/**
 * Zal ekrani (TV, kiosk) — mijozdan manzil qatori va brauzer menyusi yashirin: to'liq ekranda bo'lmasa (o'chib-yongan,
 * Esc bosilgan), sahifadagi har bosishda yana to'liq ekranga o'tadi; o'ng tugma / barmoq bilan bosib turish menyusi
 * (orqaga, "Inspect") ochilmaydi. [keep] `false` — xodim kod bilan chiqargan: sahifa qayta yuklanguncha qaytarilmaydi.
 * Brauzerning o'z qismini (manzil qatori) bosish sahifaga kelmaydi — Esc bosgan xodim manzilni bemalol yozadi.
 */
export function useScreenLock(keep: boolean): void {
  useEffect(() => {
    const noMenu = (event: Event) => event.preventDefault()
    document.addEventListener('contextmenu', noMenu)
    return () => document.removeEventListener('contextmenu', noMenu)
  }, [])

  useEffect(() => {
    if (!keep) return
    // `click` — bosish tugagach (barmoq ham, sichqoncha ham): brauzer ruxsati shu paytda bor
    const onClick = () => enterFullscreen()
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [keep])
}

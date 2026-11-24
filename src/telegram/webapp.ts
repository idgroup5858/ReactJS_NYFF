/*
 * Telegram ichida ochilganda — faqat ko'rinish qulayliklari (Telegram Web Apps SDK): to'liq balandlik, pastga surib
 * yopilib ketmasligi, "Orqaga" tugmasi (Android'da telefonning orqaga tugmasi ham shu), sarlavha rangi, to'lov oynasini
 * ochish. Akkaunt, `initData`, bot — ishlatilmaydi. Oddiy brauzerda skript umuman yuklanmaydi va sahifa shunday ishlaydi.
 */

interface TelegramWebApp {
  platform: string
  version: string
  ready(): void
  expand(): void
  isVersionAtLeast(version: string): boolean
  disableVerticalSwipes?: () => void
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
  openLink(url: string): void
  BackButton: {
    show(): void
    hide(): void
    onClick(callback: () => void): void
    offClick(callback: () => void): void
  }
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
    TelegramWebviewProxy?: unknown
  }
}

const SDK_URL = 'https://telegram.org/js/telegram-web-app.js'

/** Telegram ochganmi: manzilda ishga tushirish parametrlari yoki ilova ichidagi ko'prik bor. */
function launchedFromTelegram(): boolean {
  if (/tgWebApp(Data|Platform|Version)=/.test(window.location.hash)) return true
  if (window.TelegramWebviewProxy) return true
  try {
    return sessionStorage.getItem('__telegram__initParams') != null
  } catch {
    return false
  }
}

let webApp: TelegramWebApp | null = null
let loading: Promise<TelegramWebApp | null> | null = null

/**
 * SDK ni yuklash (bir marta). Modul yuklanishi bilan chaqiriladi — manzildagi ishga tushirish parametrlari (`#tgWebApp…`)
 * ichki navigatsiyadan oldin o'qilsin.
 */
export function loadTelegram(): Promise<TelegramWebApp | null> {
  if (loading) return loading
  loading = new Promise((resolve) => {
    if (!launchedFromTelegram()) return resolve(null)
    const ready = () => {
      const app = window.Telegram?.WebApp
      webApp = app && app.platform !== 'unknown' ? app : null
      if (webApp) {
        webApp.ready()
        webApp.expand()
        if (webApp.isVersionAtLeast('7.7')) webApp.disableVerticalSwipes?.()
      }
      resolve(webApp)
    }
    if (window.Telegram?.WebApp) return ready()
    const script = document.createElement('script')
    script.src = SDK_URL
    script.async = true
    script.onload = ready
    // Telegram serveri ochilmasa ham mini app ishlayveradi
    script.onerror = () => resolve(null)
    document.head.appendChild(script)
  })
  return loading
}

/** Sarlavha va fon rangi (Telegram 6.1+). */
export function paintTelegram(header: string, background: string): void {
  if (!webApp?.isVersionAtLeast('6.1')) return
  try {
    webApp.setHeaderColor?.(header)
    webApp.setBackgroundColor?.(background)
  } catch {
    // eski mijoz rangni qabul qilmadi
  }
}

/** "Orqaga" tugmasi: [onBack] — ko'rsatiladi, `null` — yashiriladi. Qaytaradi — tozalash. */
export function telegramBackButton(onBack: (() => void) | null): () => void {
  const button = webApp?.isVersionAtLeast('6.1') ? webApp.BackButton : null
  if (!button) return () => {}
  if (!onBack) {
    button.hide()
    return () => {}
  }
  button.onClick(onBack)
  button.show()
  return () => button.offClick(onBack)
}

export const insideTelegram = () => webApp != null

/** Mini app ramka (iframe) ichida — Telegram Web (web.telegram.org). */
function framed(): boolean {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}

/**
 * Bank sahifasi (to'lov, karta ulash) — foydalanuvchi bosganda chaqiriladi. Telegram ilovasida (telefon, kompyuter) —
 * shu oynaning o'zida: qaytish yo'li [returnTo] (shu domendagi `/telegram/…`) `sessionStorage` ga yoziladi, bank
 * to'lovdan keyin serverning qaytish sahifasiga yuboradi, u mijozni [returnTo] ga o'tkazadi (NestJS_NYFF API.md 5.7).
 * Telegram Web'da (ramka — bank sahifasi unda ochilmasligi mumkin) va oddiy brauzerda — alohida oynada ([openExternal]).
 */
export function openBankPage(url: string, id: string, returnTo: string): void {
  if (!webApp || framed()) return openExternal(url)
  try {
    sessionStorage.setItem(`nyt.return.${id}`, returnTo)
  } catch {
    // xotira yopiq — qaytib kelolmaydi, alohida oynada
    return openExternal(url)
  }
  // bank sahifasida bizning "Orqaga" ishlamaydi — ko'rinmasin (qaytganda mini app o'zi qayta qo'yadi)
  if (webApp.isVersionAtLeast('6.1')) webApp.BackButton.hide()
  window.location.assign(url)
}

/**
 * Tashqi sahifani (to'lov oynasi) ochish — foydalanuvchi bosganda chaqiriladi. Telegram'da — uning brauzerida, mini app
 * yopilmaydi; oddiy brauzerda — yangi tab; tab ochilmasa (bloklangan) — shu oynada (qaytganda to'lov tekshiriladi).
 */
export function openExternal(url: string): void {
  if (webApp) {
    webApp.openLink(url)
    return
  }
  const opened = window.open(url, '_blank')
  if (opened) opened.opener = null
  else window.location.href = url
}

import type { ID, Menu } from '@/domain/types'
import { parseTickets, type TicketsState } from './useTickets'

/**
 * Online kassa ↔ offline kassa (kassa kompyuteridagi server, boshqa manzil — `localStorage` umumiy emas): ma'lumot
 * manzilning `#` qismida o'tadi (serverga yuborilmaydi), qabul qilgan sahifa uni darhol o'chiradi.
 *
 *  - online → offline (`/offline#h=…`): kim ishlayotgan edi, oxirgi raqam, ochiq cheklar, menyu;
 *  - offline → online (`/kassa#t=…`): ochiq cheklar.
 */

export interface Handover {
  v: 1
  branchId: ID
  branchName: string
  /** chekda chiqadi */
  branchAddress: string
  cashier: { id: ID; name: string; surname: string }
  /** kassa bloklangan edi — offline'da kassir PIN bilan kiradi */
  locked: boolean
  /** online kassa sayti (`window.location.origin` + base) — "Online rejimga qaytish" shu yerga */
  returnUrl: string
  /** online kassa ko'rgan bugungi eng katta buyurtma raqami */
  lastNumber: number
  tickets: TicketsState | null
  menu: Menu | null
}

const HANDOVER_PARAM = 'h'
const TICKETS_PARAM = 't'

function encode(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  let binary = ''
  // katta menyu — bo'lib (argumentlar soni chegarasi)
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decode(text: string): unknown {
  try {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))))
  } catch {
    return null
  }
}

/** `#h=…` / `#t=…` ni o'qib, manzildan o'chiradi (yangilanganda qayta ishlanmasin). */
function takeFromHash(param: string): unknown {
  const params = new URLSearchParams(window.location.hash.slice(1))
  const value = params.get(param)
  if (value === null) return null
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
  return decode(value)
}

/**
 * Manzildan bir marta o'qiladi va sahifa yuklanguncha eslab qolinadi — React ikki marta chizsa (StrictMode) ham bir xil
 * qiymat; ishlatib bo'lingach [release] bilan unutiladi (sahifaga qayta kirilganda qayta qo'llanmasin).
 */
function once<T>(read: () => T | null) {
  let value: T | null | undefined
  return {
    take: (): T | null => {
      if (value === undefined) value = read()
      return value
    },
    release: () => {
      value = null
    },
  }
}

const handoverFromHash = once<Handover>(() => {
  const value = takeFromHash(HANDOVER_PARAM) as Handover | null
  if (!value || value.v !== 1 || typeof value.branchId !== 'string' || !value.cashier || typeof value.cashier.id !== 'string') return null
  return {
    ...value,
    branchName: typeof value.branchName === 'string' ? value.branchName : '',
    branchAddress: typeof value.branchAddress === 'string' ? value.branchAddress : '',
    locked: value.locked !== false,
    returnUrl: typeof value.returnUrl === 'string' && /^https?:\/\//.test(value.returnUrl) ? value.returnUrl : '',
    lastNumber: Number.isInteger(value.lastNumber) && value.lastNumber >= 0 ? value.lastNumber : 0,
    tickets: parseTickets(value.tickets),
    menu: value.menu && Array.isArray(value.menu.categories) && Array.isArray(value.menu.products) ? value.menu : null,
  }
})

const ticketsFromHash = once<TicketsState>(() => parseTickets(takeFromHash(TICKETS_PARAM)))

export function offlineKassaUrl(base: string, handover: Handover): string {
  return `${base.replace(/\/+$/, '')}/offline#${HANDOVER_PARAM}=${encode(handover)}`
}

/** Offline kassa: online kassadan kelgan ma'lumot (bo'lsa). */
export const takeHandover = handoverFromHash.take
export const releaseHandover = handoverFromHash.release

/** [kassaUrl] — online kassa sayti (online kassadan o'tilganda o'sha sahifaning manzili). */
export function onlineKassaUrl(kassaUrl: string, tickets: TicketsState | null): string {
  const base = `${kassaUrl.replace(/\/+$/, '')}/kassa`
  return tickets ? `${base}#${TICKETS_PARAM}=${encode(tickets)}` : base
}

/** Online kassa: offline kassadan qaytgan ochiq cheklar (bo'lsa). */
export const takeTickets = ticketsFromHash.take
export const releaseTickets = ticketsFromHash.release

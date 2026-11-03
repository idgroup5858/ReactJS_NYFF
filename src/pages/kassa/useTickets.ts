import { useEffect, useState } from 'react'
import { ORDER_TYPES, type OrderType } from '@/domain/types'
import type { CartLine } from '@/lib/cart'
import { readJson, writeJson } from '@/store/storage'

/** Bir vaqtda ochiq cheklar chegarasi — savat paneliga sig'sin. */
export const MAX_TICKETS = 8

/** Kassadagi ochiq chek (hali to'lanmagan savat): navbat ko'payganda kassir joriysini yopmasdan yangisini ochadi. */
export interface Ticket {
  id: string
  /** ko'rinadigan raqam ("Chek 2"): ochiqlar orasidagi eng kichik bo'sh son — yopilgan raqam qayta beriladi */
  no: number
  lines: CartLine[]
  orderType: OrderType
  orderNote: string
  /**
   * To'lov yuborilgan, lekin javob kelmagan bo'lishi mumkin (internet uzildi): qayta yuborilganda (offline kassadan ham)
   * shu id bilan — buyurtma ikki marta yozilmaydi. Savat o'zgarsa tushib qoladi.
   */
  orderId?: string
}

export type TicketsState = { tickets: Ticket[]; activeId: string }

const randomPart = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (byte) => byte.toString(16).padStart(2, '0')).join('')
const emptyTicket = (no: number): Ticket => ({ id: `ticket_${randomPart()}`, no, lines: [], orderType: 'dine_in', orderNote: '' })

function freeNo(tickets: Ticket[]): number {
  let no = 1
  while (tickets.some((ticket) => ticket.no === no)) no += 1
  return no
}

function fresh(): TicketsState {
  const first = emptyTicket(1)
  return { tickets: [first], activeId: first.id }
}

const isLine = (value: unknown): value is CartLine => {
  const line = value as CartLine | null
  return !!line && typeof line.key === 'string' && typeof line.productId === 'string' && Number.isInteger(line.qty) && line.qty > 0
}

const isTicket = (value: unknown): value is Ticket => {
  const ticket = value as Ticket | null
  return (
    !!ticket &&
    typeof ticket.id === 'string' &&
    Number.isInteger(ticket.no) &&
    Array.isArray(ticket.lines) &&
    ticket.lines.every(isLine) &&
    ORDER_TYPES.includes(ticket.orderType) &&
    typeof ticket.orderNote === 'string' &&
    (ticket.orderId === undefined || typeof ticket.orderId === 'string')
  )
}

/** Saqlangan yoki boshqa kassadan (online ↔ offline) kelgan cheklar — shakli to'g'ri bo'lsa. */
export function parseTickets(value: unknown): TicketsState | null {
  const state = value as TicketsState | null
  if (!state || !Array.isArray(state.tickets) || state.tickets.length === 0 || state.tickets.length > MAX_TICKETS) return null
  if (!state.tickets.every(isTicket)) return null
  const activeId = state.tickets.some((ticket) => ticket.id === state.activeId) ? state.activeId : state.tickets[0].id
  return { tickets: state.tickets, activeId }
}

/** Ichida taom bor chek bormi (bo'sh cheklarni boshqa kassaga uzatish shart emas). */
export const hasLines = (state: TicketsState): boolean => state.tickets.some((ticket) => ticket.lines.length > 0)

/**
 * Kassaning ochiq cheklari. Doim kamida bitta chek bor; to'langan yoki yopilgan chek ro'yxatdan chiqadi (oxirgisi
 * bo'lsa — o'rniga bo'sh "Chek 1"). [storageKey] berilsa — brauzerda saqlanadi (sahifa yangilansa ham yo'qolmaydi);
 * [initial] — boshqa kassadan uzatilgan cheklar (online ↔ offline), saqlanganlari o'rniga.
 */
export function useTickets(storageKey: string | null, initial: TicketsState | null = null) {
  const [state, setState] = useState<TicketsState>(
    () => initial ?? (storageKey ? parseTickets(readJson(storageKey)) : null) ?? fresh(),
  )
  const active = state.tickets.find((ticket) => ticket.id === state.activeId) ?? state.tickets[0]

  useEffect(() => {
    if (storageKey) writeJson(storageKey, state)
  }, [storageKey, state])

  /** Faol chekni o'zgartiradi (savat qatorlari, buyurtma turi, izoh). Savat o'zgarsa yuborilgan buyurtma id'si tushadi. */
  const updateActive = (change: (ticket: Ticket) => Partial<Ticket>) =>
    setState((s) => ({
      ...s,
      tickets: s.tickets.map((ticket) => {
        if (ticket.id !== s.activeId) return ticket
        const patch = change(ticket)
        const { orderId: _sent, ...rest } = ticket
        return 'orderId' in patch ? { ...ticket, ...patch } : { ...rest, ...patch }
      }),
    }))

  /** To'lov yuborilayotgan chekka buyurtma id'si (javob kelmasa qayta yuborish uchun). */
  const setOrderId = (ticketId: string, orderId: string) =>
    setState((s) => ({ ...s, tickets: s.tickets.map((ticket) => (ticket.id === ticketId ? { ...ticket, orderId } : ticket)) }))

  const select = (id: string) => setState((s) => ({ ...s, activeId: id }))

  const add = () =>
    setState((s) => {
      if (s.tickets.length >= MAX_TICKETS) return s
      const ticket = emptyTicket(freeNo(s.tickets))
      return { tickets: [...s.tickets, ticket].sort((a, b) => a.no - b.no), activeId: ticket.id }
    })

  /** Chekni yopadi (to'langach yoki kassir yopganda); faol chek yopilsa — yonidagisi faol bo'ladi. */
  const close = (id: string) =>
    setState((s) => {
      const index = s.tickets.findIndex((ticket) => ticket.id === id)
      if (index === -1) return s
      const rest = s.tickets.filter((ticket) => ticket.id !== id)
      if (rest.length === 0) return fresh()
      return { tickets: rest, activeId: s.activeId === id ? rest[Math.min(index, rest.length - 1)].id : s.activeId }
    })

  /** Faol chekni bo'shatadi (raqami o'zgarmaydi). Yangi id — savat panelidagi ochiq izoh maydonlari ham yopiladi. */
  const clear = () =>
    setState((s) => {
      const current = s.tickets.find((ticket) => ticket.id === s.activeId)
      if (!current) return s
      const cleared = emptyTicket(current.no)
      return { tickets: s.tickets.map((ticket) => (ticket.id === current.id ? cleared : ticket)), activeId: cleared.id }
    })

  /** Boshqa kassadan qaytgan cheklar (offline → online) — hozirgilari o'rniga. */
  const replace = (next: TicketsState) => setState(next)

  return { state, tickets: state.tickets, active, updateActive, setOrderId, select, add, close, clear, replace }
}

/** Yangi buyurtma id'si — server bilan bir xil shakl (`ord_` + 16 hex). */
export function newOrderId(): string {
  return `ord_${Array.from(crypto.getRandomValues(new Uint8Array(8)), (byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

import { useState } from 'react'
import type { OrderType } from '@/domain/types'
import type { CartLine } from '@/lib/cart'

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
}

type State = { tickets: Ticket[]; activeId: string }

let seq = 0
const emptyTicket = (no: number): Ticket => ({ id: `ticket_${++seq}`, no, lines: [], orderType: 'dine_in', orderNote: '' })

function freeNo(tickets: Ticket[]): number {
  let no = 1
  while (tickets.some((ticket) => ticket.no === no)) no += 1
  return no
}

function fresh(): State {
  const first = emptyTicket(1)
  return { tickets: [first], activeId: first.id }
}

/**
 * Kassaning ochiq cheklari. Doim kamida bitta chek bor; to'langan yoki yopilgan chek ro'yxatdan chiqadi (oxirgisi
 * bo'lsa — o'rniga bo'sh "Chek 1"). Sahifa yangilansa cheklar saqlanmaydi (avvalgi bitta savat kabi).
 */
export function useTickets() {
  const [state, setState] = useState(fresh)
  const active = state.tickets.find((ticket) => ticket.id === state.activeId) ?? state.tickets[0]

  /** Faol chekni o'zgartiradi (savat qatorlari, buyurtma turi, izoh). */
  const updateActive = (change: (ticket: Ticket) => Partial<Ticket>) =>
    setState((s) => ({ ...s, tickets: s.tickets.map((ticket) => (ticket.id === s.activeId ? { ...ticket, ...change(ticket) } : ticket)) }))

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

  return { tickets: state.tickets, active, updateActive, select, add, close, clear }
}

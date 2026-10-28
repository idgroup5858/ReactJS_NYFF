import { Plus, X } from 'lucide-react'
import { useT } from '@/i18n'
import { cartQty } from '@/lib/cart'
import { MAX_TICKETS, type Ticket } from './useTickets'

type Props = {
  tickets: Ticket[]
  activeId: string
  onSelect: (id: string) => void
  onAdd: () => void
  onClose: (ticket: Ticket) => void
}

/** Ochiq cheklar tablari: "Chek 1 · 3", "Chek 2" … va "+ Chek". Bitta chek qolganda yopish tugmasi yo'q ("Tozalash" bor). */
export default function TicketTabs({ tickets, activeId, onSelect, onAdd, onClose }: Props) {
  const t = useT()
  const closable = tickets.length > 1
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <div role="tablist" aria-label={t.kassa.tickets} className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
        {tickets.map((ticket) => {
          const selected = ticket.id === activeId
          const count = cartQty(ticket.lines)
          const name = `${t.kassa.ticket} ${ticket.no}`
          return (
            <div
              key={ticket.id}
              className={`flex h-8 shrink-0 items-center rounded border text-xs font-bold transition-colors ${selected ? 'border-select bg-brand-50 text-neutral-950' : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-400'}`}
            >
              <button
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onSelect(ticket.id)}
                className={`flex h-full cursor-pointer items-center gap-1.5 whitespace-nowrap ${closable ? 'pr-1 pl-2.5' : 'px-2.5'}`}
              >
                {name}
                {count > 0 && <span className={`rounded-full px-1.5 text-[10px] tabular-nums ${selected ? 'bg-taxi text-coal' : 'bg-neutral-200 text-neutral-700'}`}>{count}</span>}
              </button>
              {closable && (
                <button
                  type="button"
                  onClick={() => onClose(ticket)}
                  aria-label={`${t.kassa.closeTicket}: ${name}`}
                  title={t.kassa.closeTicket}
                  className="flex h-full w-6 cursor-pointer items-center justify-center text-neutral-400 transition-colors hover:text-red-700"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )
        })}
      </div>
      <button type="button" onClick={onAdd} disabled={tickets.length >= MAX_TICKETS} title={t.kassa.newTicket} className="btn-ghost flex h-8 shrink-0 items-center gap-1 rounded px-2.5 text-xs font-bold">
        <Plus size={14} />
        {t.kassa.ticket}
      </button>
    </div>
  )
}

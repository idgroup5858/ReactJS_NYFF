import { ChevronRight, ReceiptText } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { StatusLine } from '../components'
import { refreshOrder } from '../data'
import { format, progress } from '../domain'
import { useT } from '../i18n'
import { useNav } from '../nav'
import { ordersStore, useStore } from '../store'
import { money, statusText } from '../labels'
import { Card, Outcome, TopBar } from '../ui'

const PAGE = 20

/** "Buyurtmalarim" — qurilmada saqlangan buyurtmalar, yangisi birinchi; 20 tadan (ro'yxat oxiri ko'ringanda yana 20). */
export default function OrdersPage() {
  const t = useT()
  const nav = useNav()
  const orders = useStore(ordersStore)
  const [limit, setLimit] = useState(PAGE)
  const end = useRef<HTMLDivElement>(null)

  // ishdagi buyurtmalar holati — ochilganda serverdan
  useEffect(() => {
    const live = ordersStore
      .get()
      .slice(0, PAGE)
      .filter((o) => progress.isCurrent(o.order))
      .slice(0, 5)
    live.forEach((o) => void refreshOrder(o.order.id).catch(() => undefined))
  }, [])

  useEffect(() => {
    const el = end.current
    if (!el || limit >= orders.length) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setLimit((l) => l + PAGE)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [limit, orders.length])

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title={t.myOrders} onBack={nav.back} />
      {orders.length === 0 ? (
        <Outcome icon={ReceiptText} title={t.noOrders} />
      ) : (
        <div className="flex flex-col gap-2 p-4">
          {orders.slice(0, limit).map(({ order }) => (
            <Card key={order.id} onClick={() => nav.go(`order/${order.id}`)}>
              <div className="flex items-center gap-3 px-3.5 py-2.5">
                <span className="text-[20px] font-black text-(--nyt-text)">{format.orderNumber(order.number)}</span>
                <span className="min-w-0 flex-1">
                  <StatusLine order={order} text={statusText(t, order)} />
                  <span className="block text-[12px] text-(--nyt-text-faint)">
                    {format.dateTime(order.createdAt)} · {order.type === 'delivery' ? t.delivery : t.pickup}
                  </span>
                </span>
                <span className="text-[14px] font-bold whitespace-nowrap text-(--nyt-text)">{money(t, order.total)}</span>
                <ChevronRight size={18} className="text-(--nyt-text-faint)" />
              </div>
            </Card>
          ))}
          <div ref={end} className="h-1" />
        </div>
      )}
    </div>
  )
}

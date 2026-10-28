import { Lock, Settings } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { api } from '@/api'
import { ApiError } from '@/api/http'
import { useActiveOrders, useBranches, useCouriers, useDeliveryOrders, useMenu } from '@/api/queries'
import { onDutyCouriers } from '@/components/order/courierActivity'
import { useRealtime } from '@/api/realtime'
import { closeCurrentShift, ensureCashierShift, lockSession, logout, useCurrentUser, useSession } from '@/api/session'
import StaffLayout, { HeaderAction } from '@/components/layout/StaffLayout'
import type { ID, MenuProduct, Order, PaymentMethod, PaymentSplit, ShiftWithSummary } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { addProduct, cartQty, changeQty, removeLine } from '@/lib/cart'
import { choiceDialog, confirmDialog, showToast } from '@/lib/swal'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { printReceipt } from '@/lib/printReceipt'
import { useIdle } from '@/lib/useIdle'
import CartPanel, { type PricedLine } from './CartPanel'
import KassaSettingsModal from './KassaSettingsModal'
import LockScreen from './LockScreen'
import MenuPanel from './MenuPanel'
import OrdersDrawer, { type OrdersTab } from './OrdersDrawer'
import PaymentModal from './PaymentModal'
import QueueButtons from './QueueButtons'
import ShiftReportModal from './ShiftReportModal'
import TicketTabs from './TicketTabs'
import { useTickets, type Ticket } from './useTickets'

/** Harakatsizlikdan keyin kassa bloklanadi (spec: 5 daqiqa). */
const LOCK_AFTER_MS = 5 * 60 * 1000

type Panel = 'pay' | OrdersTab | 'settings' | null

/**
 * Soni oshsa (kioskdan yoki mobil ilovadan yangi buyurtma) — kassirga xabar. [count] `null` — ro'yxat hali
 * yuklanmagan; birinchi yuklanishdagi son "yangi" hisoblanmaydi.
 */
function useRiseToast(count: number | null, message: string): void {
  const seen = useRef<number | null>(null)
  useEffect(() => {
    if (count === null) return
    if (seen.current !== null && count > seen.current) showToast(message, 'info')
    seen.current = count
  }, [count, message])
}

/**
 * Kassa: chapda (yoki tepada) rasmli kategoriyalar, o'rtada taomlar, o'ngda savat — bir nechta ochiq chek (navbat
 * ko'payganda joriysini yopmasdan yangisi ochiladi). To'lovdan keyin chek chiqadi (oshxona shundan tayyorlaydi) va raqam
 * TV da «Tayyorlanmoqda» ga tushadi. Tepada — kioskdan kelgan to'lanmagan buyurtmalar,
 * tayyorlanayotganlar (faqat kuzatish — "Tayyor"ni oshpaz yordamchisi bosadi), sozlamalar, bloklash, chiqish (smenani
 * topshirish savoli bilan). Buyurtmalar ro'yxati socket xabari kelganda (va qayta ulanganda) serverdan yangilanadi.
 */
export default function KassaPage() {
  const t = useT()
  const session = useSession()
  const user = useCurrentUser()
  const navigate = useNavigate()
  useDocumentTitle(t.modes.cashier.title)

  const branchId: ID | null = user?.branchId ?? null
  const menu = useMenu(branchId, { all: true })
  const { data: branches } = useBranches()
  const { data: activeOrders } = useActiveOrders()
  const { data: deliveryOrders } = useDeliveryOrders()
  // "Ishdaman" kuryer ilovasida yoqiladi — socket'da kelmaydi, shuning uchun davriy
  const { data: couriers } = useCouriers({ refetchMs: 30_000 })

  const finish = () => {
    logout()
    void navigate('/', { replace: true })
  }

  // huquq bekor bo'ldi (xodim bloklandi, filiali o'zgardi) — kirish ekraniga
  useRealtime(session ? { token: session.token } : null, { onAuthError: finish })

  const { tickets, active, updateActive, select, add, close, clear } = useTickets()
  const { lines, orderType, orderNote } = active
  const [panel, setPanel] = useState<Panel>(null)
  const [report, setReport] = useState<ShiftWithSummary | null>(null)
  // savatga qo'shilgan taomlar: admin taomni o'chirsa u menyudan butunlay chiqadi — qator nomi va rasmi bilan qoladi
  const [added, setAdded] = useState<Map<ID, MenuProduct>>(() => new Map())

  useEffect(() => {
    ensureCashierShift().catch((error: unknown) => showToast(errorMessage(error), 'error'))
  }, [])

  const locked = session?.locked === true
  useIdle(LOCK_AFTER_MS, lockSession, !locked && report === null)

  // narx har doim menyudan (filialning joriy narxi): sotuvdan olingan / o'chirilgan taom — `null`, to'lov to'xtaydi
  const menuProducts = useMemo(() => new Map((menu.data?.products ?? []).map((product) => [product.id, product])), [menu.data])
  const priced: PricedLine[] = lines.flatMap((line) => {
    const current = menuProducts.get(line.productId)
    const product = current ?? added.get(line.productId)
    return product ? [{ ...line, product, price: current?.price ?? null }] : []
  })
  const total = priced.reduce((sum, line) => sum + (line.price ?? 0) * line.qty, 0)

  const cartCounts = useMemo(() => {
    const counts = new Map<ID, number>()
    for (const line of lines) counts.set(line.productId, (counts.get(line.productId) ?? 0) + line.qty)
    return counts
  }, [lines])

  const branchName = branches?.find((b) => b.id === branchId)?.name ?? ''
  const orders = activeOrders ?? []
  const pendingCount = orders.filter((o) => o.status === 'pending' && o.source !== 'mobile').length
  const onlineCount = orders.filter((o) => o.status === 'pending' && o.source === 'mobile').length
  const preparingCount = orders.filter((o) => o.status === 'preparing').length
  const returnedCount = (deliveryOrders ?? []).filter((o) => o.returnedAt).length

  // kioskdan yoki mobil ilovadan yangi buyurtma kelsa, kuryer dostavkani qaytarsa — kassir ko'rsin
  useRiseToast(activeOrders ? pendingCount : null, t.orders.kioskNew)
  useRiseToast(activeOrders ? onlineCount : null, t.orders.onlineNew)
  useRiseToast(deliveryOrders ? returnedCount : null, t.courier.returnedNew)

  if (!user || !session) return null

  const addToCart = (product: MenuProduct) => {
    setAdded((current) => (current.has(product.id) ? current : new Map(current).set(product.id, product)))
    updateActive((ticket) => ({ lines: addProduct(ticket.lines, product.id) }))
  }

  /** Ichida taom bor chek yopilsa — so'raladi. */
  const closeTicket = async (ticket: Ticket) => {
    const count = cartQty(ticket.lines)
    if (count > 0 && !(await confirmDialog(t.kassa.closeTicketTitle(`${t.kassa.ticket} ${ticket.no}`), t.kassa.closeTicketText(count), t.kassa.closeTicket))) return
    close(ticket.id)
  }

  const submitOrder = async (payment: PaymentMethod, split?: PaymentSplit): Promise<Order | null> => {
    const ticketId = active.id
    try {
      await ensureCashierShift()
      const order = await api.orders.create({
        type: orderType,
        items: priced.map((line) => ({ productId: line.productId, qty: line.qty })),
        note: orderNote,
        payment,
        split,
      })
      // to'langan chek yopiladi, qolgan ochiq cheklar joyida turadi
      close(ticketId)
      printReceipt(order, branchName)
      return order
    } catch (error) {
      // taom shu orada sotuvdan olingan — menyu yangilansin (qator "Sotilmaydi" bo'lib qoladi)
      if (error instanceof ApiError && error.code === 'product_unavailable') menu.reload()
      showToast(errorMessage(error), 'error')
      return null
    }
  }

  const onLogout = async () => {
    const choice = await choiceDialog(t.handover.title, t.handover.text, t.handover.yes, t.handover.no)
    if (choice === 'cancel') return
    if (choice === 'deny') return finish()
    let closed: ShiftWithSummary | null
    try {
      closed = await closeCurrentShift()
    } catch (error) {
      // smena boshqa joyda (admin / boshqa tab) allaqachon yopilgan — topshiradigan narsa yo'q
      if (error instanceof ApiError && error.code === 'shift_not_open') return finish()
      showToast(errorMessage(error), 'error')
      return
    }
    if (closed) setReport(closed)
    else finish()
  }

  return (
    <StaffLayout
      title={t.modes.cashier.title}
      variant="fill"
      onLogout={() => void onLogout()}
      actions={
        <>
          <HeaderAction label={t.kassaSettings.open} icon={<Settings size={16} />} onClick={() => setPanel('settings')} />
          <HeaderAction label={t.lock.lockNow} icon={<Lock size={16} />} onClick={lockSession} />
        </>
      }
    >
      <div className="flex h-full min-h-0 flex-col lg:flex-row">
        <div className="min-h-0 min-w-0 flex-1">
          {/* taomlar ostida — eng ko'p bosiladigan "Kioskdan" va "Tayyorlanmoqda" katta tugmalari */}
          <MenuPanel
            menu={menu.data}
            cartCounts={cartCounts}
            onAdd={addToCart}
            footer={
              <QueueButtons
                online={onlineCount}
                pending={pendingCount}
                preparing={preparingCount}
                delivery={deliveryOrders?.length ?? 0}
                returned={returnedCount}
                couriersOnDuty={couriers ? onDutyCouriers(couriers).length : null}
                onOnline={() => setPanel('online')}
                onKiosk={() => setPanel('kiosk')}
                onPreparing={() => setPanel('preparing')}
                onDelivery={() => setPanel('delivery')}
              />
            }
          />
        </div>
        <CartPanel
          key={active.id}
          tabs={<TicketTabs tickets={tickets} activeId={active.id} onSelect={select} onAdd={add} onClose={(ticket) => void closeTicket(ticket)} />}
          lines={priced}
          total={total}
          orderType={orderType}
          onOrderType={(type) => updateActive(() => ({ orderType: type }))}
          orderNote={orderNote}
          onOrderNote={(note) => updateActive(() => ({ orderNote: note }))}
          onChangeQty={(key, delta) => updateActive((ticket) => ({ lines: changeQty(ticket.lines, key, delta) }))}
          onRemove={(key) => updateActive((ticket) => ({ lines: removeLine(ticket.lines, key) }))}
          onClear={clear}
          onPay={() => setPanel('pay')}
        />
      </div>

      {panel === 'pay' && <PaymentModal total={total} orderType={orderType} onConfirm={submitOrder} onClose={() => setPanel(null)} />}
      {(panel === 'online' || panel === 'kiosk' || panel === 'preparing' || panel === 'delivery' || panel === 'shift') && (
        <OrdersDrawer branchName={branchName} shiftId={session.shiftId} initialTab={panel} onClose={() => setPanel(null)} />
      )}
      {panel === 'settings' && <KassaSettingsModal onClose={() => setPanel(null)} />}
      {report && <ShiftReportModal shift={report} onDone={finish} />}
      {locked && !report && <LockScreen user={user} />}
    </StaffLayout>
  )
}

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
import FaceIdRequestPanel from '@/components/ui/FaceIdRequestPanel'
import Modal from '@/components/ui/Modal'
import type { ID, MenuProduct, Order, PaymentMethod, PaymentSplit, ShiftWithSummary } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { addProduct, cartQty, changeQty, removeLine } from '@/lib/cart'
import { choiceDialog, confirmDialog, showToast } from '@/lib/swal'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { attachPrintService, printOrder } from '@/lib/printReceipt'
import { removeKey } from '@/store/storage'
import { ticketsStorageKey } from '@/store/storageKeys'
import { useSettings } from '@/store/settingsStore'
import AlertFrame from './AlertFrame'
import CartPanel, { type PricedLine } from './CartPanel'
import { offlineKassaUrl, releaseTickets, takeTickets } from './handover'
import KassaSettingsModal from './KassaSettingsModal'
import LockScreen from './LockScreen'
import MenuPanel from './MenuPanel'
import { lastOrderNumber, rememberOrderNumbers, useConnectionLost } from './offlineSupport'
import OfflineSwitch from './OfflineSwitch'
import OrdersDrawer, { type OrdersTab } from './OrdersDrawer'
import PaymentModal from './PaymentModal'
import QueueButtons from './QueueButtons'
import ScreenControls from './ScreenControls'
import ShiftReportModal from './ShiftReportModal'
import TicketTabs from './TicketTabs'
import { useOrderAlerts } from './useOrderAlerts'
import { hasLines, newOrderId, useTickets, type Ticket } from './useTickets'

type Panel = 'pay' | OrdersTab | 'settings' | null

const isOrdersTab = (panel: Panel): panel is OrdersTab =>
  panel === 'online' || panel === 'kiosk' || panel === 'preparing' || panel === 'delivery' || panel === 'shift'

/** Kutayotgan buyurtmalardan eng eskisi filialga tushgan vaqt; `null` — yo'q. */
function oldestRouted(orders: Order[]): string | null {
  return orders.reduce<string | null>((oldest, order) => (oldest === null || order.routedAt < oldest ? order.routedAt : oldest), null)
}

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
  const { connected } = useRealtime(session ? { token: session.token } : null, { onAuthError: finish })
  const connectionLost = useConnectionLost(connected)
  const { offlineEnabled, offlineUrl } = useSettings()

  // ochiq cheklar brauzerda saqlanadi; offline kassadan qaytilgan bo'lsa — uning cheklari
  const ticketsState = useTickets(user ? ticketsStorageKey(user.id) : null, takeTickets())
  const { tickets, active, updateActive, setOrderId, select, add, close, clear } = ticketsState
  const { lines, orderType, orderNote } = active
  useEffect(releaseTickets, [])
  // cheklar — shu kompyuterdagi "NYFF Offline" orqali (kassa va oshxona printeri, oynasiz)
  useEffect(attachPrintService, [])
  const [panel, setPanel] = useState<Panel>(null)
  // buyurtmalar oynasida kassir almashtirgan bo'lim; `null` — ochilgandagi bo'limda turibdi
  const [drawerTab, setDrawerTab] = useState<OrdersTab | null>(null)
  const [report, setReport] = useState<ShiftWithSummary | null>(null)
  // FaceID: "Smenani topshirish" — terminalda «Chiqish» kerak; terminal ishlamasa — admindan ruxsat so'rash oynasi
  const [faceIdClose, setFaceIdClose] = useState(false)
  // savatga qo'shilgan taomlar: admin taomni o'chirsa u menyudan butunlay chiqadi — qator nomi va rasmi bilan qoladi
  const [added, setAdded] = useState<Map<ID, MenuProduct>>(() => new Map())

  useEffect(() => {
    ensureCashierShift().catch((error: unknown) => showToast(errorMessage(error), 'error'))
  }, [])

  // kassa o'zi bloklanmaydi — faqat kassir "Bloklash"ni bossa
  const locked = session?.locked === true

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
  const kioskPending = orders.filter((o) => o.status === 'pending' && o.source !== 'mobile')
  const onlinePending = orders.filter((o) => o.status === 'pending' && o.source === 'mobile')
  const pendingCount = kioskPending.length
  const onlineCount = onlinePending.length
  const preparingCount = orders.filter((o) => o.status === 'preparing').length
  const returnedCount = (deliveryOrders ?? []).filter((o) => o.returnedAt).length

  // kioskdan yoki mobil ilovadan yangi buyurtma kelsa, kuryer dostavkani qaytarsa — kassir ko'rsin
  useRiseToast(activeOrders ? pendingCount : null, t.orders.kioskNew)
  useRiseToast(activeOrders ? onlineCount : null, t.orders.onlineNew)
  useRiseToast(deliveryOrders ? returnedCount : null, t.courier.returnedNew)

  // kassir ko'rmagan online / kiosk buyurtma — ovoz, ekran ramkasi, tugma va tab sarlavhasi miltillaydi
  const viewing = isOrdersTab(panel) ? (drawerTab ?? panel) : null
  // internet uzilgan bo'lsa ro'yxat eskirgan — jim (offline oynasi chiqadi)
  const alerts = useOrderAlerts(activeOrders, viewing, report === null && !connectionLost)
  useDocumentTitle(t.modes.cashier.title, alerts.ringing ? t.kassa.alertTitle(alerts.online + alerts.kiosk) : null)

  // bugungi eng katta raqam — internet uzilsa offline kassa undan davom etadi
  useEffect(() => {
    if (branchId) rememberOrderNumbers(branchId, [...(activeOrders ?? []), ...(deliveryOrders ?? [])])
  }, [branchId, activeOrders, deliveryOrders])

  if (!user || !session) return null

  /**
   * Offline kassaga (shu kompyuterdagi server): kim ishlayotgani, oxirgi raqam, ochiq cheklar va menyu manzil bilan
   * o'tadi. Cheklar endi offline kassada — bu yerdagilari o'chiriladi (qaytishda offline kassa qaytaradi).
   */
  const switchToOffline = () => {
    if (!branchId) return
    const url = offlineKassaUrl(offlineUrl, {
      v: 1,
      branchId,
      branchName,
      cashier: { id: user.id, name: user.name, surname: user.surname },
      locked,
      returnUrl: window.location.origin + import.meta.env.BASE_URL,
      lastNumber: lastOrderNumber(branchId),
      tickets: hasLines(ticketsState.state) ? ticketsState.state : null,
      menu: menu.data ?? null,
    })
    removeKey(ticketsStorageKey(user.id))
    window.location.assign(url)
  }

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
    // javob kelmay qolsa (internet uzildi) qayta yuborish — shu id bilan, ikki marta yozilmaydi
    const orderId = active.orderId ?? newOrderId()
    if (!active.orderId) setOrderId(ticketId, orderId)
    try {
      await ensureCashierShift()
      const order = await api.orders.create({
        id: orderId,
        type: orderType,
        items: priced.map((line) => ({ productId: line.productId, qty: line.qty })),
        note: orderNote,
        payment,
        split,
      })
      // to'langan chek yopiladi, qolgan ochiq cheklar joyida turadi
      close(ticketId)
      if (branchId) rememberOrderNumbers(branchId, [order])
      // mijoz cheki va oshxona cheki (ichimliklarsiz) — bir vaqtda
      printOrder(order, branchName, menu.data)
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
      // FaceID filiali: terminaldan «Chiqish» bilan o'tilmagan — ko'rsatma va admindan ruxsat so'rash
      if (error instanceof ApiError && error.code === 'faceid_checkout_required') return setFaceIdClose(true)
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
          <ScreenControls />
          <HeaderAction label={t.kassaSettings.open} icon={<Settings size={16} />} onClick={() => setPanel('settings')} />
          <HeaderAction label={t.lock.lockNow} icon={<Lock size={16} />} onClick={lockSession} />
        </>
      }
    >
      {/* yotiq ekranda (POS monitori, 1024 dan torrog'i ham) savat doim o'ngda; ostida — faqat telefon / tik planshetda */}
      <div className="flex h-full min-h-0 flex-col md:flex-row">
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
                onlineSince={oldestRouted(onlinePending)}
                kioskSince={oldestRouted(kioskPending)}
                onlineRinging={alerts.ringing !== null && alerts.online > 0}
                kioskRinging={alerts.ringing !== null && alerts.kiosk > 0}
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
      {isOrdersTab(panel) && (
        <OrdersDrawer
          branchName={branchName}
          menu={menu.data}
          shiftId={session.shiftId}
          initialTab={panel}
          onTabChange={setDrawerTab}
          onClose={() => {
            setPanel(null)
            setDrawerTab(null)
          }}
        />
      )}
      {panel === 'settings' && <KassaSettingsModal onClose={() => setPanel(null)} />}
      {faceIdClose && (
        <Modal
          title={t.faceId.closeTitle}
          onClose={() => setFaceIdClose(false)}
          footer={
            <button type="button" onClick={() => setFaceIdClose(false)} className="btn-primary h-9 w-full rounded text-sm font-bold">
              {t.faceId.understood}
            </button>
          }
        >
          {/* eniga keng, past (POS monitori): chapda ko'rsatma, o'ngda admindan ruxsat so'rash */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-neutral-800">{t.errors.faceid_checkout_required}</p>
              <p className="text-xs text-neutral-500">{t.faceId.closeHint}</p>
            </div>
            <FaceIdRequestPanel request={api.faceId.requestForShift} approvedHint={t.faceId.closeAgain(t.common.logout, t.handover.yes)} />
          </div>
        </Modal>
      )}
      {report && <ShiftReportModal onDone={finish} />}
      {locked && !report && <LockScreen user={user} />}
      {connectionLost && !report && <OfflineSwitch enabled={offlineEnabled} onSwitch={switchToOffline} />}
      {alerts.ringing && <AlertFrame kind={alerts.ringing} />}
    </StaffLayout>
  )
}

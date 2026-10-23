import { ClipboardList, Lock, Settings } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { api, useDb } from '@/api'
import { closeCurrentShift, ensureCashierShift, lockSession, logout, useCurrentUser, useSession } from '@/api/session'
import StaffLayout, { HeaderAction } from '@/components/layout/StaffLayout'
import { branchPrice } from '@/domain/logic/orders'
import type { ID, Order, OrderType, PaymentMethod, PaymentSplit, Shift } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { choiceDialog, showToast } from '@/lib/swal'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { useIdle } from '@/lib/useIdle'
import CartPanel, { type PricedLine } from './CartPanel'
import KassaSettingsModal from './KassaSettingsModal'
import LockScreen from './LockScreen'
import MenuPanel from './MenuPanel'
import OrdersDrawer from './OrdersDrawer'
import PaymentModal from './PaymentModal'
import ShiftReportModal from './ShiftReportModal'
import { addProduct, changeQty, removeLine, setNote, type CartLine } from '@/lib/cart'

/** Harakatsizlikdan keyin kassa bloklanadi (spec: 5 daqiqa). */
const LOCK_AFTER_MS = 5 * 60 * 1000

type Panel = 'pay' | 'orders' | 'settings' | null

/**
 * Kassa: chapda (yoki tepada) rasmli kategoriyalar, o'rtada taomlar, o'ngda savat. To'lovdan keyin buyurtma
 * oshxonaga ketadi va raqami ko'rsatiladi. Tepada — buyurtmalar (tayyorlari soni), sozlamalar, bloklash, chiqish
 * (smenani topshirish savoli bilan).
 */
export default function KassaPage() {
  const t = useT()
  const db = useDb()
  const session = useSession()
  const user = useCurrentUser()
  const navigate = useNavigate()
  useDocumentTitle(t.modes.cashier.title)

  const [lines, setLines] = useState<CartLine[]>([])
  const [orderType, setOrderType] = useState<OrderType>('dine_in')
  const [orderNote, setOrderNote] = useState('')
  const [cartKey, setCartKey] = useState(0)
  const [panel, setPanel] = useState<Panel>(null)
  const [report, setReport] = useState<Shift | null>(null)

  useEffect(() => {
    void ensureCashierShift()
  }, [])

  const locked = session?.locked === true
  useIdle(LOCK_AFTER_MS, lockSession, !locked && report === null)

  const branchId: ID = user?.branchId ?? ''

  const priced: PricedLine[] = lines.flatMap((line) => {
    const product = db.products.find((p) => p.id === line.productId)
    return product ? [{ ...line, product, price: product.active ? branchPrice(db, branchId, product.id) : null }] : []
  })
  const total = priced.reduce((sum, line) => sum + (line.price ?? 0) * line.qty, 0)

  const cartCounts = useMemo(() => {
    const counts = new Map<ID, number>()
    for (const line of lines) counts.set(line.productId, (counts.get(line.productId) ?? 0) + line.qty)
    return counts
  }, [lines])

  const readyCount = db.orders.filter((o) => o.branchId === branchId && o.status === 'ready').length

  if (!user || !session) return null

  const resetCart = () => {
    setLines([])
    setOrderType('dine_in')
    setOrderNote('')
    setCartKey((key) => key + 1)
  }

  const submitOrder = async (payment: PaymentMethod, split?: PaymentSplit): Promise<Order | null> => {
    try {
      await ensureCashierShift()
      const order = await api.orders.create({
        branchId,
        type: orderType,
        source: 'cashier',
        items: priced.map((line) => ({ productId: line.productId, qty: line.qty, note: line.note })),
        note: orderNote,
        payment,
        split,
        cashierId: user.id,
      })
      resetCart()
      return order
    } catch (error) {
      showToast(errorMessage(error), 'error')
      return null
    }
  }

  const finish = () => {
    logout()
    void navigate('/', { replace: true })
  }

  const onLogout = async () => {
    const choice = await choiceDialog(t.handover.title, t.handover.text, t.handover.yes, t.handover.no)
    if (choice === 'cancel') return
    if (choice === 'deny') return finish()
    const closed = await closeCurrentShift().catch(() => null)
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
          <HeaderAction label={t.orders.title} icon={<ClipboardList size={16} />} badge={readyCount} onClick={() => setPanel('orders')} />
          <HeaderAction label={t.kassaSettings.open} icon={<Settings size={16} />} onClick={() => setPanel('settings')} />
          <HeaderAction label={t.lock.lockNow} icon={<Lock size={16} />} onClick={lockSession} />
        </>
      }
    >
      <div className="flex h-full min-h-0 flex-col lg:flex-row">
        <div className="min-h-0 min-w-0 flex-1">
          <MenuPanel branchId={branchId} cartCounts={cartCounts} onAdd={(productId) => setLines((current) => addProduct(current, productId))} />
        </div>
        <CartPanel
          key={cartKey}
          lines={priced}
          total={total}
          orderType={orderType}
          onOrderType={setOrderType}
          orderNote={orderNote}
          onOrderNote={setOrderNote}
          onChangeQty={(key, delta) => setLines((current) => changeQty(current, key, delta))}
          onNote={(key, note) => setLines((current) => setNote(current, key, note))}
          onRemove={(key) => setLines((current) => removeLine(current, key))}
          onClear={resetCart}
          onPay={() => setPanel('pay')}
        />
      </div>

      {panel === 'pay' && <PaymentModal total={total} orderType={orderType} onConfirm={submitOrder} onClose={() => setPanel(null)} />}
      {panel === 'orders' && <OrdersDrawer branchId={branchId} shiftId={session.shiftId} userId={user.id} onClose={() => setPanel(null)} />}
      {panel === 'settings' && <KassaSettingsModal userId={user.id} onClose={() => setPanel(null)} />}
      {report && <ShiftReportModal shift={report} onDone={finish} />}
      {locked && !report && <LockScreen user={user} />}
    </StaffLayout>
  )
}

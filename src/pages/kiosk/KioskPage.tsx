import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router'
import { api, useDb } from '@/api'
import { ORDER_TYPE_ICONS } from '@/components/order/orderIcons'
import Modal from '@/components/ui/Modal'
import { branchPrice } from '@/domain/logic/orders'
import type { ID, Order, OrderType, PaymentMethod, Product } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { addProduct, changeQty, removeLine, type CartLine } from '@/lib/cart'
import { printReceipt } from '@/lib/printReceipt'
import { showToast } from '@/lib/swal'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { useIdle } from '@/lib/useIdle'
import KioskCart, { type KioskLine } from './KioskCart'
import KioskDone from './KioskDone'
import KioskMenu from './KioskMenu'
import KioskPayment from './KioskPayment'
import KioskTopBar from './KioskTopBar'
import KioskWelcome from './KioskWelcome'
import ProductSheet from './ProductSheet'

type Step = 'welcome' | 'menu' | 'cart' | 'pay' | 'done'

/** Mijoz shuncha vaqt hech narsa bosmasa — "Hali shu yerdamisiz?" so'raladi. */
const IDLE_AFTER_MS = 90_000
/** Savolga javob bo'lmasa — shuncha soniyadan keyin bosh ekranga. */
const IDLE_COUNTDOWN = 20

function IdleModal({ onStay, onReset }: { onStay: () => void; onReset: () => void }) {
  const t = useT()
  const [left, setLeft] = useState(IDLE_COUNTDOWN)
  useEffect(() => {
    const timer = window.setInterval(() => setLeft((value) => value - 1), 1000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    if (left <= 0) onReset()
  }, [left, onReset])
  return (
    <Modal
      title={t.kiosk.idleTitle}
      onClose={onStay}
      size="sm"
      footer={
        <div className="grid w-full grid-cols-2 gap-2">
          <button type="button" onClick={onReset} className="btn-ghost h-14 rounded text-sm font-bold">
            {t.kiosk.idleReset}
          </button>
          <button type="button" autoFocus onClick={onStay} className="btn-primary h-14 rounded text-sm font-bold">
            {t.kiosk.idleStay}
          </button>
        </div>
      }
    >
      <p className="py-4 text-center text-lg text-neutral-700 tabular-nums">{t.kiosk.idleText(Math.max(0, left))}</p>
    </Modal>
  )
}

/**
 * Kiosk (PINsiz, filial manzildan): bosh ekran → menyu → taom oynasi → savat → to'lov → raqam.
 * Karta / Click bilan to'lansa buyurtma darhol tayyorlanadi; "kassada to'layman" bo'lsa — kassada "Kioskdan" ro'yxatiga
 * tushadi, kassir pulini olib tasdiqlaguncha oshxonaga ketmaydi.
 */
export default function KioskPage() {
  const t = useT()
  const db = useDb()
  const { branchId } = useParams()
  const branch = db.branches.find((b) => b.id === branchId && b.active)
  useDocumentTitle(t.modes.kiosk.title)

  const [step, setStep] = useState<Step>('welcome')
  const [orderType, setOrderType] = useState<OrderType>('dine_in')
  const [lines, setLines] = useState<CartLine[]>([])
  const [detail, setDetail] = useState<Product | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [idle, setIdle] = useState(false)

  const reset = useCallback(() => {
    setStep('welcome')
    setOrderType('dine_in')
    setLines([])
    setDetail(null)
    setOrder(null)
    setIdle(false)
  }, [])

  useIdle(IDLE_AFTER_MS, () => setIdle(true), step === 'menu' || step === 'cart' || step === 'pay')

  const priced: KioskLine[] = useMemo(
    () =>
      lines.flatMap((line) => {
        const product = db.products.find((p) => p.id === line.productId)
        const price = product && product.active ? branchPrice(db, branchId ?? '', product.id) : null
        return product && price !== null ? [{ ...line, product, price }] : []
      }),
    [db, lines, branchId],
  )
  const total = priced.reduce((sum, line) => sum + line.price * line.qty, 0)
  const qty = priced.reduce((sum, line) => sum + line.qty, 0)
  const cartCounts = useMemo(() => {
    const counts = new Map<ID, number>()
    for (const line of priced) counts.set(line.productId, (counts.get(line.productId) ?? 0) + line.qty)
    return counts
  }, [priced])

  if (!branch) return <Navigate to="/?mode=kiosk" replace />

  /** `null` — kassada to'laydi: buyurtma kassirni kutadi. Karta / Click — to'langan, chek shu yerda chiqadi. */
  const pay = async (payment: PaymentMethod | null): Promise<boolean> => {
    try {
      const created = await api.orders.create({
        branchId: branch.id,
        type: orderType,
        source: 'kiosk',
        items: priced.map((line) => ({ productId: line.productId, qty: line.qty, note: line.note })),
        payment,
        cashierId: null,
      })
      if (created.payment) printReceipt(created, branch.name)
      setOrder(created)
      setLines([])
      setStep('done')
      return true
    } catch (error) {
      showToast(errorMessage(error), 'error')
      return false
    }
  }

  if (step === 'welcome') {
    return (
      <KioskWelcome
        branch={branch}
        onStart={(type) => {
          setOrderType(type)
          setStep('menu')
        }}
      />
    )
  }

  const TypeIcon = ORDER_TYPE_ICONS[orderType]
  const typeToggle = step !== 'done' && (
    <button
      type="button"
      onClick={() => setOrderType(orderType === 'dine_in' ? 'takeaway' : 'dine_in')}
      aria-label={t.orderType[orderType]}
      className="flex h-11 cursor-pointer items-center gap-2 rounded bg-taxi px-3 text-sm font-extrabold text-coal transition-colors hover:bg-taxi-hover sm:px-4"
    >
      <TypeIcon size={18} />
      <span className="hidden sm:inline">{t.orderType[orderType]}</span>
    </button>
  )

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <KioskTopBar center={typeToggle} onStartOver={reset} />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {step === 'menu' && (
          <KioskMenu branchId={branch.id} cartCounts={cartCounts} cartQty={qty} cartTotal={total} onOpen={setDetail} onCart={() => setStep('cart')} />
        )}
        {step === 'cart' && (
          <KioskCart
            lines={priced}
            total={total}
            orderType={orderType}
            onOrderType={setOrderType}
            onQty={(key, delta) => setLines((current) => changeQty(current, key, delta))}
            onRemove={(key) => setLines((current) => removeLine(current, key))}
            onBack={() => setStep('menu')}
            onCheckout={() => setStep('pay')}
          />
        )}
        {step === 'pay' && <KioskPayment total={total} orderType={orderType} onBack={() => setStep('cart')} onPay={pay} />}
        {step === 'done' && order && <KioskDone order={order} onDone={reset} />}
      </div>

      {detail && (
        <ProductSheet
          product={detail}
          price={branchPrice(db, branch.id, detail.id) ?? 0}
          onClose={() => setDetail(null)}
          onAdd={(count, note) => {
            setLines((current) => addProduct(current, detail.id, count, note))
            setDetail(null)
          }}
        />
      )}
      {idle && <IdleModal onStay={() => setIdle(false)} onReset={reset} />}
    </div>
  )
}

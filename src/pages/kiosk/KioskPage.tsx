import { ArrowLeftRight, MapPin, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { api } from '@/api'
import { ApiError } from '@/api/http'
import { useBranches, useMenu } from '@/api/queries'
import Brand from '@/components/layout/Brand'
import { ORDER_TYPE_ICONS } from '@/components/order/orderIcons'
import ScreenCodeForm from '@/components/screen/ScreenCodeForm'
import Modal from '@/components/ui/Modal'
import { allowedForType, type Branch, type CustomerOrder, type ID, type Menu, type MenuProduct } from '@/domain/types'
import { errorMessage, useLocalize, useT } from '@/i18n'
import { addProduct, changeQty, removeLine, type CartLine } from '@/lib/cart'
import { printReceipt } from '@/lib/printReceipt'
import { showToast } from '@/lib/swal'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { useIdle } from '@/lib/useIdle'
import { forgetScreenCode, readScreenCode, rememberScreenCode } from '@/store/screenCodes'
import KioskCart, { type KioskLine, type KioskOrderType } from './KioskCart'
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

/** Filial tanlash — kirish ekranining kiosk qadami. */
const CHOOSE_BRANCH_PATH = '/?mode=kiosk'

/**
 * Kiosk kodi so'raladi (bosh ekran uslubida): birinchi ochilganda va admin kodni yangilagandan keyin. Kod serverda
 * tekshiriladi, to'g'ri bo'lsa — shu kioskda saqlanadi va boshqa so'ralmaydi. Pastda chapda — xodim uchun chiqish va
 * filialni almashtirish (bosh ekrandagidek).
 */
function KioskCodeScreen({
  branchId,
  branch,
  notice,
  onConnected,
}: {
  branchId: string
  branch: Branch | undefined
  notice: string | null
  onConnected: (code: string) => void
}) {
  const t = useT()
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -right-40 h-[38rem] w-[38rem] rounded-full bg-taxi/40 blur-3xl" />
      <header className="relative flex items-center justify-between gap-4 px-6 py-5 sm:px-10">
        <Brand tone="light" size="lg" />
        {branch && (
          <span className="flex items-center gap-2 text-sm font-semibold text-neutral-600">
            <MapPin size={16} className="text-select" />
            {branch.name}
          </span>
        )}
      </header>
      <main className="relative flex flex-1 items-center justify-center p-6">
        <ScreenCodeForm
          tone="light"
          title={t.kiosk.codeTitle}
          hint={t.kiosk.codeHint}
          notice={notice}
          verify={(code) => api.kiosk.check(branchId, code)}
          onConnected={onConnected}
        />
      </main>
      <div className="absolute bottom-3 left-3 flex gap-1">
        <Link
          to="/"
          aria-label={t.kiosk.exit}
          title={t.kiosk.exit}
          className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-300 transition-colors hover:bg-white hover:text-neutral-600"
        >
          <X size={16} />
        </Link>
        <Link
          to={CHOOSE_BRANCH_PATH}
          aria-label={t.login.changeBranch}
          title={t.login.changeBranch}
          className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-300 transition-colors hover:bg-white hover:text-neutral-600"
        >
          <ArrowLeftRight size={16} />
        </Link>
      </div>
    </div>
  )
}

/**
 * Kiosk (`/kiosk/:branchId` — PINsiz, filial kiosk kodi bilan, filial manzildan): bosh ekran → menyu → taom oynasi →
 * savat → to'lov → raqam. Kod kioskda bir marta kiritiladi; ochilganda, har yangi mijoz boshlaganda va har mijozdan keyin
 * tekshiriladi — admin yangilagan bo'lsa mijoz to'lovgacha kutib qolmasin. Karta / Click bilan to'lansa buyurtma darhol
 * tayyorlanadi; "kassada to'layman" bo'lsa — kassada "Kioskdan" ro'yxatiga tushadi, kassir pulini olib tasdiqlaguncha
 * oshxonaga ketmaydi. Filial noma'lum yoki faol emas — kirishdagi filial tanlashga.
 */
function KioskBranch({ branchId }: { branchId: string }) {
  const t = useT()
  const localize = useLocalize()
  const menu = useMenu(branchId).data
  const branches = useBranches()
  const reloadBranches = branches.reload
  const branch = branches.data?.find((b) => b.id === branchId && b.active)
  useDocumentTitle(t.modes.kiosk.title)

  const [code, setCode] = useState(() => readScreenCode('kiosk', branchId))
  const [notice, setNotice] = useState<string | null>(null)

  /** Saqlangan kod endi ishlamaydi — kod ekraniga ([message] — sababi). */
  const forget = useCallback(
    (message: string) => {
      forgetScreenCode('kiosk', branchId)
      setCode(null)
      setNotice(message)
    },
    [branchId],
  )

  /** Kod hali to'g'rimi — admin yangilagan bo'lsa — kod ekrani. Tarmoq xatosi — indamaydi. */
  const changedText = t.kiosk.codeChanged
  const checkCode = useCallback(() => {
    if (!code) return
    api.kiosk.check(branchId, code).catch((error: unknown) => {
      if (error instanceof ApiError && error.code === 'wrong_kiosk_code') forget(changedText)
    })
  }, [branchId, code, forget, changedText])

  // ochilganda (kod oldin saqlangan bo'lsa)
  useEffect(checkCode, [checkCode])

  const [step, setStep] = useState<Step>('welcome')
  const [orderType, setOrderType] = useState<KioskOrderType>('dine_in')
  const [lines, setLines] = useState<CartLine[]>([])
  const [detail, setDetail] = useState<MenuProduct | null>(null)
  const [order, setOrder] = useState<CustomerOrder | null>(null)
  const [idle, setIdle] = useState(false)

  const reset = useCallback(() => {
    // har yangi mijozdan oldin — admin filialni o'chirgan yoki kiosk kodini yangilagan bo'lishi mumkin
    reloadBranches()
    checkCode()
    setStep('welcome')
    setOrderType('dine_in')
    setLines([])
    setDetail(null)
    setOrder(null)
    setIdle(false)
  }, [reloadBranches, checkCode])

  useIdle(IDLE_AFTER_MS, () => setIdle(true), step === 'menu' || step === 'cart' || step === 'pay')

  // olib ketishda "faqat zalda" taomlar (choynakdagi choy) ko'rinmaydi; ular qolgan kategoriya ham
  const typeMenu: Menu | undefined = useMemo(() => {
    if (!menu || orderType === 'dine_in') return menu
    const products = menu.products.filter((p) => allowedForType(p, orderType))
    const withProducts = new Set(products.map((p) => p.categoryId))
    return { ...menu, products, categories: menu.categories.filter((c) => withProducts.has(c.id)) }
  }, [menu, orderType])

  // narx — filial menyusidan; sotuvdan chiqib qolgan (yoki shu turda berilmaydigan) taom savatdan tushadi
  const priced: KioskLine[] = useMemo(
    () =>
      lines.flatMap((line) => {
        const product = typeMenu?.products.find((p) => p.id === line.productId)
        return product && product.price !== null ? [{ ...line, product, price: product.price }] : []
      }),
    [typeMenu, lines],
  )
  const total = priced.reduce((sum, line) => sum + line.price * line.qty, 0)
  const qty = priced.reduce((sum, line) => sum + line.qty, 0)
  const cartCounts = useMemo(() => {
    const counts = new Map<ID, number>()
    for (const line of priced) counts.set(line.productId, (counts.get(line.productId) ?? 0) + line.qty)
    return counts
  }, [priced])

  if (branches.data && !branch) return <Navigate to={CHOOSE_BRANCH_PATH} replace />
  if (!code) {
    return (
      <KioskCodeScreen
        branchId={branchId}
        branch={branch}
        notice={notice}
        onConnected={(value) => {
          rememberScreenCode('kiosk', branchId, value)
          setNotice(null)
          setCode(value)
        }}
      />
    )
  }

  /** Buyurtma turi almashdi: olib ketishga o'tilsa — "faqat zalda" taomlar savatdan chiqadi va mijozga aytiladi. */
  const changeOrderType = (type: KioskOrderType) => {
    setOrderType(type)
    const removed = priced.filter((line) => !allowedForType(line.product, type))
    if (removed.length === 0) return
    const keys = new Set(removed.map((line) => line.key))
    setLines((current) => current.filter((line) => !keys.has(line.key)))
    const names = [...new Set(removed.map((line) => localize(line.product.name)))].join(', ')
    showToast(t.kiosk.dineInOnlyRemoved(names), 'info')
  }

  /** `null` — kassada to'laydi: buyurtma kassirni kutadi. Karta / Click — to'langan, chek shu yerda chiqadi. */
  const pay = async (payment: 'card' | 'click' | null): Promise<boolean> => {
    try {
      const created = await api.orders.createKiosk(
        {
          branchId,
          type: orderType,
          items: priced.map((line) => ({ productId: line.productId, qty: line.qty })),
          payment,
        },
        code,
      )
      if (created.payment) printReceipt({ ...created, source: 'kiosk' }, branch?.name ?? '')
      setOrder(created)
      setLines([])
      setStep('done')
      return true
    } catch (error) {
      // admin kodni shu orada yangilagan — xodim yangi kodni kiritadi, mijoz savati bilan to'lovga qaytadi
      if (error instanceof ApiError && error.code === 'wrong_kiosk_code') forget(t.kiosk.codeChanged)
      else showToast(errorMessage(error), 'error')
      return false
    }
  }

  if (step === 'welcome') {
    return (
      <KioskWelcome
        branch={branch}
        onStart={(type) => {
          // mijoz boshladi — kod hali to'g'rimi (fonda; yangilangan bo'lsa to'lovgacha kutmasin)
          checkCode()
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
      onClick={() => changeOrderType(orderType === 'dine_in' ? 'takeaway' : 'dine_in')}
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
        {step === 'menu' && <KioskMenu menu={typeMenu} cartCounts={cartCounts} cartQty={qty} cartTotal={total} onOpen={setDetail} onCart={() => setStep('cart')} />}
        {step === 'cart' && (
          <KioskCart
            lines={priced}
            total={total}
            orderType={orderType}
            onOrderType={changeOrderType}
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
          price={detail.price ?? 0}
          onClose={() => setDetail(null)}
          onAdd={(count) => {
            setLines((current) => addProduct(current, detail.id, count))
            setDetail(null)
          }}
        />
      )}
      {idle && <IdleModal onStay={() => setIdle(false)} onReset={reset} />}
    </div>
  )
}

/** `/kiosk/:branchId` — PINsiz, filial kiosk kodi bilan (kioskda bir marta kiritiladi); filial manzildan. */
export default function KioskPage() {
  const { branchId = null } = useParams()
  if (!branchId) return <Navigate to={CHOOSE_BRANCH_PATH} replace />
  // filial almashsa — kod va savat holati boshidan
  return <KioskBranch key={branchId} branchId={branchId} />
}

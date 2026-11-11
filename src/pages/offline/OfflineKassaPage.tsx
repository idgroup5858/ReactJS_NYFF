import { CloudOff, Cloud, LoaderCircle, LogOut, MapPin, TriangleAlert, Wifi } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '@/api/http'
import { offlineApi, offlineLogout, useOfflineSession, type OfflineData, type OfflineSession, type OfflineState } from '@/api/offline'
import AppLoading from '@/components/layout/AppLoading'
import Brand from '@/components/layout/Brand'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import { HeaderAction } from '@/components/layout/StaffLayout'
import Modal from '@/components/ui/Modal'
import { fullName, initials } from '@/domain/rules'
import type { ID, Order, PaymentMethod, PaymentSplit } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { addProduct, cartQty, changeQty, removeLine } from '@/lib/cart'
import { formatNumber } from '@/lib/format'
import { printOrder } from '@/lib/printReceipt'
import { confirmDialog, showToast } from '@/lib/swal'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { removeKey } from '@/store/storage'
import { ticketsStorageKey } from '@/store/storageKeys'
import CartPanel, { type PricedLine } from '../kassa/CartPanel'
import { onlineKassaUrl, releaseHandover, takeHandover } from '../kassa/handover'
import MenuPanel from '../kassa/MenuPanel'
import PaymentModal from '../kassa/PaymentModal'
import { PreparingButton } from '../kassa/QueueButtons'
import ScreenControls from '../kassa/ScreenControls'
import TicketTabs from '../kassa/TicketTabs'
import { hasLines, newOrderId, useTickets, type Ticket, type TicketsState } from '../kassa/useTickets'
import OfflineLogin, { OfflineShell } from './OfflineLogin'
import OfflineOrdersDrawer from './OfflineOrdersDrawer'
import { handleOfflineAuth, useOfflineOrders, useOfflineState } from './useOffline'

/** Internet qaytib hammasi yuborilgach shuncha soniyadan keyin online kassaga o'zi o'tadi (2026-11-11). */
const RETURN_AFTER_SECONDS = 5

/** Internet bor, hamma offline buyurtma markazga yetib bordi, online kassa manzili ma'lum — online'ga qaytsa bo'ladi. */
function canGoOnline(state: OfflineState, data: OfflineData): boolean {
  return state.sync.online === true && state.sync.pending === 0 && !!data.kassaUrl
}

/**
 * Online kassaga: offline server raqamni "unutadi" (keyingi offline'da yana aniqlanadi — kassir kirmagan bo'lsa ham,
 * `leave` ochiq), ochiq cheklar (bo'lsa) manzilda o'tadi. O'sha tabda online kassa sessiyasi saqlangan.
 */
async function goOnline(kassaUrl: string, tickets: TicketsState | null): Promise<void> {
  await offlineApi.leave().catch(() => undefined)
  window.location.assign(onlineKassaUrl(kassaUrl, tickets))
}

/**
 * Online'ga qaytishgacha orqaga sanash (matn); tugagach — [onReturn]. Faqat qaytsa bo'ladigan paytda chiziladi: yechilsa
 * (internet yana uzildi, kassir to'lov oynasini ochdi) — keyingi safar sanash boshidan.
 */
function ReturnCountdown({ onReturn }: { onReturn: () => void }) {
  const t = useT()
  const [left, setLeft] = useState(RETURN_AFTER_SECONDS)
  const returnRef = useRef(onReturn)
  useLayoutEffect(() => {
    returnRef.current = onReturn
  })

  useEffect(() => {
    if (left <= 0) {
      returnRef.current()
      return
    }
    const timer = window.setTimeout(() => setLeft((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [left])

  return <span className="tabular-nums">{t.offline.returnIn(Math.max(0, left))}</span>
}

/**
 * Sinxronlash holati — header ostidagi rangli qator. Internet qaytib hammasi yuborilgach — "Online rejimga qaytish"
 * tugmasi; [autoReturn] bo'lsa — 5 soniyalik sanash va online kassaga o'zi o'tadi.
 */
function SyncBar({ state, canReturn, autoReturn, onReturn }: { state: OfflineState; canReturn: boolean; autoReturn: boolean; onReturn: () => void }) {
  const t = useT()
  const { configured, online, pending, rejected, error } = state.sync
  let tone = 'bg-neutral-700'
  let icon = <LoaderCircle size={14} className="animate-spin" />
  let text = t.offline.statusChecking
  if (!configured) {
    tone = 'bg-amber-600'
    icon = <TriangleAlert size={14} />
    text = t.offline.statusNoSync
  } else if (online === false || (online === null && error)) {
    tone = 'bg-red-700'
    icon = <CloudOff size={14} />
    text = t.offline.statusOffline(pending)
  } else if (online && pending > 0) {
    tone = 'bg-amber-600'
    icon = <Cloud size={14} />
    text = t.offline.statusSending(pending)
  } else if (online) {
    tone = 'bg-emerald-700'
    icon = <Wifi size={14} />
    text = t.offline.statusSynced
  }
  return (
    <div className={`flex min-h-10 flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 text-sm font-semibold text-white sm:px-6 ${tone}`} role="status">
      <span className="flex items-center gap-2">
        {icon}
        {canReturn && autoReturn ? <ReturnCountdown onReturn={onReturn} /> : text}
      </span>
      {rejected > 0 && (
        <span className="flex items-center gap-1.5 rounded-chip bg-black/25 px-2 py-0.5 text-xs">
          <TriangleAlert size={12} />
          {t.offline.statusRejected(rejected)}
        </span>
      )}
      {canReturn && (
        <button type="button" onClick={onReturn} className="ml-auto h-8 cursor-pointer rounded bg-white px-3 text-xs font-bold tracking-wide text-emerald-800 uppercase transition-colors hover:bg-emerald-50">
          {t.offline.backOnline}
        </button>
      )}
    </div>
  )
}

/** Raqam aniq emas (online kassadan o'tilmagan yoki uzoq ishlatilmagan) — kassir oxirgi chekdagi raqamni kiritadi. */
function NumberPrompt({ last, onDone }: { last: number; onDone: () => void }) {
  const t = useT()
  const [value, setValue] = useState(last > 0 ? String(last) : '')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy || value === '') return
    setBusy(true)
    try {
      await offlineApi.setNumber(Number(value))
      onDone()
    } catch (error) {
      handleOfflineAuth(error)
      showToast(errorMessage(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={t.offline.numberTitle}
      onClose={() => undefined}
      dismissable={false}
      size="sm"
      footer={
        <button type="submit" form="offline-number" disabled={busy || value === ''} className="btn-primary h-10 w-full rounded text-sm font-bold tracking-[0.12em] uppercase">
          {t.offline.numberSave}
        </button>
      }
    >
      <form id="offline-number" onSubmit={(event) => void submit(event)} className="space-y-3">
        <p className="text-sm text-neutral-600">{t.offline.numberHint}</p>
        <input
          autoFocus
          inputMode="numeric"
          autoComplete="off"
          aria-label={t.offline.numberTitle}
          value={value === '' ? '' : formatNumber(Number(value))}
          onChange={(event) => setValue(event.target.value.replace(/\D/g, '').slice(0, 6))}
          className="h-14 w-full rounded border border-neutral-300 bg-white px-3 text-center text-3xl font-black tabular-nums"
        />
      </form>
    </Modal>
  )
}

type KassaProps = {
  data: OfflineData
  state: OfflineState
  session: OfflineSession
  /** online kassadan uzatilgan cheklar (shu kassirniki) — saqlanganlari o'rniga */
  initialTickets: TicketsState | null
  /** uzatilgan cheklar olindi — qayta qo'llanmasin */
  onTicketsTaken: () => void
  onRefresh: () => void
}

/** Offline kassa: online kassadagidek menyu, savat, ochiq cheklar va to'lov; buyurtmalar — offline serverga. */
function OfflineKassa({ data, state, session, initialTickets, onTicketsTaken, onRefresh }: KassaProps) {
  const t = useT()
  const ticketsKey = ticketsStorageKey(session.cashier.id)
  const ticketsState = useTickets(ticketsKey, initialTickets)
  const takenRef = useRef(onTicketsTaken)
  useEffect(() => takenRef.current(), [])
  const { tickets, active, updateActive, setOrderId, select, add, close, clear } = ticketsState
  const { lines, orderType, orderNote } = active
  const { orders, reload } = useOfflineOrders()
  const [panel, setPanel] = useState<'pay' | 'orders' | null>(null)
  const branchName = data.branch.name
  // chekda filial nomi emas, manzili chiqadi
  const branchAddress = data.branch.address ?? ''

  const menuProducts = useMemo(() => new Map((data.menu?.products ?? []).map((product) => [product.id, product])), [data.menu])
  const priced: PricedLine[] = lines.flatMap((line) => {
    const product = menuProducts.get(line.productId)
    return product ? [{ ...line, product, price: product.price }] : []
  })
  const total = priced.reduce((sum, line) => sum + (line.price ?? 0) * line.qty, 0)
  const cartCounts = useMemo(() => {
    const counts = new Map<ID, number>()
    for (const line of lines) counts.set(line.productId, (counts.get(line.productId) ?? 0) + line.qty)
    return counts
  }, [lines])
  const preparing = (orders ?? []).filter((order) => order.status === 'preparing').length
  const canReturn = canGoOnline(state, data)
  const leavingRef = useRef(false)

  const closeTicket = async (ticket: Ticket) => {
    const count = cartQty(ticket.lines)
    if (count > 0 && !(await confirmDialog(t.kassa.closeTicketTitle(`${t.kassa.ticket} ${ticket.no}`), t.kassa.closeTicketText(count), t.kassa.closeTicket))) return
    close(ticket.id)
  }

  const submitOrder = async (payment: PaymentMethod, split?: PaymentSplit): Promise<Order | null> => {
    const ticketId = active.id
    const orderId = active.orderId ?? newOrderId()
    if (!active.orderId) setOrderId(ticketId, orderId)
    try {
      const order = await offlineApi.create({
        id: orderId,
        type: orderType,
        items: priced.map((line) => ({ productId: line.productId, qty: line.qty })),
        note: orderNote,
        payment,
        split,
      })
      close(ticketId)
      // mijoz cheki va oshxona cheki (ichimliklarsiz) — bir vaqtda
      printOrder(order, branchAddress, data.menu)
      reload()
      return order
    } catch (error) {
      handleOfflineAuth(error)
      // raqam aniq emas — so'rov oynasi chiqadi
      if (error instanceof ApiError && error.code === 'number_required') onRefresh()
      showToast(errorMessage(error), 'error')
      return null
    }
  }

  /** Internet qaytdi, hammasi yuborildi: ochiq cheklar bilan online kassaga (tugma yoki sanash tugadi — bir marta). */
  const backOnline = async () => {
    if (leavingRef.current) return
    leavingRef.current = true
    const open = hasLines(ticketsState.state) ? ticketsState.state : null
    removeKey(ticketsKey)
    await goOnline(data.kassaUrl, open)
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="shrink-0 bg-coal text-white">
        <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
          <Brand />
          <span className="hidden h-6 w-px bg-coal-line sm:block" />
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <h1 className="title-section truncate text-white">{t.offline.title}</h1>
            <span className="flex items-center gap-1.5 rounded-chip bg-red-600 px-2 py-1 text-xs font-bold tracking-wider uppercase">
              <CloudOff size={12} />
              {t.offline.badge}
            </span>
            {branchName && (
              <span className="hidden items-center gap-1.5 rounded-chip bg-coal-soft px-2 py-1 text-xs font-medium text-white/75 md:inline-flex">
                <MapPin size={12} className="text-taxi" />
                {branchName}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ScreenControls />
            <div className="hidden sm:block">
              <LanguageSwitcher tone="dark" />
            </div>
            <span className="hidden items-center gap-2 lg:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-taxi text-xs font-bold text-coal">{initials(fullName(session.cashier))}</span>
              <span className="leading-tight">
                <span className="block text-sm font-semibold">{fullName(session.cashier)}</span>
                <span className="block text-[11px] text-white/50">{t.roles.cashier}</span>
              </span>
            </span>
            <HeaderAction label={t.common.logout} icon={<LogOut size={16} />} onClick={offlineLogout} compact={false} />
          </div>
        </div>
        {/* to'lov oynasi yoki buyurtmalar ochiq — kassir ish ustida: sanash to'xtaydi, yopilgach boshidan */}
        <SyncBar state={state} canReturn={canReturn} autoReturn={panel === null} onReturn={() => void backOnline()} />
      </header>

      <main className="min-h-0 flex-1">
        {/* online kassadagidek: yotiq ekranda savat doim o'ngda */}
        <div className="flex h-full min-h-0 flex-col md:flex-row">
          <div className="min-h-0 min-w-0 flex-1">
            <MenuPanel
              menu={data.menu ?? undefined}
              cartCounts={cartCounts}
              onAdd={(product) => updateActive((ticket) => ({ lines: addProduct(ticket.lines, product.id) }))}
              // online kassadagi "Tayyorlanmoqda" joyida — kassir odatiga ko'ra shu yerdan buyurtmalarni ochadi
              footer={<PreparingButton count={preparing} onClick={() => setPanel('orders')} />}
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
      </main>

      {panel === 'pay' && <PaymentModal total={total} orderType={orderType} onConfirm={submitOrder} onClose={() => setPanel(null)} />}
      {panel === 'orders' && <OfflineOrdersDrawer orders={orders} branchAddress={branchAddress} menu={data.menu} onChanged={() => reload()} onClose={() => setPanel(null)} />}
      {!state.number.confirmed && <NumberPrompt last={state.number.last} onDone={onRefresh} />}
    </div>
  )
}

/**
 * `/offline` — offline kassa (kassa kompyuteridagi offline serverdan ochiladi, internet yo'q paytda). Online kassadan
 * o'tilganda manzilda kassir, oxirgi raqam, ochiq cheklar va menyu keladi — kassir PIN'siz davom etadi; aks holda
 * (ish stolidagi yorliq, kassa bloklangan edi) — PIN bilan kirish. Buyurtmalar internet qaytgach markazga o'zi ketadi,
 * hammasi yetib borgach 5 soniyadan keyin online kassaga o'zi qaytadi (2026-11-11; avval faqat tugma bilan edi — saytni
 * yangilashda server qayta ishga tushsa kassa offline'da qolib ketardi).
 */
export default function OfflineKassaPage() {
  const t = useT()
  useDocumentTitle(t.offline.title)
  const session = useOfflineSession()
  const { state, down, refresh } = useOfflineState()
  const [handover] = useState(takeHandover)
  const [handoverDone, setHandoverDone] = useState(handover === null)
  // online kassadan kelgan ochiq cheklar — bir marta (kassir chiqib qayta kirsa, to'langan chek qaytib kelmasin)
  const [handoverTickets, setHandoverTickets] = useState(handover?.tickets ?? null)
  const [data, setData] = useState<OfflineData | null>(null)

  // online kassadan kelgan: kassir (kassa bloklanmagan bo'lsa — PIN'siz), raqam, menyu; manzildan o'chiriladi
  useEffect(() => {
    if (!handover) return
    releaseHandover()
    let cancelled = false
    const { branchId, branchName, branchAddress, cashier, lastNumber, returnUrl, menu } = handover
    offlineApi
      .handover({ branchId, branchName, branchAddress, cashier, lastNumber, returnUrl: returnUrl || undefined, menu })
      .then(() => {
        if (handover.locked) offlineLogout()
      })
      .catch((error: unknown) => showToast(errorMessage(error), 'error'))
      .finally(() => {
        if (cancelled) return
        setHandoverDone(true)
        void refresh()
      })
    return () => {
      cancelled = true
    }
  }, [handover, refresh])

  // menyu va kassirlar: o'tishdan keyin, tayyor bo'lganda va har yuborishdan keyin (nusxa yangilangan bo'lishi mumkin)
  const ready = state?.ready ?? false
  const syncedAt = state?.sync.lastSyncAt ?? null
  useEffect(() => {
    if (!handoverDone) return
    offlineApi
      .data()
      .then(setData)
      .catch(() => undefined)
  }, [handoverDone, ready, syncedAt])

  if (down && !state) {
    return (
      <OfflineShell title={t.offline.notReady}>
        <p className="text-sm text-neutral-600">{t.errors.network}</p>
      </OfflineShell>
    )
  }
  if (!state || !handoverDone || (ready && !data)) return <AppLoading />
  if (!state.ready || !data) {
    return (
      <OfflineShell title={t.offline.notReady}>
        <p className="text-sm text-neutral-600">{t.offline.notReadyHint}</p>
      </OfflineShell>
    )
  }
  if (!session) {
    return (
      <>
        <OfflineLogin branchName={data.branch.name} cashiers={data.cashiers} />
        {/* kassir hali kirmagan (yorliq bilan ochilgan, kassir chiqqan) — internet qaytgan bo'lsa ham online kassaga */}
        {canGoOnline(state, data) && (
          <div className="fixed inset-x-0 bottom-0 z-50">
            <SyncBar state={state} canReturn autoReturn onReturn={() => void goOnline(data.kassaUrl, null)} />
          </div>
        )}
      </>
    )
  }

  const initialTickets = handover?.cashier.id === session.cashier.id ? handoverTickets : null
  return (
    <OfflineKassa
      key={session.cashier.id}
      data={data}
      state={state}
      session={session}
      initialTickets={initialTickets}
      onTicketsTaken={() => setHandoverTickets(null)}
      onRefresh={() => void refresh()}
    />
  )
}

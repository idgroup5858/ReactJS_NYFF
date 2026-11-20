import {
  ArrowLeft,
  ArrowLeftRight,
  Bike,
  Check,
  ChefHat,
  CircleAlert,
  Clock,
  CloudOff,
  House,
  MapPin,
  Package,
  PartyPopper,
  Phone,
  SearchX,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { io, type Socket } from 'socket.io-client'
import { ApiError, serverNow } from '../api'
import { findOrder, refreshBranches, refreshOrder, saveOrderState } from '../data'
import { format, progress, type TrackingStep } from '../domain'
import { useLocalize, useT, type Dict } from '../i18n'
import { cx, feeText, headlineText, money, paymentText } from '../labels'
import { useNav } from '../nav'
import { catalogStore, ordersStore, useStore, type SavedOrder } from '../store'
import type { Branch, CustomerOrder } from '../types'
import { BottomBar, Card, DarkButton, Notice, Outcome } from '../ui'

const POLL_MS = 12_000

/**
 * Buyurtma holati (Android `TrackingScreen`, API.md 5.5): sahifa ko'rinib turganda Socket.IO (`order:<id>`) tinglanadi,
 * har ulanishda REST'dan qayta olinadi, socket ulanmagan paytda har 12 soniyada so'rov. Har yangi holat qurilmaga yoziladi.
 */
export default function TrackingPage() {
  const t = useT()
  const nav = useNav()
  const { orderId = '' } = useParams()
  const orders = useStore(ordersStore)
  const { branches } = useStore(catalogStore)
  const saved = orders.find((o) => o.order.id === orderId)
  const [live, setLive] = useState(false)
  const [offline, setOffline] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    // filial nomi va telefoni uchun; bo'lmasa ham holat ko'rinadi
    if (!catalogStore.get().branches) void refreshBranches().catch(() => undefined)
  }, [])

  useEffect(() => {
    let socket: Socket | null = null
    let timer: number | undefined
    let isLive = false
    const markLive = (value: boolean) => {
      isLive = value
      setLive(value)
    }

    const refresh = async () => {
      try {
        await refreshOrder(orderId)
        setOffline(false)
        setNotFound(false)
      } catch (e) {
        if (e instanceof ApiError && e.code === 'network') setOffline(true)
        else if (e instanceof ApiError && e.code === 'not_found') {
          setNotFound(true)
          setOffline(false)
        }
      }
    }

    const start = () => {
      if (socket) return
      void refresh()
      const current = findOrder(orderId)
      if (!current || !progress.isLive(current.order)) return
      socket = io(window.location.origin, { auth: { orderId, orderToken: current.token }, transports: ['websocket'] })
      // har ulanish va qayta ulanishda — uzilish paytidagi xabarlar yo'qolgan bo'lishi mumkin
      socket.on('connect', () => void refresh())
      socket.on('ready', () => {
        markLive(true)
        setOffline(false)
      })
      socket.on('order', (order: CustomerOrder) => saveOrderState(order))
      socket.on('disconnect', () => markLive(false))
      socket.on('auth_error', () => {
        markLive(false)
        socket?.disconnect()
      })
      timer = window.setInterval(() => {
        if (!isLive) void refresh()
      }, POLL_MS)
    }

    const stop = () => {
      socket?.disconnect()
      socket = null
      window.clearInterval(timer)
      markLive(false)
    }

    // fonga ketdi — socket uziladi; qaytganda REST'dan qayta olinadi
    const onVisible = () => (document.visibilityState === 'visible' ? start() : stop())
    start()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      stop()
    }
  }, [orderId])

  if (!saved) {
    return (
      <div className="flex min-h-dvh flex-col">
        <Outcome icon={SearchX} title={t.orderNotFound}>
          <DarkButton onClick={nav.home}>{t.toHome}</DarkButton>
        </Outcome>
      </div>
    )
  }

  const order = saved.order
  const branch = branches?.find((b) => b.id === order.branchId) ?? null
  const inset = 'mx-4'
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex flex-1 flex-col gap-3 pb-4">
        <Header order={order} branch={branch} onBack={nav.back} />
        {notFound ? (
          <Notice className={inset} tone="danger" icon={CircleAlert} title={t.orderNotFound} />
        ) : (
          offline && !live && <Notice className={inset} tone="warning" icon={CloudOff} title={t.offlineHint} />
        )}
        {order.transferCount > 0 && order.status !== 'cancelled' && (
          // dostavkada qaysi filial olgani ko'rsatilmaydi — faqat raqam yangilangani
          <Notice
            className={inset}
            tone="warning"
            icon={ArrowLeftRight}
            title={order.type === 'delivery' ? t.transferredHint : t.transferred(branch?.name ?? '')}
            text={order.type === 'delivery' ? undefined : t.transferredHint}
          />
        )}
        {order.status === 'cancelled' ? (
          <CancelledCard order={order} branch={branch} />
        ) : (
          <>
            {order.returnedAt && (
              <>
                <Notice className={inset} tone="warning" icon={CircleAlert} title={t.returned} text={t.returnedHint} />
                <CallBranch branch={branch} />
              </>
            )}
            <Steps order={order} />
          </>
        )}
        <Details saved={saved} />
      </div>
      <BottomBar>
        <DarkButton onClick={nav.home}>{t.newOrder}</DarkButton>
      </BottomBar>
    </div>
  )
}

function Header({ order, branch, onBack }: { order: CustomerOrder; branch: Branch | null; onBack: () => void }) {
  const t = useT()
  const delivery = order.type === 'delivery'
  // dostavkada filial nomi ko'rsatilmaydi; olib ketishda — mijoz o'zi tanlagan filial
  const place = [delivery ? null : branch?.name, delivery ? t.delivery : t.pickup].filter(Boolean).join(' · ')
  return (
    <header className="relative rounded-b-[24px] bg-(--nyt-header) px-4 pt-4 pb-5">
      <button
        type="button"
        aria-label={t.back}
        onClick={onBack}
        className="absolute top-3 left-3 flex h-10 w-10 items-center justify-center rounded-full bg-(--nyt-header-chip) text-(--nyt-on-header) active:opacity-80"
      >
        <ArrowLeft size={20} />
      </button>
      <div className="flex flex-col items-center pt-1">
        <p className="text-[11px] font-semibold tracking-wider text-(--nyt-on-header-muted) uppercase">{t.orderNo}</p>
        <p className="text-[44px] leading-tight font-black text-(--nyt-accent)">{format.orderNumber(order.number)}</p>
        <p className="flex items-center gap-1 text-[12px] text-(--nyt-on-header-muted)">
          <MapPin size={14} className="text-(--nyt-accent)" />
          {place}
        </p>
      </div>
    </header>
  )
}

interface StepView {
  title: string
  hint: string
  at: string | null
}

/** Bosqich ko'rinishi. Dostavka tayyor, kuryer hali yo'lga chiqmagan — 2-bosqich "Tayyor · kuryer olib ketadi". */
function stepOf(t: Dict, kind: TrackingStep, order: CustomerOrder): StepView {
  switch (kind) {
    case 'placed':
      return { title: t.stepPlaced, hint: t.stepPlacedHint, at: order.createdAt }
    case 'cooking':
      return order.type === 'delivery' && order.status === 'ready'
        ? { title: t.stepReady, hint: t.stepReadyHint, at: order.readyAt }
        : { title: t.stepCooking, hint: t.stepCookingHint, at: order.preparingAt }
    case 'readyPickup':
      return { title: t.stepReadyPickup, hint: t.stepReadyPickupHint, at: order.readyAt }
    case 'onTheWay':
      return { title: t.stepOnTheWay, hint: t.stepOnTheWayHint, at: order.departedAt }
    case 'delivered':
      return { title: t.stepDelivered, hint: t.stepDeliveredHint, at: order.deliveredAt }
  }
}

/** Bosqich ikonkasi — "Buyurtmam" bannerida shu holatdagi ikonka bilan bir xil. */
function stepIcon(kind: TrackingStep, order: CustomerOrder): LucideIcon {
  switch (kind) {
    case 'placed':
      return Clock
    case 'cooking':
      return order.type === 'delivery' && order.status === 'ready' ? Package : ChefHat
    case 'readyPickup':
      return PartyPopper
    case 'onTheWay':
      return Bike
    case 'delivered':
      return House
  }
}

function Steps({ order }: { order: CustomerOrder }) {
  const t = useT()
  const reached = progress.step(order)
  const completed = progress.completed(order)
  const steps = progress.steps(order)
  return (
    <Card className="mx-4">
      <div className="px-3.5 py-3">
        {steps.map((kind, index) => {
          const step = stepOf(t, kind, order)
          const done = index < reached || (completed && index === reached)
          const current = index === reached && !done
          const Icon = done ? Check : stepIcon(kind, order)
          const last = index === steps.length - 1
          return (
            <div key={kind} className="flex gap-2.5">
              <div className="flex flex-col items-center">
                <span
                  className={cx(
                    'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full',
                    done ? 'bg-(--nyt-accent) text-(--nyt-on-accent)' : current ? 'bg-(--nyt-header) text-(--nyt-accent)' : 'bg-(--nyt-muted) text-(--nyt-text-faint)',
                  )}
                  style={current ? { boxShadow: '0 0 0 2px rgba(255, 194, 14, 0.45)' } : undefined}
                >
                  <Icon size={15} className={current ? 'nyt-pulse' : undefined} />
                </span>
                {!last && <span className="w-0.5 flex-1" style={{ background: index < reached ? 'var(--nyt-accent)' : 'var(--nyt-line)' }} />}
              </div>
              <div className={cx('min-w-0 flex-1 pt-1.5', !last && 'pb-3.5')}>
                <div className="flex items-center gap-2">
                  <p className={cx('min-w-0 flex-1 truncate text-[14px] font-bold', done || current ? 'text-(--nyt-text)' : 'text-(--nyt-text-faint)')}>
                    {step.title}
                  </p>
                  {step.at && (done || current) && <span className="text-[12px] text-(--nyt-text-faint)">{format.time(step.at)}</span>}
                </div>
                <p className="text-[12px] text-(--nyt-text-muted)">{step.hint}</p>
                {index === 0 && current && <AcceptCountdown order={order} />}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/** "Filial javobini kutyapmiz · 3:12" — qabul muddati (`routedAt` + 5 daqiqa, server vaqti bo'yicha). */
function AcceptCountdown({ order }: { order: CustomerOrder }) {
  const t = useT()
  const deadline = progress.acceptDeadline(order)
  const [now, setNow] = useState(serverNow)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(serverNow()), 1_000)
    return () => window.clearInterval(timer)
  }, [])
  if (deadline == null) return null
  const left = Math.min((deadline - now) / 1000, progress.ACCEPT_WINDOW_MS / 1000)
  return (
    <p className="pt-1.5 text-[13px] font-semibold text-(--nyt-select)">
      {left > 0 ? t.waitingBranch(format.countdown(left)) : t.waitingBranchLong}
    </p>
  )
}

function CancelledCard({ order, branch }: { order: CustomerOrder; branch: Branch | null }) {
  const t = useT()
  // filial (kassir / admin) bekor qildi — sabab noma'lum: qo'ng'iroq qilish taklifi
  const byBranch = progress.headline(order) === 'cancelled'
  return (
    <>
      <Notice className="mx-4" tone="danger" icon={CircleAlert} title={headlineText(t, order)} text={byBranch ? t.cancelledHint : undefined} />
      {byBranch && <CallBranch branch={branch} />}
    </>
  )
}

/** Filial telefoni — raqam ham ko'rinadi (Telegram ichida qo'ng'iroq havolasi ochilmasa, mijoz o'zi teradi). */
function CallBranch({ branch }: { branch: Branch | null }) {
  const t = useT()
  const number = branch?.phone?.replace(/[^\d+]/g, '') ?? ''
  if (!number) return null
  return (
    <div className="mx-4">
      <a
        href={`tel:${number}`}
        className="inline-flex h-[38px] items-center gap-2 rounded-full bg-(--nyt-accent) px-4 text-[13px] font-bold text-(--nyt-on-accent) active:opacity-80"
      >
        <Phone size={16} />
        {t.callBranch} · {branch?.phone}
      </a>
    </div>
  )
}

function Details({ saved }: { saved: SavedOrder }) {
  const t = useT()
  const localize = useLocalize()
  const order = saved.order
  const fee = order.deliveryFee ?? saved.deliveryFee
  const address = order.online?.address ?? ''
  return (
    <Card className="mx-4">
      <div className="flex flex-col gap-1 px-3.5 py-3 text-[13px]">
        {order.items.map((item, i) => (
          <div key={`${item.productId}-${i}`} className="flex gap-3">
            <span className="flex-1 text-(--nyt-text-muted)">
              {item.qty}× {localize(item.name)}
              {item.note ? ` (${item.note})` : ''}
            </span>
            <span className="whitespace-nowrap text-(--nyt-text)">{money(t, item.price * item.qty)}</span>
          </div>
        ))}
        {order.type === 'delivery' &&
          (fee == null ? (
            // narx noma'lum — ikki ustunga bo'linmaydi, bitta jumla
            <p className="text-(--nyt-text-muted)">{t.feeCourierNote}</p>
          ) : (
            <div className="flex gap-3 text-(--nyt-text-muted)">
              <span className="flex-1">
                {t.deliveryFee} · {t.feeSeparate}
              </span>
              <span className="whitespace-nowrap">{feeText(t, fee)}</span>
            </div>
          ))}
        <div className="my-1 border-t border-(--nyt-line)" />
        <div className="flex items-center gap-3">
          <span className="flex-1 text-(--nyt-text-muted)">{paymentText(t, order)}</span>
          <span className="text-[17px] font-extrabold text-(--nyt-text)">{money(t, order.total)}</span>
        </div>
        {address && (
          <p className="flex items-start gap-1 text-(--nyt-text-muted)">
            <MapPin size={14} className="mt-0.5 shrink-0 text-(--nyt-text-faint)" />
            {address}
          </p>
        )}
        {order.note && (
          <p className="text-(--nyt-text-muted)">
            {t.note}: {order.note}
          </p>
        )}
        <p className="text-(--nyt-text-faint)">{format.dateTime(order.createdAt)}</p>
      </div>
    </Card>
  )
}

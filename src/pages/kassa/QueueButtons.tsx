import { Bike, ChevronRight, ClipboardList, MonitorSmartphone, Smartphone, type LucideIcon } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '@/i18n'
import { formatElapsed, minutesSince, useNow } from '@/lib/useNow'

/** To'lqinlar soni — bir-biridan [RIPPLE_GAP_S] keyin chiqadi (bitta to'lqin `ripple-wave` — 2.4 s). */
const RIPPLES = 3
const RIPPLE_GAP_S = 0.8

/**
 * Kassir ko'rmagan buyurtma — tugmadan butun ekranga qizil to'lqinlar tarqaladi. `body`ga chiqariladi (ota bloklar
 * qirqmasin), ekran chetida qirqiladi. Hech narsani to'smaydi (`pointer-events: none`), faqat transform / opacity
 * o'zgaradi — GPU chizadi, kassa ishi sekinlashmaydi. Oyna o'lchami yoki tugma joyi o'zgarsa — markaz qayta o'lchanadi.
 */
function Ripple({ anchor }: { anchor: RefObject<HTMLElement | null> }) {
  const [box, setBox] = useState<{ x: number; y: number; r: number } | null>(null)

  useLayoutEffect(() => {
    const element = anchor.current
    if (!element) return
    const measure = () => {
      const rect = element.getBoundingClientRect()
      const x = rect.left + rect.width / 2
      const y = rect.top + rect.height / 2
      // eng uzoq burchakkacha — to'lqin butun ekranni qoplasin
      const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
      setBox({ x, y, r })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [anchor])

  if (!box) return null
  return createPortal(
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[55] overflow-hidden">
      {Array.from({ length: RIPPLES }, (_, i) => (
        <span
          key={i}
          className="ripple-wave absolute rounded-full"
          style={{ left: box.x - box.r, top: box.y - box.r, width: box.r * 2, height: box.r * 2, animationDelay: `${i * RIPPLE_GAP_S}s` }}
        />
      ))}
    </div>,
    document.body,
  )
}

/**
 * Eng eski kutayotgan buyurtma qancha kutyapti — "1:24 kutyapti". 2 daqiqadan — qora belgi, 4 dan — qizil (mobil
 * buyurtmani 5 daqiqada qabul qilish kerak). Soniyasiga faqat shu yozuv yangilanadi — butun kassa emas.
 */
function WaitingTimer({ since, dark }: { since: string; dark: boolean }) {
  const t = useT()
  const now = useNow(1000)
  const minutes = minutesSince(since, now)
  const text = t.kassa.waiting(formatElapsed(since, now))
  const badge = minutes >= 4 ? 'bg-red-700 text-white ring-1 ring-white' : minutes >= 2 ? 'bg-coal text-taxi' : null
  if (badge) return <span className={`mt-0.5 inline-block max-w-full truncate rounded-chip px-1.5 text-xs leading-5 font-bold tabular-nums ${badge}`}>{text}</span>
  return <span className={`block truncate text-xs font-semibold tabular-nums ${dark ? 'text-white/70' : 'text-coal/75'}`}>{text}</span>
}

type ButtonProps = {
  icon: LucideIcon
  title: string
  hint: string
  count: number
  alert: boolean
  dark: boolean
  onClick: () => void
  className?: string
  /** kassir ko'rmagan buyurtma bor — fon qizil bo'lib miltillaydi, ikonka silkinadi, ekranga to'lqin tarqaladi */
  ringing?: boolean
  /** eng eski kutayotgan buyurtma kelgan vaqt — izoh o'rnida taymer */
  waitingSince?: string | null
}

function QueueButton({ icon: Icon, title, hint, count, alert, dark, onClick, className = '', ringing = false, waitingSince = null }: ButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={`group relative isolate flex min-w-0 cursor-pointer items-center gap-2.5 rounded-card p-3 text-left shadow-card transition-transform active:scale-[0.98] @6xl:gap-3 ${dark ? 'bg-coal text-white' : 'bg-taxi text-coal'} ${className}`}
    >
      {/* fon ustida, yozuv ostida (isolate + -z) — matn o'qilaveradi */}
      {ringing && <span aria-hidden className="queue-flash pointer-events-none absolute inset-0 -z-10 rounded-card bg-red-600" />}
      {ringing && <Ripple anchor={ref} />}
      {alert && (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-4 w-4 rounded-full bg-red-600 ring-2 ring-white" />
        </span>
      )}
      <span
        className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-full @5xl:flex @6xl:h-11 @6xl:w-11 ${dark ? 'bg-taxi text-coal' : 'bg-coal text-taxi'} ${ringing ? 'queue-wiggle' : ''}`}
      >
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm leading-tight font-extrabold @6xl:text-base">{title}</span>
        {waitingSince ? (
          <WaitingTimer since={waitingSince} dark={dark} />
        ) : (
          <span className={`hidden truncate text-xs @6xl:block ${dark ? 'text-white/60' : 'text-coal/70'}`}>{hint}</span>
        )}
      </span>
      <span className="shrink-0 text-2xl font-black tabular-nums @6xl:text-3xl">{count}</span>
      <ChevronRight size={20} className="hidden shrink-0 transition-transform group-hover:translate-x-1 @6xl:block" />
    </button>
  )
}

/**
 * @container: ustun torayganda tugmalar ixchamlashadi (avval izoh va strelka, torroqda — ikonka doirasi yashirinadi);
 * 4 ta tugma — chegaralar kengroq, "Tayyorlanmoqda" yozuvi qisqarmasin.
 */
function QueueRow({ children }: { children: ReactNode }) {
  return <div className="@container grid shrink-0 grid-cols-4 gap-3 px-4 pb-4">{children}</div>
}

/**
 * Offline kassa: faqat "Tayyorlanmoqda" (online, kiosk va dostavka buyurtmalari offline'da yo'q) — online kassadagi
 * joyida (3-ustun) va ko'rinishida, kassir odatiga ko'ra bosadi.
 */
export function PreparingButton({ count, onClick }: { count: number; onClick: () => void }) {
  const t = useT()
  return (
    <QueueRow>
      <QueueButton icon={ClipboardList} title={t.orders.preparingTab} hint={t.kassa.preparingHint} count={count} alert={false} dark onClick={onClick} className="col-start-3" />
    </QueueRow>
  )
}

type Props = {
  online: number
  pending: number
  preparing: number
  delivery: number
  /** "Yetkazib bo'lmadi" bilan qaytgan dostavkalar — kassir hal qilishi kerak */
  returned: number
  /** "Ishdaman" yoqilgan kuryerlar; `null` — hali yuklanmagan */
  couriersOnDuty: number | null
  /** eng eski kutayotgan online / kiosk buyurtma kelgan vaqt; `null` — kutayotgani yo'q */
  onlineSince: string | null
  kioskSince: string | null
  /** kassir ko'rmagan online / kiosk buyurtma bor */
  onlineRinging: boolean
  kioskRinging: boolean
  onOnline: () => void
  onKiosk: () => void
  onPreparing: () => void
  onDelivery: () => void
}

/**
 * Kassirning eng ko'p bosiladigan tugmalari — menyu ostida, kiosk bosh ekranidagi tanlov tugmalari uslubida:
 * mobil ilovadan kelgan online buyurtmalar va kioskdan kelgan to'lanmaganlar (sariq — kassir kutilmoqda), oshxonadagilar
 * va kuryer ishidagi dostavkalar (qora; ostida — ishdagi kuryerlar soni). Kassir kutilayotgan bo'lsa (yangi buyurtma,
 * kuryer qaytargani, dostavka bor-u ishda kuryer yo'q) — qizil miltillovchi nuqta. Soni — katta raqam. Kassir hali
 * ko'rmagan online / kiosk buyurtma bo'lsa — tugma qizil miltillaydi; kutayotgani bo'lsa — izoh o'rnida kutish taymeri.
 */
export default function QueueButtons({
  online,
  pending,
  preparing,
  delivery,
  returned,
  couriersOnDuty,
  onlineSince,
  kioskSince,
  onlineRinging,
  kioskRinging,
  onOnline,
  onKiosk,
  onPreparing,
  onDelivery,
}: Props) {
  const t = useT()
  // dostavka kutayotgan bo'lsa-yu, ishda kuryer yo'q — kassir kuryerga qo'ng'iroq qilishi kerak
  const noCourier = couriersOnDuty === 0 && delivery > 0
  const buttons = [
    {
      key: 'online',
      icon: Smartphone,
      title: t.orders.onlineTab,
      hint: t.kassa.onlineHint,
      count: online,
      alert: online > 0,
      onClick: onOnline,
      dark: false,
      ringing: onlineRinging,
      waitingSince: onlineSince,
    },
    {
      key: 'kiosk',
      icon: MonitorSmartphone,
      title: t.orders.kioskTab,
      hint: t.kassa.kioskHint,
      count: pending,
      alert: pending > 0,
      onClick: onKiosk,
      dark: false,
      ringing: kioskRinging,
      waitingSince: kioskSince,
    },
    { key: 'preparing', icon: ClipboardList, title: t.orders.preparingTab, hint: t.kassa.preparingHint, count: preparing, alert: false, onClick: onPreparing, dark: true },
    {
      key: 'delivery',
      icon: Bike,
      title: t.courier.tab,
      hint: couriersOnDuty === null ? t.courier.hint : t.courier.onDuty(couriersOnDuty),
      count: delivery,
      alert: returned > 0 || noCourier,
      onClick: onDelivery,
      dark: true,
    },
  ]

  return (
    <QueueRow>
      {buttons.map(({ key, ...button }) => (
        <QueueButton key={key} {...button} />
      ))}
    </QueueRow>
  )
}

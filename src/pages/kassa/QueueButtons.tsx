import { Bike, ChevronRight, ClipboardList, MonitorSmartphone, Smartphone } from 'lucide-react'
import { useT } from '@/i18n'

type Props = {
  online: number
  pending: number
  preparing: number
  delivery: number
  /** "Yetkazib bo'lmadi" bilan qaytgan dostavkalar — kassir hal qilishi kerak */
  returned: number
  /** "Ishdaman" yoqilgan kuryerlar; `null` — hali yuklanmagan */
  couriersOnDuty: number | null
  onOnline: () => void
  onKiosk: () => void
  onPreparing: () => void
  onDelivery: () => void
}

/**
 * Kassirning eng ko'p bosiladigan tugmalari — menyu ostida, kiosk bosh ekranidagi tanlov tugmalari uslubida:
 * mobil ilovadan kelgan online buyurtmalar va kioskdan kelgan to'lanmaganlar (sariq — kassir kutilmoqda), oshxonadagilar
 * va kuryer ishidagi dostavkalar (qora; ostida — ishdagi kuryerlar soni). Kassir kutilayotgan bo'lsa (yangi buyurtma,
 * kuryer qaytargani, dostavka bor-u ishda kuryer yo'q) — qizil miltillovchi nuqta. Soni — katta raqam.
 */
export default function QueueButtons({ online, pending, preparing, delivery, returned, couriersOnDuty, onOnline, onKiosk, onPreparing, onDelivery }: Props) {
  const t = useT()
  // dostavka kutayotgan bo'lsa-yu, ishda kuryer yo'q — kassir kuryerga qo'ng'iroq qilishi kerak
  const noCourier = couriersOnDuty === 0 && delivery > 0
  const buttons = [
    { key: 'online', icon: Smartphone, title: t.orders.onlineTab, hint: t.kassa.onlineHint, count: online, alert: online > 0, onClick: onOnline, dark: false },
    { key: 'kiosk', icon: MonitorSmartphone, title: t.orders.kioskTab, hint: t.kassa.kioskHint, count: pending, alert: pending > 0, onClick: onKiosk, dark: false },
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
    // @container: ustun torayganda tugmalar ixchamlashadi (avval izoh va strelka, torroqda — ikonka doirasi yashirinadi);
    // 4 ta tugma — chegaralar kengroq, "Tayyorlanmoqda" yozuvi qisqarmasin
    <div className="@container grid shrink-0 grid-cols-4 gap-3 px-4 pb-4">
      {buttons.map(({ key, icon: Icon, title, hint, count, alert, onClick, dark }) => (
        <button
          key={key}
          type="button"
          onClick={onClick}
          className={`group relative flex min-w-0 cursor-pointer items-center gap-2.5 rounded-card p-3 text-left shadow-card transition-transform active:scale-[0.98] @6xl:gap-3 ${dark ? 'bg-coal text-white' : 'bg-taxi text-coal'}`}
        >
          {alert && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-red-600 ring-2 ring-white" />
            </span>
          )}
          <span className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-full @5xl:flex @6xl:h-11 @6xl:w-11 ${dark ? 'bg-taxi text-coal' : 'bg-coal text-taxi'}`}>
            <Icon size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm leading-tight font-extrabold @6xl:text-base">{title}</span>
            <span className={`hidden truncate text-xs @6xl:block ${dark ? 'text-white/60' : 'text-coal/70'}`}>{hint}</span>
          </span>
          <span className="shrink-0 text-2xl font-black tabular-nums @6xl:text-3xl">{count}</span>
          <ChevronRight size={20} className="hidden shrink-0 transition-transform group-hover:translate-x-1 @6xl:block" />
        </button>
      ))}
    </div>
  )
}

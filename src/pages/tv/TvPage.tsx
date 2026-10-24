import { ChefHat, ChevronLeft, Maximize, MapPin, PartyPopper } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { useDb } from '@/api'
import Brand from '@/components/layout/Brand'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import { ORDER_TYPE_ICONS } from '@/components/order/orderIcons'
import { activeOrders, recentReady } from '@/domain/logic/orders'
import type { Order } from '@/domain/types'
import { useT } from '@/i18n'
import { formatOrderNumber, formatTime } from '@/lib/format'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { minutesSince, useNow } from '@/lib/useNow'

/** Shuncha soniya ichida tayyor bo'lgan raqam miltillab turadi. */
const FRESH_SECONDS = 20
/** Plitka balandligi (`h-28`) — ekranga nechta raqam sig'ishini hisoblash uchun. */
const TILE_HEIGHT = 112

/**
 * To'rga nechta plitka to'liq sig'adi (ustunlar × qatorlar). TV o'lchamlari har xil — qat'iy son bo'lsa, kichik ekranda
 * raqamlar indamay yashirinib qolardi.
 */
function useCapacity(grid: HTMLDivElement | null): number {
  const [capacity, setCapacity] = useState(Number.POSITIVE_INFINITY)
  useEffect(() => {
    if (!grid) return
    // ResizeObserver kuzatish boshlanganda ham bir marta chaqiradi
    const observer = new ResizeObserver(() => {
      const style = getComputedStyle(grid)
      const columns = style.gridTemplateColumns.split(' ').length
      const gap = parseFloat(style.rowGap) || 0
      setCapacity(columns * Math.max(1, Math.floor((grid.clientHeight + gap) / (TILE_HEIGHT + gap))))
    })
    observer.observe(grid)
    return () => observer.disconnect()
  }, [grid])
  return capacity
}

/** Sig'magan bo'lsa — oxirgi joyda "yana N ta" plitkasi. */
function fit<T>(items: T[], capacity: number): { shown: T[]; hidden: number } {
  if (items.length <= capacity) return { shown: items, hidden: 0 }
  const shown = items.slice(0, Math.max(0, capacity - 1))
  return { shown, hidden: items.length - shown.length }
}

function Tile({ order, tone, fresh = false }: { order: Order; tone: 'preparing' | 'ready'; fresh?: boolean }) {
  const t = useT()
  const Icon = ORDER_TYPE_ICONS[order.type]
  const ready = tone === 'ready'
  return (
    <div
      className={`flex h-28 items-center justify-between gap-3 rounded-card px-5 ${ready ? 'bg-taxi text-coal' : 'bg-coal-soft text-white ring-1 ring-coal-line'} ${fresh ? 'animate-pulse ring-4 ring-white' : ''}`}
    >
      <span className="text-4xl font-black whitespace-nowrap tabular-nums lg:text-5xl xl:text-6xl">{formatOrderNumber(order.number)}</span>
      <span className={`flex flex-col items-center gap-1 text-xs font-bold tracking-wide whitespace-nowrap uppercase ${ready ? 'text-coal/70' : 'text-white/50'}`}>
        <Icon size={28} />
        <span className="hidden xl:block">{t.orderType[order.type]}</span>
      </span>
    </div>
  )
}

/**
 * TV navbat ekrani (PINsiz, filial manzildan): chapda (60 %) tayyorlanayotganlar, o'ngda (40 %) tayyorlar — katta sariq
 * raqamlar.
 * Kassir "Tayyor" bosgach raqam o'ngga o'tadi va bir necha daqiqadan keyin o'zi tushadi. Kassada to'lanmagan kiosk
 * buyurtmalari ko'rinmaydi. Baza boshqa tabda o'zgarsa darhol yangilanadi.
 */
export default function TvPage() {
  const t = useT()
  const db = useDb()
  const now = useNow(1000)
  const { branchId } = useParams()
  const branch = db.branches.find((b) => b.id === branchId && b.active)
  const [preparingGrid, setPreparingGrid] = useState<HTMLDivElement | null>(null)
  const [readyGrid, setReadyGrid] = useState<HTMLDivElement | null>(null)
  const preparingCapacity = useCapacity(preparingGrid)
  const readyCapacity = useCapacity(readyGrid)
  useDocumentTitle(t.modes.tv.title)
  if (!branch) return <Navigate to="/?mode=tv" replace />

  const preparing = activeOrders(db, branch.id).filter((o) => o.status === 'preparing')
  const ready = recentReady(db, branch.id, now)
  const preparingFit = fit(preparing, preparingCapacity)
  const readyFit = fit(ready, readyCapacity)

  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.()
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-coal text-white">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-coal-line px-6 py-3">
        <div className="flex items-center gap-5">
          <Brand size="lg" />
          <span className="hidden items-center gap-1.5 text-sm font-semibold text-white/60 md:flex">
            <MapPin size={16} className="text-taxi" />
            {branch.name}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-3xl font-black text-taxi tabular-nums">{formatTime(now.toISOString())}</span>
          <LanguageSwitcher tone="dark" />
          <button
            type="button"
            onClick={fullscreen}
            title={t.tv.fullscreen}
            aria-label={t.tv.fullscreen}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded border border-coal-line text-white/60 transition-colors hover:border-taxi hover:text-taxi"
          >
            <Maximize size={16} />
          </button>
          <Link
            to="/"
            title={t.common.back}
            aria-label={t.common.back}
            className="flex h-9 w-9 items-center justify-center rounded border border-coal-line text-white/60 transition-colors hover:border-taxi hover:text-taxi"
          >
            <ChevronLeft size={16} />
          </Link>
        </div>
      </header>

      {/* zaldan ko'rinsin: tayyorlanayotganlar — ekranning 60 % i, tayyorlar — 40 % */}
      <main className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[3fr_2fr]">
        <section className="flex min-h-0 flex-col border-coal-line p-6 md:border-r">
          <h2 className="mb-5 flex items-center gap-3 text-3xl font-extrabold tracking-[0.12em] text-white/85 uppercase">
            <ChefHat size={34} className="text-taxi" />
            {t.tv.preparing}
            <span className="rounded-full bg-white/10 px-3.5 text-2xl tabular-nums">{preparing.length}</span>
          </h2>
          {/* 3 ustun faqat keng ekranda (Full HD TV) — torroqda raqam plitkadan chiqib ketmasin */}
          <div ref={setPreparingGrid} className="grid min-h-0 flex-1 grid-cols-2 content-start gap-4 overflow-hidden 2xl:grid-cols-3">
            {preparingFit.shown.map((order) => (
              <Tile key={order.id} order={order} tone="preparing" />
            ))}
            {preparingFit.hidden > 0 && (
              <div className="flex h-28 items-center justify-center rounded-card border-2 border-dashed border-coal-line text-3xl font-black whitespace-nowrap text-white/60">
                {t.tv.more(preparingFit.hidden)}
              </div>
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col bg-coal-soft/40 p-6">
          <h2 className="mb-5 flex items-center gap-3 text-3xl font-extrabold tracking-[0.12em] text-taxi uppercase">
            <PartyPopper size={34} />
            {t.tv.ready}
            <span className="rounded-full bg-taxi px-3.5 text-2xl text-coal tabular-nums">{ready.length}</span>
          </h2>
          {ready.length === 0 ? (
            <p className="mt-10 text-center text-lg text-white/30">{t.tv.readyEmpty}</p>
          ) : (
            <div ref={setReadyGrid} className="grid min-h-0 flex-1 grid-cols-1 content-start gap-4 overflow-hidden 2xl:grid-cols-2">
              {readyFit.shown.map((order) => (
                <Tile key={order.id} order={order} tone="ready" fresh={!!order.readyAt && minutesSince(order.readyAt, now) * 60 < FRESH_SECONDS} />
              ))}
              {readyFit.hidden > 0 && (
                <div className="flex h-28 items-center justify-center rounded-card border-2 border-dashed border-taxi/50 text-3xl font-black whitespace-nowrap text-taxi">
                  {t.tv.more(readyFit.hidden)}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="shrink-0 bg-taxi px-6 py-3 text-center text-lg font-bold text-coal">{t.tv.hint}</footer>
    </div>
  )
}

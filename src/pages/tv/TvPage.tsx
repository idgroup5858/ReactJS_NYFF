import { ChefHat, MapPin, PartyPopper } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { api } from '@/api'
import { ApiError } from '@/api/http'
import { useBranches, useTvQueue } from '@/api/queries'
import { useRealtime } from '@/api/realtime'
import Brand from '@/components/layout/Brand'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import { ORDER_TYPE_ICONS } from '@/components/order/orderIcons'
import ScreenCodeForm from '@/components/screen/ScreenCodeForm'
import { useScreenStaff } from '@/components/screen/useScreenStaff'
import { READY_SHOWN_MS } from '@/domain/rules'
import type { ID, TvOrder } from '@/domain/types'
import { useT } from '@/i18n'
import { formatOrderNumber, formatTime } from '@/lib/format'
import { enterFullscreen } from '@/lib/fullscreen'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { minutesSince, useNow } from '@/lib/useNow'
import { playReadySound, preloadReadySounds } from '@/lib/readySound'
import { forgetScreenCode, readScreenCode, rememberScreenCode } from '@/store/screenCodes'

/** Shuncha soniya ichida tayyor bo'lgan raqam miltillab turadi. */
const FRESH_SECONDS = 20
/**
 * Plitka balandligi (`h-20`) — ekranga nechta raqam sig'ishini hisoblash uchun. Android TV brauzeri Full HD ni 960×540
 * deb ko'rsatadi (2× piksel) — plitkalar shunga moslab ixcham (2026-11-09: 112 px da chapda 4, o'ngda 2 tagina sig'ardi).
 */
const TILE_HEIGHT = 80
/** Filial tanlash — kirish ekranining TV qadami. */
const CHOOSE_BRANCH_PATH = '/?mode=tv'

type Queue = { preparing: TvOrder[]; ready: TvOrder[] }

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

/**
 * "Tayyor" ga yangi buyurtma tushdi — har biriga bitta ovoz (`playReadySound`, navbatdagisi). Birinchi yuklanishdagi
 * ro'yxat (TV endi ochildi) yangi hisoblanmaydi. [ready] — serverdagi ro'yxat; `undefined` — hali yuklanmagan.
 */
function useReadySounds(ready: TvOrder[] | undefined): void {
  const seen = useRef<Set<ID> | null>(null)
  useEffect(preloadReadySounds, [])
  useEffect(() => {
    if (!ready) return
    if (seen.current) for (const order of ready) if (!seen.current.has(order.id)) playReadySound()
    seen.current = new Set(ready.map((order) => order.id))
  }, [ready])
}

/** Sig'magan bo'lsa — oxirgi joyda "yana N ta" plitkasi. */
function fit<T>(items: T[], capacity: number): { shown: T[]; hidden: number } {
  if (items.length <= capacity) return { shown: items, hidden: 0 }
  const shown = items.slice(0, Math.max(0, capacity - 1))
  return { shown, hidden: items.length - shown.length }
}

function Tile({ order, tone, fresh = false }: { order: TvOrder; tone: 'preparing' | 'ready'; fresh?: boolean }) {
  const t = useT()
  const Icon = ORDER_TYPE_ICONS[order.type]
  const ready = tone === 'ready'
  return (
    <div
      className={`flex h-20 items-center justify-between gap-2 rounded-card px-3 ${ready ? 'bg-taxi text-coal' : 'bg-coal-soft text-white ring-1 ring-coal-line'} ${fresh ? 'animate-pulse ring-4 ring-white' : ''}`}
    >
      <span className="text-3xl font-black whitespace-nowrap tabular-nums lg:text-4xl xl:text-5xl">{formatOrderNumber(order.number)}</span>
      <span className={`flex flex-col items-center gap-0.5 text-[10px] font-bold tracking-wide whitespace-nowrap uppercase ${ready ? 'text-coal/70' : 'text-white/50'}`}>
        <Icon size={20} />
        <span className="hidden xl:block">{t.orderType[order.type]}</span>
      </span>
    </div>
  )
}

/**
 * TV kodi so'raladi: birinchi ochilganda va admin kodni yangilaganda. Kod serverda tekshiriladi (navbat so'rovi bilan),
 * to'g'ri bo'lsa — shu TV da saqlanadi va boshqa so'ralmaydi. Chiqish tugmalari yo'q — xodim logotipni 10 soniya bosib
 * turadi ([onBrandHold]).
 */
function TvCodeScreen({
  branchId,
  branchName,
  notice,
  onConnected,
  onBrandHold,
}: {
  branchId: string
  branchName: string
  /** nima uchun yana so'ralyapti (kod yangilangan, ko'p xato) */
  notice: string | null
  onConnected: (code: string) => void
  onBrandHold: () => void
}) {
  const t = useT()
  useDocumentTitle(t.modes.tv.title)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-coal text-white">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-coal-line px-4 py-2">
        <div className="flex items-center gap-4">
          <Brand onHold={onBrandHold} />
          {branchName && (
            <span className="hidden items-center gap-1.5 text-xs font-semibold text-white/60 md:flex">
              <MapPin size={14} className="text-taxi" />
              {branchName}
            </span>
          )}
        </div>
        <LanguageSwitcher tone="dark" />
      </header>
      <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-4">
        <ScreenCodeForm
          tone="dark"
          title={t.tv.codeTitle}
          hint={t.tv.codeHint}
          notice={notice}
          verify={(code) => api.tv.queue(branchId, code)}
          onConnected={onConnected}
        />
      </main>
    </div>
  )
}

/**
 * Navbat ekrani: chapda (60 %) tayyorlanayotganlar, o'ngda (40 %) tayyorlar — katta sariq raqamlar. Oshpaz yordamchisi
 * "Tayyor" bosgach raqam o'ngga o'tadi va 5 daqiqadan keyin o'zi tushadi (server bu haqda xabar yubormaydi). Navbatda
 * faqat kassa va kioskdagi zalda / olib ketish buyurtmalari — saralashni server qiladi.
 */
function TvScreen({ branchName, queue, onBrandHold }: { branchName: string; queue: Queue | undefined; onBrandHold: () => void }) {
  const t = useT()
  const now = useNow(1000)
  const [preparingGrid, setPreparingGrid] = useState<HTMLDivElement | null>(null)
  const [readyGrid, setReadyGrid] = useState<HTMLDivElement | null>(null)
  const preparingCapacity = useCapacity(preparingGrid)
  const readyCapacity = useCapacity(readyGrid)
  useDocumentTitle(t.modes.tv.title)
  useReadySounds(queue?.ready)

  const preparing = queue?.preparing ?? []
  const ready = (queue?.ready ?? []).filter((o) => o.readyAt && now.getTime() - new Date(o.readyAt).getTime() < READY_SHOWN_MS)
  const preparingFit = fit(preparing, preparingCapacity)
  const readyFit = fit(ready, readyCapacity)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-coal text-white">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-coal-line px-4 py-2">
        <div className="flex items-center gap-4">
          <Brand onHold={onBrandHold} />
          {branchName && (
            <span className="hidden items-center gap-1.5 text-xs font-semibold text-white/60 md:flex">
              <MapPin size={14} className="text-taxi" />
              {branchName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black text-taxi tabular-nums">{formatTime(now.toISOString())}</span>
          <LanguageSwitcher tone="dark" />
        </div>
      </header>

      {/* zaldan ko'rinsin: tayyorlanayotganlar — ekranning 60 % i, tayyorlar — 40 % */}
      <main className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[3fr_2fr]">
        <section className="flex min-h-0 flex-col border-coal-line p-4 md:border-r">
          <h2 className="mb-3 flex items-center gap-2 text-2xl font-extrabold tracking-[0.12em] text-white/85 uppercase">
            <ChefHat size={24} className="text-taxi" />
            {t.tv.preparing}
            <span className="rounded-full bg-white/10 px-3 text-xl tabular-nums">{preparing.length}</span>
          </h2>
          {/* TV (960 px) da 3 ustun — plitka ixcham, raqam sig'adi */}
          <div ref={setPreparingGrid} className="grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-hidden md:grid-cols-3">
            {preparingFit.shown.map((order) => (
              <Tile key={order.id} order={order} tone="preparing" />
            ))}
            {preparingFit.hidden > 0 && (
              <div className="flex h-20 items-center justify-center rounded-card border-2 border-dashed border-coal-line text-2xl font-black whitespace-nowrap text-white/60">
                {t.tv.more(preparingFit.hidden)}
              </div>
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col bg-coal-soft/40 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-2xl font-extrabold tracking-[0.12em] text-taxi uppercase">
            <PartyPopper size={24} />
            {t.tv.ready}
            <span className="rounded-full bg-taxi px-3 text-xl text-coal tabular-nums">{ready.length}</span>
          </h2>
          {ready.length === 0 ? (
            <p className="mt-8 text-center text-base text-white/30">{t.tv.readyEmpty}</p>
          ) : (
            <div ref={setReadyGrid} className="grid min-h-0 flex-1 grid-cols-1 content-start gap-3 overflow-hidden md:grid-cols-2">
              {readyFit.shown.map((order) => (
                <Tile key={order.id} order={order} tone="ready" fresh={!!order.readyAt && minutesSince(order.readyAt, now) * 60 < FRESH_SECONDS} />
              ))}
              {readyFit.hidden > 0 && (
                <div className="flex h-20 items-center justify-center rounded-card border-2 border-dashed border-taxi/50 text-2xl font-black whitespace-nowrap text-taxi">
                  {t.tv.more(readyFit.hidden)}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="shrink-0 bg-taxi px-4 py-2 text-center text-base font-bold text-coal">{t.tv.hint}</footer>
    </div>
  )
}

/**
 * Bitta filial TV si: kod yo'q bo'lsa — kod so'raladi; bor bo'lsa — navbat socket orqali jonli. Admin kodni yangilasa
 * (socket `wrong_tv_code` bilan uziladi yoki navbat 401) — kod unutiladi va yana so'raladi. Filial noma'lum yoki faol
 * emas (ekran ochiq turganda admin o'chirgan bo'lsa ham) — kirishdagi filial tanlashga. Zalda — mijozdan manzil qatori
 * yashirin: to'liq ekranda ushlab turiladi (o'chib-yongach — birinchi bosishda), chiqish tugmasi yo'q — Esc yoki
 * logotipni 10 soniya bosib turib, TV kodi bilan (`useScreenStaff`).
 */
function TvBranch({ branchId }: { branchId: string }) {
  const t = useT()
  const navigate = useNavigate()
  const [code, setCode] = useState(() => readScreenCode('tv', branchId))
  const [notice, setNotice] = useState<string | null>(null)
  const queue = useTvQueue(branchId, code)
  const branches = useBranches()
  const reloadBranches = branches.reload

  /** Saqlangan kod endi ishlamaydi — kod ekraniga ([message] — sababi). */
  const forget = useCallback(
    (message: string) => {
      forgetScreenCode('tv', branchId)
      setCode(null)
      setNotice(message)
    },
    [branchId],
  )

  const queueError = queue.error instanceof ApiError ? queue.error : null
  // navbat 401 — saqlangan kod endi ishlamaydi (admin yangilagan): kod ekrani; yangi kod kiritilganda ustidan yoziladi
  const codeRejected = queueError?.code === 'wrong_tv_code'

  useRealtime(code && !codeRejected ? { tvBranchId: branchId, tvCode: code } : null, {
    onAuthError: (reason) => {
      if (reason === 'wrong_tv_code') forget(t.tv.codeChanged)
      // kod to'g'ri, lekin filial faol emas
      else void navigate(CHOOSE_BRANCH_PATH, { replace: true })
    },
  })

  // navbat 404 — ekran ochiq turganda filial o'chirilgan bo'lishi mumkin: qaror filiallar ro'yxatidan (qaytadan olinadi)
  const notFound = queueError?.status === 404
  useEffect(() => {
    if (notFound) reloadBranches()
  }, [notFound, reloadBranches])

  const staff = useScreenStaff({ verify: (value) => api.tv.queue(branchId, value), changeBranchPath: CHOOSE_BRANCH_PATH })

  const branch = branches.data?.find((b) => b.id === branchId && b.active)
  if (branches.data && !branch) return <Navigate to={CHOOSE_BRANCH_PATH} replace />
  if (!code || codeRejected) {
    return (
      <>
        <TvCodeScreen
          branchId={branchId}
          branchName={branch?.name ?? ''}
          notice={codeRejected ? t.tv.codeChanged : notice}
          onBrandHold={staff.onBrandHold}
          onConnected={(value) => {
            // "Ulash" bosilgani — brauzer ruxsati: TV darhol to'liq ekranda
            enterFullscreen()
            rememberScreenCode('tv', branchId, value)
            setNotice(null)
            setCode(value)
          }}
        />
        {staff.dialog}
      </>
    )
  }
  return (
    <>
      <TvScreen branchName={branch?.name ?? ''} queue={queue.data} onBrandHold={staff.onBrandHold} />
      {staff.dialog}
    </>
  )
}

/** `/tv/:branchId` — PINsiz, filial TV kodi bilan (TV da bir marta kiritiladi); filial manzildan. */
export default function TvPage() {
  const { branchId = null } = useParams()
  if (!branchId) return <Navigate to={CHOOSE_BRANCH_PATH} replace />
  // filial almashsa — kod holati boshidan
  return <TvBranch key={branchId} branchId={branchId} />
}

import '@fontsource-variable/inter/index.css'
import './telegram.css'
import { CircleAlert } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router'
import { currentDict } from './i18n'
import { NavContext, type Nav } from './nav'
import CardBindPage from './pages/CardBindPage'
import CheckoutPage from './pages/CheckoutPage'
import HomePage from './pages/HomePage'
import OrdersPage from './pages/OrdersPage'
import PaymentPage from './pages/PaymentPage'
import ProfilePage from './pages/ProfilePage'
import TrackingPage from './pages/TrackingPage'
import { settingsStore, useStore } from './store'
import { DarkButton, Loading, Outcome } from './ui'
import { loadTelegram, paintTelegram, telegramBackButton } from './webapp'

/*
 * Telegram mini app — mijoz qismi (Android ilovaning web nusxasi): menyu → savat → rasmiylashtirish → (karta) →
 * buyurtma holati; "Buyurtmalarim", "Profil" (kartalar). Xodimlar tizimiga bog'liq emas: hamma kod shu papkada,
 * tashqaridan faqat `app/router.tsx` dagi bitta qator. Olib tashlash — papka va o'sha qator (docs/TELEGRAM.md).
 */

// xarita kutubxonasi og'ir — faqat joy tanlanganda yuklanadi
const LocationPage = lazy(() => import('./pages/LocationPage'))

// manzildagi `#tgWebApp…` parametrlari ichki navigatsiyadan oldin o'qilsin
void loadTelegram()

/** React Router tarixdagi o'rnini `history.state.idx` da saqlaydi. */
const historyIdx = () => (window.history.state as { idx?: number } | null)?.idx ?? 0

const BRAND_BLACK = '#121212'
const PAGE = { light: '#f3f3f3', dark: '#121212' }

export function Component() {
  const { theme, lang } = useStore(settingsStore)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const splat = useParams()['*'] ?? ''
  // mini app qaysi yo'lga ulangan bo'lsa ham (`/telegram`) — kodda yozilmaydi
  const base = (splat ? pathname.slice(0, pathname.length - splat.length) : pathname).replace(/\/+$/, '')
  const atHome = splat.replace(/\/+$/, '') === ''

  // mini app ochilgandagi tarix nuqtasi — "bosh sahifagacha qaytish" undan nariga (xodimlar sahifalariga) o'tmasin
  const [startIdx] = useState(historyIdx)
  // sahifa "Orqaga" ni o'zi hal qilsa (to'lov kutilayotganda — tasdiq oynasi)
  const interceptor = useRef<(() => void) | null>(null)

  const nav = useMemo<Nav>(() => {
    const go: Nav['go'] = (path, options) => navigate(`${base}/${path}`.replace(/\/+$/, '') || '/', options)
    const homeUrl = `${import.meta.env.BASE_URL.replace(/\/+$/, '')}${base}`.replace(/\/+$/, '')
    const atHomeUrl = () => window.location.pathname.replace(/\/+$/, '') === homeUrl

    /** Tarixda mini app boshigacha qaytish; u yer bosh sahifa bo'lmasa — bosh sahifa bilan almashtiriladi. */
    const popToHome = (after: () => void) => {
      const steps = historyIdx() - startIdx
      if (steps <= 0) {
        if (!atHomeUrl()) go('', { replace: true })
        after()
        return
      }
      const onPop = () => {
        window.removeEventListener('popstate', onPop)
        // router o'zi `popstate` ni qayta ishlab bo'lsin
        window.setTimeout(() => {
          if (!atHomeUrl()) go('', { replace: true })
          after()
        }, 0)
      }
      window.addEventListener('popstate', onPop)
      navigate(-steps)
    }

    return {
      go,
      back() {
        const handler = interceptor.current
        if (handler) return handler()
        if (historyIdx() > startIdx) navigate(-1)
        else go('', { replace: true })
      },
      home: () => popToHome(() => {}),
      reset: (path) => popToHome(() => go(path)),
      intercept(handler) {
        interceptor.current = handler
        return () => {
          if (interceptor.current === handler) interceptor.current = null
        }
      },
    }
  }, [base, navigate, startIdx])

  // til, mavzu, sahifa foni (yon tomonlarga tortganda ham), Telegram sarlavhasi
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  useEffect(() => {
    const root = document.documentElement
    const body = document.body
    const before = { scheme: root.style.colorScheme, bg: body.style.backgroundColor }
    root.style.colorScheme = theme
    body.style.backgroundColor = PAGE[theme]
    void loadTelegram().then(() => paintTelegram(BRAND_BLACK, PAGE[theme]))
    return () => {
      root.style.colorScheme = before.scheme
      body.style.backgroundColor = before.bg
    }
  }, [theme])

  // Telegram'dagi "Orqaga" (Android'da — telefonning orqaga tugmasi ham): bosh sahifada yashirinadi
  const onBack = useCallback(() => nav.back(), [nav])
  useEffect(() => {
    let cleanup = () => {}
    let cancelled = false
    void loadTelegram().then(() => {
      if (!cancelled) cleanup = telegramBackButton(atHome ? null : onBack)
    })
    return () => {
      cancelled = true
      cleanup()
    }
  }, [atHome, onBack])

  return (
    <NavContext.Provider value={nav}>
      <Root theme={theme}>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route index element={<HomePage />} />
            <Route path="location" element={<LocationPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="payment/:paymentId" element={<PaymentPage />} />
            <Route path="card" element={<CardBindPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="order/:orderId" element={<TrackingPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to={base || '/'} replace />} />
          </Routes>
        </Suspense>
      </Root>
    </NavContext.Provider>
  )
}

function Root({ theme, children }: { theme: 'light' | 'dark'; children: ReactNode }) {
  return (
    <div className="nyt mx-auto min-h-dvh w-full max-w-[640px]" data-theme={theme}>
      {children}
    </div>
  )
}

/** Kutilmagan xato (sahifa chizilmadi) — xodimlar tizimining xato sahifasi emas, o'zimizniki. */
export function ErrorBoundary() {
  const { theme } = settingsStore.get()
  return <ErrorView theme={theme} />
}

function ErrorView({ theme }: { theme: 'light' | 'dark' }) {
  const t = currentDict()
  return (
    <Root theme={theme}>
      <Outcome icon={CircleAlert} title={t.errors.unknown}>
        <DarkButton onClick={() => window.location.reload()}>{t.retry}</DarkButton>
      </Outcome>
    </Root>
  )
}

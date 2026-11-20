import { APILoadingStatus, APIProvider, Map, useApiLoadingStatus, useMap } from '@vis.gl/react-google-maps'
import { CircleAlert, LocateFixed, MapPin, MapPinOff } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { setDeliveryPoint, updateRoute } from '../data'
import { useT } from '../i18n'
import { useNav } from '../nav'
import { draftStore, settingsStore, useStore } from '../store'
import type { GeoPoint } from '../types'
import { BottomBar, Notice, Outcome, PillButton, PrimaryButton, TopBar } from '../ui'

/** Xodimlar tizimidagi xarita bilan bir xil kalit (`.env` → `VITE_GOOGLE_MAPS_API_KEY`). */
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
/** Joylashuv noma'lum bo'lsa — Toshkent markazi. */
const TASHKENT: GeoPoint = { lat: 41.3111, lng: 69.2797 }

type Locate = 'idle' | 'busy' | 'denied' | 'failed'

/**
 * Yetkazib berish joyi (Android `LocationScreen`): xarita joriy joylashuvda ochiladi, mijoz xaritani surib markazdagi
 * pinni aniq joyga keltiradi. Hududlar va qaysi filial olishi ko'rsatilmaydi. Pullik Geocoding yo'q — manzil matni
 * rasmiylashtirishda qo'lda.
 */
export default function LocationPage() {
  const t = useT()
  const nav = useNav()
  const { lang } = useStore(settingsStore)
  if (!API_KEY) {
    return (
      <div className="flex min-h-dvh flex-col">
        <TopBar title={t.location} onBack={nav.back} />
        <Outcome icon={MapPinOff} title={t.mapUnavailable} text={t.mapUnavailableHint} />
      </div>
    )
  }
  return (
    <APIProvider apiKey={API_KEY} language={lang} region="UZ">
      <LocationMap />
    </APIProvider>
  )
}

function LocationMap() {
  const t = useT()
  const nav = useNav()
  const status = useApiLoadingStatus()
  // saqlangan joy bo'lmasa — xarita joriy joylashuvda ochilsin (darhol aniqlanadi)
  const [start] = useState(() => {
    const saved = draftStore.get().deliveryPoint
    return { point: saved ?? TASHKENT, saved: saved != null, autoLocate: saved == null && 'geolocation' in navigator }
  })
  const center = useRef<GeoPoint>(start.point)
  const [target, setTarget] = useState<GeoPoint | null>(null)
  const [locate, setLocate] = useState<Locate>(start.autoLocate ? 'busy' : 'idle')

  /** GPS so'rovi (bosqich `busy` — chaqiruvchi qo'yadi); javob kelganda xarita o'sha joyga suriladi. */
  const requestPosition = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setTarget({ lat: position.coords.latitude, lng: position.coords.longitude })
        setLocate('idle')
      },
      (error) => setLocate(error.code === error.PERMISSION_DENIED ? 'denied' : 'failed'),
      // yaqinda (2 daqiqa ichida) ma'lum bo'lgan joy darhol, aks holda 20 s gacha
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 120_000 },
    )
  }, [])

  useEffect(() => {
    if (start.autoLocate) requestPosition()
  }, [start, requestPosition])

  const detect = () => {
    if (!('geolocation' in navigator)) {
      setLocate('failed')
      return
    }
    setLocate('busy')
    requestPosition()
  }

  const choose = () => {
    const point = { lat: round(center.current.lat), lng: round(center.current.lng) }
    setDeliveryPoint(point)
    void updateRoute(point).catch(() => undefined)
    nav.back()
  }

  const failed = status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE
  return (
    <div className="flex h-dvh flex-col">
      <TopBar title={t.location} onBack={nav.back} />
      <div className="relative flex-1 bg-(--nyt-muted)">
        {failed ? (
          <Outcome icon={MapPinOff} title={t.mapUnavailable} text={t.mapUnavailableHint} />
        ) : (
          <>
            <Map
              defaultCenter={start.point}
              defaultZoom={start.saved ? 17 : 15}
              gestureHandling="greedy"
              disableDefaultUI
              clickableIcons={false}
              onCameraChanged={(event) => {
                center.current = event.detail.center
              }}
              style={{ position: 'absolute', inset: 0 }}
            />
            <PanTo target={target} />
            {/* markazdagi pin — uchi xarita markazida */}
            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
              <MapPin size={44} strokeWidth={2.2} className="fill-(--nyt-accent) text-(--nyt-header) drop-shadow-md" />
            </div>
          </>
        )}
      </div>
      <BottomBar>
        <p className="text-center text-[13px] text-(--nyt-text-muted)">{t.mapHint}</p>
        {(locate === 'denied' || locate === 'failed') && (
          <Notice tone="warning" icon={CircleAlert} title={locate === 'denied' ? t.locateDenied : t.locateFailed} />
        )}
        <div className="flex justify-center">
          <PillButton icon={LocateFixed} tone="muted" loading={locate === 'busy'} onClick={detect}>
            {locate === 'busy' ? t.checking : t.locate}
          </PillButton>
        </div>
        <PrimaryButton onClick={choose} disabled={failed}>
          {t.chooseThisPlace}
        </PrimaryButton>
      </BottomBar>
    </div>
  )
}

/** GPS aniqlagan joyga xaritani surish. */
function PanTo({ target }: { target: GeoPoint | null }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !target) return
    map.panTo(target)
    if ((map.getZoom() ?? 0) < 16) map.setZoom(17)
  }, [map, target])
  return null
}

/** 6 xona (~10 sm) — serverga ortiqcha aniqlik yuborilmaydi. */
function round(value: number): number {
  return Math.round(value * 1e6) / 1e6
}

import { APILoadingStatus, APIProvider, useApiLoadingStatus } from '@vis.gl/react-google-maps'
import { MapPinOff } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useT } from '@/i18n'
import { useSettings } from '@/store/settingsStore'

/** `.env` dagi kalit (git'ga tushmaydi). */
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined

function MapNotice({ title, text }: { title: string; text: string }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-100 p-6">
      <div className="max-w-sm text-center">
        <MapPinOff size={36} className="mx-auto mb-3 text-neutral-300" />
        <p className="text-sm font-bold text-neutral-800">{title}</p>
        <p className="mt-1 text-sm text-neutral-500">{text}</p>
      </div>
    </div>
  )
}

/** Kalit noto'g'ri, API yoqilmagan yoki Billing ulanmagan — Google'ning inglizcha xatosi o'rniga tushunarli izoh. */
function LoadFailure() {
  const t = useT()
  const status = useApiLoadingStatus()
  if (status !== APILoadingStatus.AUTH_FAILURE && status !== APILoadingStatus.FAILED) return null
  return <MapNotice title={t.admin.delivery.authFailed} text={t.admin.delivery.authFailedHint} />
}

/**
 * Google Maps skriptini faqat xarita kerak bo'lgan sahifada yuklaydi. Ota element `relative` bo'lishi kerak (izohlar
 * xarita ustini qoplaydi). Xarita tili — sahifa ochilgandagi til (skript qayta yuklanmaydi).
 */
export default function MapsProvider({ children }: { children: ReactNode }) {
  const t = useT()
  const { lang } = useSettings()
  const [language] = useState(lang)
  if (!API_KEY) return <MapNotice title={t.admin.delivery.noKey} text={t.admin.delivery.noKeyHint} />
  return (
    <APIProvider apiKey={API_KEY} language={language} region="UZ">
      {children}
      <LoadFailure />
    </APIProvider>
  )
}

import { LoaderCircle, WifiOff } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useT } from '@/i18n'

/** Oyna chiqqach shuncha soniyadan keyin offline kassaga o'zi o'tadi (kassir tugmani bosmasa ham). */
const SWITCH_AFTER_SECONDS = 10

type Props = {
  /** shu kompyuterda offline kassa yoqilgan (sozlamalar) */
  enabled: boolean
  onSwitch: () => void
}

/**
 * Online kassa ustidagi oyna: internet (server) yo'q. Offline kassa yoqilgan bo'lsa — 10 soniyalik orqaga sanash va
 * "Offline rejimga o'tish" (bosilsa — darhol); "Kutib turaman" — sanash to'xtaydi, tugma qoladi. Yoqilmagan bo'lsa —
 * internet qaytishini kutish. Ulanish qaytsa oyna o'zi yopiladi (sahifa o'zgarmaydi).
 */
export default function OfflineSwitch({ enabled, onSwitch }: Props) {
  const t = useT()
  const [paused, setPaused] = useState(false)
  const [left, setLeft] = useState(SWITCH_AFTER_SECONDS)
  const switchRef = useRef(onSwitch)
  useLayoutEffect(() => {
    switchRef.current = onSwitch
  })

  useEffect(() => {
    if (!enabled || paused) return
    if (left <= 0) {
      switchRef.current()
      return
    }
    const timer = window.setTimeout(() => setLeft((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [enabled, paused, left])

  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="offline-switch-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-coal/90 p-4">
      <div className="page-enter w-full max-w-md overflow-hidden rounded-card bg-white text-center shadow-2xl">
        <div className="space-y-3 px-6 pt-8 pb-6">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
            <WifiOff size={30} />
          </span>
          <h2 id="offline-switch-title" className="text-2xl font-black text-neutral-950">
            {t.offline.lostTitle}
          </h2>
          <p className="text-sm text-neutral-600">{t.offline.lostText}</p>
          {enabled ? (
            !paused && <p className="text-sm font-bold text-neutral-950 tabular-nums">{t.offline.switchIn(Math.max(0, left))}</p>
          ) : (
            <p className="text-sm text-neutral-500">{t.offline.notConfigured}</p>
          )}
        </div>
        {enabled ? (
          <div className="flex flex-col gap-2 border-t border-neutral-200 p-4">
            <button type="button" autoFocus onClick={onSwitch} className="btn-primary h-12 w-full rounded text-sm font-bold tracking-[0.12em] uppercase">
              {t.offline.switchNow}
            </button>
            {!paused && (
              <button type="button" onClick={() => setPaused(true)} className="btn-ghost h-10 w-full rounded text-xs font-bold">
                {t.offline.stay}
              </button>
            )}
          </div>
        ) : (
          <p className="flex items-center justify-center gap-2 border-t border-neutral-200 p-4 text-xs font-semibold text-neutral-500">
            <LoaderCircle size={14} className="animate-spin" />
            {t.offline.waiting}
          </p>
        )}
      </div>
    </div>
  )
}

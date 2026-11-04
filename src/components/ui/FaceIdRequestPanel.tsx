import { CircleCheck, CircleX, LoaderCircle, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '@/api'
import type { FaceIdRequest } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'

/** Admin javobini kutish oralig'i. */
const POLL_MS = 3000

type Props = {
  /** so'rovni yuborish: kirish / blok ekranida — PIN bilan, ochiq kassada — token bilan */
  request: () => Promise<FaceIdRequest>
  /** ruxsat berilgach kassir nima qiladi ("PIN kodni qayta kiriting" / "«Smenani topshirish» ni qayta bosing") */
  approvedHint: string
}

/**
 * FaceID: kassir terminaldan o'tolmadi (terminal / HR buzilgan) — "Admindan ruxsat so'rash": so'rov Telegram'dagi
 * adminlarga tugmalar bilan ketadi, javob shu yerda kutiladi (har 3 soniyada). Ruxsat — 10 daqiqa, shu kassir va filial.
 */
export default function FaceIdRequestPanel({ request, approvedHint }: Props) {
  const t = useT()
  const [view, setView] = useState<FaceIdRequest | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const ask = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      setView(await request())
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  // javob kelguncha so'raladi; tarmoq xatosi — keyingi safar
  const pendingId = view?.status === 'pending' ? view.id : null
  useEffect(() => {
    if (!pendingId) return
    const timer = window.setInterval(() => {
      api.faceId
        .status(pendingId)
        .then(setView)
        .catch(() => {})
    }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [pendingId])

  const askButton = (label: string) => (
    <button
      type="button"
      onClick={() => void ask()}
      disabled={busy}
      className="btn-ghost flex h-9 w-full items-center justify-center gap-2 rounded px-3 text-xs font-bold"
    >
      {busy ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />}
      {label}
    </button>
  )

  return (
    <div className="space-y-2 rounded-card border border-line bg-neutral-50 p-3 text-sm" aria-live="polite">
      {!view && (
        <>
          <p className="text-xs leading-relaxed text-neutral-500">{t.faceId.askHint}</p>
          {askButton(t.faceId.ask)}
        </>
      )}
      {view?.status === 'pending' && (
        <p className="flex items-center gap-2 font-semibold text-neutral-700">
          <LoaderCircle size={16} className="shrink-0 animate-spin text-select" />
          {t.faceId.pending}
        </p>
      )}
      {view?.status === 'approved' && (
        <p className="flex items-start gap-2 font-semibold text-emerald-700">
          <CircleCheck size={16} className="mt-0.5 shrink-0" />
          <span>
            {t.faceId.approved} {approvedHint}
          </span>
        </p>
      )}
      {(view?.status === 'rejected' || view?.status === 'expired') && (
        <>
          <p className="flex items-start gap-2 font-semibold text-red-700">
            <CircleX size={16} className="mt-0.5 shrink-0" />
            {view.status === 'rejected' ? t.faceId.rejected : t.faceId.expired}
          </p>
          {askButton(t.faceId.askAgain)}
        </>
      )}
      {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
    </div>
  )
}

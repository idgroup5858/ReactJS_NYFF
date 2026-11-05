import { useEffect, useRef, type ReactNode } from 'react'

/** Yashirin tugma: shuncha vaqt bosib turilsa ishlaydi (mijoz tasodifan bosib qo'ymasin). */
export const HOLD_MS = 10_000

/**
 * Bosib turish (sichqoncha yoki barmoq): [HOLD_MS] dan keyin [onHold], qo'yib yuborilsa yoki barmoq chiqib ketsa —
 * bekor. Ichidagi narsa odatdagidek ko'rinadi (logotip). Bosib turishda brauzer menyusi ochilmaydi, ekran surilmaydi;
 * ushlab turilgandan keyingi "click" o'tkazilmaydi (logotip havola bo'lsa — sahifa almashmaydi).
 */
export default function HoldTarget({ onHold, children }: { onHold: () => void; children: ReactNode }) {
  const timer = useRef<number | null>(null)
  const fired = useRef(false)

  const cancel = () => {
    if (timer.current === null) return
    window.clearTimeout(timer.current)
    timer.current = null
  }
  useEffect(() => cancel, [])

  return (
    <span
      className="inline-flex touch-none select-none [-webkit-touch-callout:none]"
      onPointerDown={(event) => {
        if (event.button !== 0) return
        cancel()
        fired.current = false
        timer.current = window.setTimeout(() => {
          timer.current = null
          fired.current = true
          onHold()
        }, HOLD_MS)
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
      onClickCapture={(event) => {
        if (!fired.current) return
        fired.current = false
        event.preventDefault()
        event.stopPropagation()
      }}
    >
      {children}
    </span>
  )
}

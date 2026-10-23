import { useEffect, useRef } from 'react'

const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const

/** [timeoutMs] davomida sichqoncha, klaviatura yoki sensor harakati bo'lmasa [onIdle] bir marta chaqiriladi. */
export function useIdle(timeoutMs: number, onIdle: () => void, enabled: boolean): void {
  const onIdleRef = useRef(onIdle)
  useEffect(() => {
    onIdleRef.current = onIdle
  })

  useEffect(() => {
    if (!enabled) return
    let timer = window.setTimeout(() => onIdleRef.current(), timeoutMs)
    const reset = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => onIdleRef.current(), timeoutMs)
    }
    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, reset, { passive: true }))
    return () => {
      window.clearTimeout(timer)
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, reset))
    }
  }, [timeoutMs, enabled])
}

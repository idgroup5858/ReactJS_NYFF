import { useEffect, useState } from 'react'
import { dateKey } from '@/domain/dates'
import type { DateKey } from '@/domain/types'

/** Har [intervalMs] da yangilanadigan joriy vaqt — taymerlar (kassa), soat (TV). */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}

/** Bugungi sana (`2026-10-23`) — yarim tundan keyin o'zi yangilanadi. Hisobot va formalarning "bugun"i. */
export function useToday(): DateKey {
  return dateKey(useNow(60_000))
}

/** O'tgan vaqt "m:ss" (1 soatdan oshsa "h:mm:ss"). */
export function formatElapsed(fromIso: string, now: Date): string {
  const total = Math.max(0, Math.floor((now.getTime() - new Date(fromIso).getTime()) / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = String(total % 60).padStart(2, '0')
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`
}

export function minutesSince(fromIso: string, now: Date): number {
  return (now.getTime() - new Date(fromIso).getTime()) / 60_000
}

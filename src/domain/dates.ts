import type { DateKey } from './types.ts'

const pad = (value: number) => String(value).padStart(2, '0')

/** Mahalliy vaqt bo'yicha sana: `2026-10-23`. Buyurtma raqami har kuni shu kalit bo'yicha 1 dan boshlanadi. */
export function dateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** `2026-10-23` → mahalliy yarim tun. */
export function parseDateKey(key: DateKey): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = parseDateKey(key)
  date.setDate(date.getDate() + days)
  return dateKey(date)
}

/** [from] dan [to] gacha (ikkalasi ham kiradi) har bir kun. */
export function dateRange(from: DateKey, to: DateKey): DateKey[] {
  const days: DateKey[] = []
  for (let key = from; key <= to && days.length < 400; key = addDays(key, 1)) days.push(key)
  return days
}

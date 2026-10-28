import { useState } from 'react'
import { addDays } from '@/domain/dates'
import type { DateKey } from '@/domain/types'
import { useToday } from '@/lib/useNow'

export type Preset = 'today' | 'yesterday' | 'week' | 'month' | 'custom'
export type Period = ReturnType<typeof usePeriod>

/** Davr holati: tayyor davr (bugun / kecha / 7 kun / 30 kun) yoki tanlangan oraliq → `range` (ikkala chekka ham kiradi). */
export function usePeriod(initial: Preset) {
  const today = useToday()
  const [preset, setPreset] = useState<Preset>(initial)
  const [custom, setCustom] = useState<{ from: DateKey; to: DateKey }>({ from: addDays(today, -13), to: today })

  const range = (() => {
    switch (preset) {
      case 'today':
        return { from: today, to: today }
      case 'yesterday':
        return { from: addDays(today, -1), to: addDays(today, -1) }
      case 'week':
        return { from: addDays(today, -6), to: today }
      case 'month':
        return { from: addDays(today, -29), to: today }
      case 'custom':
        return custom.from <= custom.to ? custom : { from: custom.to, to: custom.from }
    }
  })()

  return { today, preset, setPreset, custom, setCustom, range }
}

/**
 * Davr, filtr yoki sahifa almashganda yangi javob kelguncha oldingisi ko'rinib turadi — jadval va diagramma bo'shab,
 * sahifa sakramaydi.
 */
export function useLatest<T>(data: T | undefined): T | undefined {
  const [latest, setLatest] = useState(data)
  if (data !== undefined && data !== latest) setLatest(data)
  return data ?? latest
}

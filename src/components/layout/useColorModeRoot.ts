import { useLayoutEffect } from 'react'
import { useSettings } from '@/store/settingsStore'

/**
 * Back-office (admin / ombor) ochiq turganda `<html data-mode>` ni tanlangan rejimga qo'yadi, chiqqanda olib tashlaydi —
 * kassa, kiosk va kirish ekranlari doim yorug' qoladi. `useLayoutEffect` — birinchi chizishdan oldin (oq "chaqnash" yo'q).
 */
export function useColorModeRoot(enabled: boolean): void {
  const { colorMode } = useSettings()
  useLayoutEffect(() => {
    if (!enabled) return
    const root = document.documentElement
    root.dataset.mode = colorMode
    return () => {
      delete root.dataset.mode
    }
  }, [enabled, colorMode])
}

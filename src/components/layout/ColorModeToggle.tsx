import { Moon, Sun } from 'lucide-react'
import { useT } from '@/i18n'
import { setColorMode, useSettings } from '@/store/settingsStore'
import { HEADER_BUTTON } from './headerButton'

/**
 * Header'dagi yorug' / qorong'i almashtirgich (admin / ombor) — mavzu tugmasi bilan bir xil ko'rinishda. Tanlov shu
 * qurilmada saqlanadi; `<html data-mode>` ni [useColorModeRoot] qo'yadi.
 */
export default function ColorModeToggle() {
  const t = useT()
  const { colorMode } = useSettings()
  const dark = colorMode === 'dark'
  const label = dark ? t.theme.lightMode : t.theme.darkMode
  return (
    <button type="button" onClick={() => setColorMode(dark ? 'light' : 'dark')} title={label} aria-label={label} aria-pressed={dark} className={HEADER_BUTTON}>
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}

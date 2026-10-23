import { Check, Hamburger, Palette } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useT } from '@/i18n'
import { ICON_STYLES, setIconStyle, setTheme, THEMES, useSettings, type Theme } from '@/store/settingsStore'
import { HEADER_BUTTON } from './headerButton'

/** Mavzu namunasi: fon · kartochka · aksent. */
const SWATCHES: Record<Theme, [string, string, string]> = {
  soft: ['#f1f1ed', '#121212', '#ffc20e'],
  gomeal: ['#f3f3f3', '#ffffff', '#f9b406'],
  modern: ['#eef0f4', '#ffffff', '#fe9a00'],
}

/** Header'dagi ko'rinish tanlovi: palitra tugmasi → mavzular ro'yxati. Tanlov shu qurilmada saqlanadi. */
export default function ThemeMenu() {
  const t = useT()
  const { theme, iconStyle } = useSettings()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t.theme.title}
        aria-label={t.theme.title}
        className={HEADER_BUTTON}
      >
        <Palette size={16} />
      </button>
      {open && (
        <div role="menu" className="absolute top-full right-0 z-40 mt-2 w-56 rounded-card bg-white p-1.5 text-neutral-900 shadow-float">
          <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-bold tracking-[0.14em] text-neutral-400 uppercase">{t.theme.title}</p>
          {THEMES.map((value) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={value === theme}
              onClick={() => {
                setTheme(value)
                setOpen(false)
              }}
              className="flex w-full cursor-pointer items-center gap-3 rounded px-2.5 py-2 text-left text-sm font-semibold transition-colors hover:bg-neutral-100"
            >
              <span className="flex h-6 w-9 shrink-0 overflow-hidden rounded-chip ring-1 ring-neutral-200">
                {SWATCHES[value].map((color) => (
                  <span key={color} className="flex-1" style={{ backgroundColor: color }} />
                ))}
              </span>
              <span className="flex-1">{t.theme[value]}</span>
              {value === theme && <Check size={16} className="text-select" />}
            </button>
          ))}
          {/* kategoriya ikonkalari — mavzudan alohida */}
          <p className="mt-1 border-t border-neutral-100 px-2.5 pt-2.5 pb-1 text-[10px] font-bold tracking-[0.14em] text-neutral-400 uppercase">{t.theme.icons}</p>
          {ICON_STYLES.map((value) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={value === iconStyle}
              onClick={() => {
                setIconStyle(value)
                setOpen(false)
              }}
              className="flex w-full cursor-pointer items-center gap-3 rounded px-2.5 py-2 text-left text-sm font-semibold transition-colors hover:bg-neutral-100"
            >
              <span className="flex h-6 w-9 shrink-0 items-center justify-center overflow-hidden rounded-chip bg-neutral-100 ring-1 ring-neutral-200">
                {value === 'line' ? (
                  <Hamburger size={16} strokeWidth={1.75} />
                ) : value === '3d' ? (
                  <img src="/images/icons/hamburger.png" alt="" className="h-5 w-5" />
                ) : (
                  <img src="/images/categories/burgers.jpg" alt="" className="h-full w-full object-cover" />
                )}
              </span>
              <span className="flex-1">{t.theme.iconStyles[value]}</span>
              {value === iconStyle && <Check size={16} className="text-select" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

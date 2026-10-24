import { RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import Brand from '@/components/layout/Brand'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import ThemeMenu from '@/components/layout/ThemeMenu'
import { useT } from '@/i18n'

/** Kiosk tepa paneli: brend, o'rtada qo'shimcha element (buyurtma turi), til, ko'rinish va "Boshidan". */
export default function KioskTopBar({ center, onStartOver }: { center?: ReactNode; onStartOver: () => void }) {
  const t = useT()
  return (
    <header className="flex shrink-0 items-center gap-2 bg-white px-3 py-3 text-neutral-950 shadow-card sm:gap-4 sm:px-6">
      <span className="hidden sm:block">
        <Brand tone="light" size="lg" />
      </span>
      <span className="sm:hidden">
        <Brand tone="light" />
      </span>
      <div className="flex min-w-0 flex-1 justify-center">{center}</div>
      <LanguageSwitcher tone="light" />
      <ThemeMenu tone="light" />
      <button
        type="button"
        onClick={onStartOver}
        className="flex h-11 cursor-pointer items-center gap-2 rounded border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-700 transition-colors hover:border-select"
      >
        <RotateCcw size={18} />
        <span className="hidden md:inline">{t.kiosk.startOver}</span>
      </button>
    </header>
  )
}

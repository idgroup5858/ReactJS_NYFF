import { ChevronRight, MapPin, ShoppingBag, Utensils, X } from 'lucide-react'
import { Link } from 'react-router'
import Brand from '@/components/layout/Brand'
import FoodImage from '@/components/ui/FoodImage'
import { LANGS, type Branch, type Lang, type OrderType } from '@/domain/types'
import { LANG_LABELS, useT } from '@/i18n'
import { setLang, useSettings } from '@/store/settingsStore'

const HERO_IMAGES = ['/images/products/burger-big-ny.jpg', '/images/products/lavash-beef.jpg', '/images/products/fries.jpg']
/** oq (6px) + sariq (8px) halqa va soya */
const SMALL_RING = 'shadow-[0_0_0_6px_#fff,0_0_0_14px_var(--color-taxi),0_24px_40px_-16px_rgba(0,0,0,0.45)]'

/**
 * Kioskning bosh ekrani ("Och qoldingizmi? Buyurtma bering." — mobil ilova andozasi): katta sarlavha, taom rasmlari,
 * til tanlovi va "Shu yerda / Olib ketaman" tanlovi — bosilgach menyu ochiladi.
 */
export default function KioskWelcome({ branch, onStart }: { branch: Branch; onStart: (type: OrderType) => void }) {
  const t = useT()
  const { lang } = useSettings()

  const choices: { type: OrderType; icon: typeof Utensils; title: string; hint: string }[] = [
    { type: 'dine_in', icon: Utensils, title: t.kiosk.dineIn, hint: t.kiosk.dineInHint },
    { type: 'takeaway', icon: ShoppingBag, title: t.kiosk.takeaway, hint: t.kiosk.takeawayHint },
  ]

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -right-40 h-[38rem] w-[38rem] rounded-full bg-taxi/40 blur-3xl" />
      <header className="relative flex items-center justify-between gap-4 px-6 py-5 sm:px-10">
        <Brand tone="light" size="lg" />
        <span className="flex items-center gap-1.5 text-sm font-semibold text-neutral-500">
          <MapPin size={16} className="text-select" />
          {branch.name}
        </span>
      </header>

      <main className="relative grid flex-1 items-center gap-10 px-6 pb-10 sm:px-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-8">
          <h1 className="text-5xl leading-[1.05] font-black tracking-tight text-neutral-950 sm:text-7xl lg:text-6xl xl:text-7xl">
            {t.kiosk.welcomeTitle}
            <br />
            <span className="text-neutral-400">{t.kiosk.welcomeAccent}</span>
          </h1>
          <p className="max-w-lg text-lg text-neutral-600">{t.kiosk.welcomeText}</p>

          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t.common.language}>
            {LANGS.map((value: Lang) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={value === lang}
                onClick={() => setLang(value)}
                className={`h-12 cursor-pointer rounded border-2 px-5 text-base font-bold transition-colors ${value === lang ? 'border-select bg-taxi text-coal' : 'border-transparent bg-white text-neutral-600 shadow-card hover:border-neutral-200'}`}
              >
                {LANG_LABELS[value]}
              </button>
            ))}
          </div>

          <div>
            <p className="mb-3 text-[11px] font-bold tracking-[0.2em] text-neutral-400 uppercase">{t.kiosk.chooseType}</p>
            {/* ikkitasi yonma-yon sig'masa (tor ustun) — ustma-ust; matn qisilmaydi */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,21rem),1fr))] gap-3">
              {choices.map(({ type, icon: Icon, title, hint }, index) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => onStart(type)}
                  className={`group flex cursor-pointer items-center gap-4 rounded-card p-5 text-left shadow-card transition-transform active:scale-[0.98] ${index === 0 ? 'bg-coal text-white' : 'bg-taxi text-coal'}`}
                >
                  <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${index === 0 ? 'bg-taxi text-coal' : 'bg-coal text-taxi'}`}>
                    <Icon size={30} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-2xl font-extrabold whitespace-nowrap">{title}</span>
                    <span className={`block text-sm ${index === 0 ? 'text-white/60' : 'text-coal/70'}`}>{hint}</span>
                  </span>
                  <ChevronRight size={28} className="shrink-0 transition-transform group-hover:translate-x-1" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative mx-auto hidden aspect-square w-full max-w-xl lg:block">
          <div className="absolute inset-[8%] rounded-full bg-taxi" />
          <FoodImage src={HERO_IMAGES[0]} alt="" className="absolute inset-[14%] h-[72%] w-[72%] rounded-full shadow-2xl ring-8 ring-white" />
          {/* kichik rasmlar ham o'rtadagidek: ichida oq, tashqarisida sariq chegara */}
          <FoodImage src={HERO_IMAGES[1]} alt="" className={`absolute top-[2%] left-[2%] h-[26%] w-[26%] rounded-full ${SMALL_RING}`} />
          <FoodImage src={HERO_IMAGES[2]} alt="" className={`absolute right-[0%] bottom-[6%] h-[28%] w-[28%] rounded-full ${SMALL_RING}`} />        </div>
      </main>

      <Link
        to="/"
        aria-label={t.kiosk.exit}
        title={t.kiosk.exit}
        className="absolute bottom-3 left-3 flex h-8 w-8 items-center justify-center rounded-full text-neutral-300 transition-colors hover:bg-white hover:text-neutral-600"
      >
        <X size={16} />
      </Link>
    </div>
  )
}

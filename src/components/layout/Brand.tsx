import HoldTarget from '@/components/ui/HoldTarget'

type Props = {
  /** qora fon ustida — yozuv oq */
  tone?: 'light' | 'dark'
  size?: 'md' | 'lg'
  /** yashirin tugma: logotip 10 soniya bosib turilsa (oshxona — to'liq ekran, TV / kiosk — xodim oynasi) */
  onHold?: () => void
}

/** Sariq "NY" belgisi + ikki qatorli nom (taksi uslubi). */
export default function Brand({ tone = 'dark', size = 'md', onHold }: Props) {
  const badge = size === 'lg' ? 'h-12 w-12 text-lg' : 'h-9 w-9 text-[13px]'
  const title = size === 'lg' ? 'text-base' : 'text-[13px]'
  const brand = (
    <span className="flex items-center gap-2.5 select-none">
      <span className={`flex shrink-0 items-center justify-center rounded bg-taxi font-black tracking-tight text-coal ${badge}`}>NY</span>
      <span className="leading-none">
        <span className={`block font-extrabold tracking-[0.18em] uppercase ${title} ${tone === 'dark' ? 'text-white' : 'text-neutral-950'}`}>
          New York
        </span>
        <span className={`mt-1 block text-[10px] font-semibold tracking-[0.32em] uppercase ${tone === 'dark' ? 'text-taxi' : 'text-brand-600'}`}>Fast Food</span>
      </span>
    </span>
  )
  return onHold ? <HoldTarget onHold={onHold}>{brand}</HoldTarget> : brand
}

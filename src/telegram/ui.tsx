import { ArrowLeft, LoaderCircle, Minus, Plus, Utensils, type LucideIcon } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useT } from './i18n'
import { cx, imageUrl } from './labels'

/*
 * Mini app komponentlari — Android ilovadagi `ui/common` ko'rinishida. Ranglar `telegram.css` dagi `--nyt-*`
 * o'zgaruvchilaridan; xodimlar tizimi komponentlari (`@/components`) ishlatilmaydi.
 */

// ---------------------------------------------------------------- tuzilma

/** Oq sarlavha: orqaga tugmasi va nom. */
export function TopBar({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack?: () => void; right?: ReactNode }) {
  const t = useT()
  return (
    <header className="sticky top-0 z-20 flex items-center gap-1 bg-(--nyt-surface) px-2 py-2">
      {onBack ? <IconButton icon={ArrowLeft} label={t.back} onClick={onBack} size={44} iconSize={22} /> : <span className="w-3" />}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[20px] leading-tight font-extrabold text-(--nyt-text)">{title}</h1>
        {subtitle && <p className="truncate text-[12px] text-(--nyt-text-muted)">{subtitle}</p>}
      </div>
      {right}
    </header>
  )
}

/** Pastki panel (asosiy tugma) — ekran pastiga yopishgan. */
export function BottomBar({ children }: { children: ReactNode }) {
  return <div className="nyt-safe-bottom sticky bottom-0 z-20 flex flex-col gap-2 bg-(--nyt-surface) px-3 pt-3">{children}</div>
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const base = 'rounded-[16px] border border-(--nyt-card-border) bg-(--nyt-surface)'
  if (!onClick) return <div className={cx(base, className)}>{children}</div>
  return (
    <button type="button" onClick={onClick} className={cx(base, 'block w-full text-left active:opacity-80', className)}>
      {children}
    </button>
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="px-1 text-[12px] font-bold tracking-wide text-(--nyt-text-muted) uppercase">{children}</h2>
}

// ---------------------------------------------------------------- tugmalar

export function IconButton({
  icon: Icon,
  label,
  onClick,
  size = 40,
  iconSize = 20,
  className,
  disabled,
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  size?: number
  iconSize?: number
  className?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label || undefined}
      onClick={onClick}
      disabled={disabled}
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full active:opacity-70 disabled:opacity-40', className ?? 'text-(--nyt-text)')}
      style={{ width: size, height: size }}
    >
      <Icon size={iconSize} />
    </button>
  )
}

export function PrimaryButton({
  children,
  trailing,
  onClick,
  disabled,
  loading,
}: {
  children: ReactNode
  trailing?: ReactNode
  onClick: () => void
  disabled?: boolean
  loading?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cx(
        'flex h-[52px] w-full items-center gap-3 rounded-[14px] bg-(--nyt-accent) px-5 text-[15px] font-extrabold text-(--nyt-on-accent) active:bg-(--nyt-accent-pressed) disabled:opacity-50',
        trailing != null && !loading ? 'justify-between' : 'justify-center',
      )}
    >
      {loading ? <Spinner size={22} color="var(--nyt-on-accent)" /> : (
        <>
          <span className="truncate">{children}</span>
          {trailing != null && <span className="shrink-0">{trailing}</span>}
        </>
      )}
    </button>
  )
}

export function DarkButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[48px] w-full items-center justify-center rounded-[14px] bg-(--nyt-header) px-5 text-[15px] font-extrabold text-(--nyt-on-header) active:opacity-80"
    >
      {children}
    </button>
  )
}

export function PillButton({
  children,
  onClick,
  icon: Icon,
  tone = 'accent',
  loading,
}: {
  children: ReactNode
  onClick: () => void
  icon?: LucideIcon
  tone?: 'accent' | 'muted'
  loading?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cx(
        'inline-flex h-[38px] items-center justify-center gap-2 rounded-full px-4 text-[13px] font-bold active:opacity-80 disabled:opacity-60',
        tone === 'accent' ? 'bg-(--nyt-accent) text-(--nyt-on-accent)' : 'bg-(--nyt-muted) text-(--nyt-text)',
      )}
    >
      {loading ? <Spinner size={16} color="currentColor" /> : Icon && <Icon size={16} />}
      {children}
    </button>
  )
}

export function Spinner({ size = 28, color = 'var(--nyt-select)' }: { size?: number; color?: string }) {
  return <LoaderCircle size={size} className="animate-spin" style={{ color }} />
}

/** Butun ekran o'rtasida yuklanish belgisi. */
export function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center p-12">
      <Spinner />
    </div>
  )
}

// ---------------------------------------------------------------- xabarlar

const TONES = {
  danger: { bg: 'var(--nyt-danger-soft)', fg: 'var(--nyt-danger)' },
  warning: { bg: 'var(--nyt-warning-soft)', fg: 'var(--nyt-warning)' },
  success: { bg: 'var(--nyt-success-soft)', fg: 'var(--nyt-success)' },
}

export function Notice({
  tone,
  icon: Icon,
  title,
  text,
  action,
  className,
}: {
  tone: keyof typeof TONES
  icon?: LucideIcon
  title: string
  text?: string
  action?: ReactNode
  className?: string
}) {
  const colors = TONES[tone]
  return (
    <div className={cx('flex flex-col gap-2 rounded-[14px] px-3 py-2.5', className)} style={{ background: colors.bg }}>
      <div className="flex items-start gap-2">
        {Icon && <Icon size={18} className="mt-px shrink-0" style={{ color: colors.fg }} />}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold" style={{ color: colors.fg }}>
            {title}
          </p>
          {text && <p className="text-[12px] text-(--nyt-text-muted)">{text}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

/** Ekran o'rtasidagi natija: ikonka, sarlavha, izoh, tugmalar (to'lov natijasi, bo'sh ro'yxat, xato). */
export function Outcome({ icon: Icon, title, text, children }: { icon: LucideIcon; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <Icon size={48} className="text-(--nyt-text-faint)" />
      <p className="mt-1 text-[20px] font-extrabold text-(--nyt-text)">{title}</p>
      {text && <p className="text-[14px] text-(--nyt-text-muted)">{text}</p>}
      {children && <div className="mt-4 flex w-full max-w-[320px] flex-col items-center gap-3">{children}</div>}
    </div>
  )
}

// ---------------------------------------------------------------- forma

export function Field({
  value,
  onChange,
  placeholder,
  prefix,
  error,
  multiline,
  inputMode,
  autoCapitalize,
  autoComplete,
  display,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  prefix?: string
  error?: string | null
  multiline?: boolean
  inputMode?: 'text' | 'tel' | 'numeric'
  autoCapitalize?: 'words' | 'sentences' | 'off'
  autoComplete?: string
  /** ko'rinishi (telefon guruhlari) — yozilgani [onChange] ga xom holda */
  display?: (value: string) => string
}) {
  const area = useRef<HTMLTextAreaElement>(null)
  // bir qatordan boshlanadi, yozilgan sari o'sadi
  useLayoutEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  // iOS kichik shriftli maydonda sahifani kattalashtiradi — maydon 16px
  const input = 'min-w-0 flex-1 bg-transparent py-2.5 text-[16px] text-(--nyt-text) outline-none'
  return (
    <div className="flex flex-col gap-1">
      <label
        className={cx(
          'flex items-center gap-1 rounded-[12px] border bg-(--nyt-surface) px-3',
          error ? 'border-(--nyt-danger)' : 'border-(--nyt-line) focus-within:border-(--nyt-select)',
        )}
      >
        {prefix && <span className="text-[16px] text-(--nyt-text-muted)">{prefix}</span>}
        {multiline ? (
          <textarea
            ref={area}
            rows={1}
            value={value}
            placeholder={placeholder}
            autoCapitalize={autoCapitalize}
            onChange={(e) => onChange(e.target.value)}
            className={cx(input, 'resize-none')}
          />
        ) : (
          <input
            value={display ? display(value) : value}
            placeholder={placeholder}
            inputMode={inputMode}
            type={inputMode === 'tel' ? 'tel' : 'text'}
            autoCapitalize={autoCapitalize}
            autoComplete={autoComplete}
            onChange={(e) => onChange(e.target.value)}
            className={input}
          />
        )}
      </label>
      {error && <p className="px-1 text-[12px] text-(--nyt-danger)">{error}</p>}
    </div>
  )
}

export function QtyStepper({ qty, onChange }: { qty: number; onChange: (delta: number) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-(--nyt-muted) p-1">
      <IconButton icon={Minus} label="−" onClick={() => onChange(-1)} size={30} iconSize={16} />
      <span className="min-w-[22px] text-center text-[14px] font-bold text-(--nyt-text)">{qty}</span>
      <IconButton icon={Plus} label="+" onClick={() => onChange(1)} size={30} iconSize={16} />
    </div>
  )
}

/** Ikki-uch variantli tanlov (Dostavka | Olib ketish, Yorug' | Tungi, UZ | RU | EN). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  dark,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
  /** qora sarlavha ustida */
  dark?: boolean
}) {
  return (
    <div className={cx('flex rounded-full p-1', dark ? 'bg-(--nyt-header-chip)' : 'bg-(--nyt-muted)')}>
      {options.map((option) => {
        const active = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={cx(
              'h-[34px] flex-1 truncate rounded-full px-3 text-[13px] font-bold',
              active ? 'bg-(--nyt-accent) text-(--nyt-on-accent)' : dark ? 'text-(--nyt-on-header)' : 'text-(--nyt-text)',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------- rasm

export function FoodImage({ src, className, iconSize = 28 }: { src: string | null | undefined; className?: string; iconSize?: number }) {
  const url = imageUrl(src)
  // qaysi rasm ochilmadi — boshqa rasm kelsa (menyu yangilandi) yana urinadi
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  return (
    <div className={cx('flex items-center justify-center overflow-hidden', className)}>
      {url && failedUrl !== url ? (
        <img src={url} alt="" loading="lazy" onError={() => setFailedUrl(url)} className="h-full w-full object-contain" />
      ) : (
        <Utensils size={iconSize} className="text-(--nyt-text-faint)" />
      )}
    </div>
  )
}

// ---------------------------------------------------------------- oynalar

/** Pastdan chiqadigan oyna; fonga bosilsa yoki Esc — yopiladi. */
export function Sheet({ title, onClose, children }: { title?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button type="button" tabIndex={-1} aria-hidden className="nyt-fade absolute inset-0 bg-(--nyt-backdrop)" onClick={onClose} />
      <div className="nyt-sheet nyt-safe-bottom relative mx-auto flex max-h-[88dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[22px] bg-(--nyt-surface)">
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-(--nyt-line)" />
        {title && <h2 className="px-4 pt-3 pb-1 text-[18px] font-extrabold text-(--nyt-text)">{title}</h2>}
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmDialog({
  title,
  text,
  confirm,
  cancel,
  onConfirm,
  onCancel,
}: {
  title: string
  text: string
  confirm: string
  cancel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <button type="button" tabIndex={-1} aria-hidden className="nyt-fade absolute inset-0 bg-(--nyt-backdrop)" onClick={onCancel} />
      <div role="dialog" className="nyt-fade relative w-full max-w-[360px] rounded-[20px] bg-(--nyt-surface) p-5">
        <p className="text-[18px] font-extrabold text-(--nyt-text)">{title}</p>
        <p className="mt-2 text-[14px] text-(--nyt-text-muted)">{text}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="h-10 rounded-full px-4 text-[14px] font-bold text-(--nyt-select)">
            {cancel}
          </button>
          <button type="button" onClick={onConfirm} className="h-10 rounded-full px-4 text-[14px] font-extrabold text-(--nyt-danger)">
            {confirm}
          </button>
        </div>
      </div>
    </div>
  )
}

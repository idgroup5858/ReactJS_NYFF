import { Delete, LogIn } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useT, type PinFailure } from '@/i18n'

const MIN = 4
const MAX = 8
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

/** `4:59` */
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

type Props = {
  /**
   * PIN tekshiruvchi: muvaffaqiyatli bo'lsa `null`, xato bo'lsa — matni yoki `pinFailure(error)` (blok bo'lsa necha
   * soniya kutish — pad o'sha vaqtgacha o'chadi)
   */
  onSubmit: (pin: string) => Promise<string | PinFailure | null>
  submitLabel?: string
  /** xato bo'lmaganda raqamlar ostidagi izoh; standart — "4 tadan 8 tagacha raqam" */
  hint?: string
}

/**
 * Sensorli ekran uchun katta tugmali PIN pad; klaviaturadan ham ishlaydi (raqamlar, Backspace, Esc, Enter).
 * Kirish (shu ekran), kassa bloki, offline kassa va TV / kiosk xodim oynasida (ekran kodi — 8 raqam) qayta ishlatiladi.
 *
 * Ko'p xatodan keyin blok (2026-11-04): server qolgan vaqtni aytsa, hamma tugma (va klaviatura) o'sha vaqtgacha o'chadi,
 * xato qatorida "4:59 dan keyin" sanaladi, tugagach o'zi yoqiladi — bloklangan kassir bosaverib filialning IP
 * chegarasini (PIN bilan kirish — daqiqasiga 20 ta, hamma xodimga umumiy) to'ldirib qo'ymasin. Blok xodimniki — boshqa
 * xodim tanlansa pad yangidan (`key`).
 */
export default function PinPad({ onSubmit, submitLabel, hint }: Props) {
  const t = useT()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [shakeKey, setShakeKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  // klaviaturadan tez yozilganda Enter qayta chizilishni kutmasdan keladi — joriy qiymat ref'dan o'qiladi
  const pinRef = useRef('')
  const busyRef = useRef(false)

  const lockLeft = lockedUntil === null ? 0 : Math.max(0, Math.ceil((lockedUntil - now) / 1000))
  const locked = lockLeft > 0

  // blok sanog'i: har soniyada; tugagach — pad yana ishlaydi
  useEffect(() => {
    if (lockedUntil === null) return
    const timer = setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= lockedUntil) setLockedUntil(null)
    }, 1000)
    return () => clearInterval(timer)
  }, [lockedUntil])

  const update = (next: string) => {
    pinRef.current = next
    setPin(next)
  }
  const press = (digit: string) => {
    if (locked) return
    setError(null)
    if (pinRef.current.length < MAX) update(pinRef.current + digit)
  }
  const erase = () => update(pinRef.current.slice(0, -1))
  const clear = () => update('')

  const submit = async () => {
    const value = pinRef.current
    if (value.length < MIN || busyRef.current || locked) return
    busyRef.current = true
    setBusy(true)
    const failure = await onSubmit(value)
    busyRef.current = false
    setBusy(false)
    if (!failure) return
    const { message, lockSeconds } = typeof failure === 'string' ? { message: failure, lockSeconds: undefined } : failure
    update('')
    setShakeKey((key) => key + 1)
    if (lockSeconds) {
      const current = Date.now()
      setNow(current)
      setLockedUntil(current + lockSeconds * 1000)
      setError(null)
    } else {
      setError(message)
    }
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || locked) return
      if (/^\d$/.test(event.key)) press(event.key)
      else if (event.key === 'Backspace') erase()
      else if (event.key === 'Escape') clear()
      else if (event.key === 'Enter') void submit()
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const slots = Math.max(MIN, pin.length)
  // ixcham (2026-11-09): POS monitorda (768 px balandlik) "Kirish" tugmasi ekrandan tushib qolardi
  const keyClass =
    'flex h-12 cursor-pointer items-center justify-center rounded border border-neutral-200 bg-surface text-xl font-semibold text-neutral-950 transition-colors select-none hover:border-neutral-400 active:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-neutral-200 disabled:active:bg-white'

  return (
    <div className="space-y-3">
      <div key={shakeKey} className={`flex h-6 items-center justify-center gap-3 ${shakeKey > 0 ? 'shake' : ''}`} aria-live="polite">
        {Array.from({ length: slots }, (_, index) => (
          <span
            key={index}
            className={`h-4 w-4 rounded-full border-2 transition-colors ${index < pin.length ? 'border-coal bg-coal' : 'border-neutral-300 bg-surface'}`}
          />
        ))}
      </div>
      {/* uzun xato (masalan, qaysi filialda smena ochiq qolgani) — qatorga sig'masa pastga suriladi, tugmalar ustiga chiqmaydi */}
      <p className={`min-h-5 text-center text-sm leading-5 ${error || locked ? 'font-semibold text-red-700' : 'text-neutral-400'}`}>
        {locked ? t.login.lockedFor(clock(lockLeft)) : (error ?? hint ?? t.login.pinHint)}
      </p>

      <div className="grid grid-cols-3 gap-2">
        {DIGITS.map((digit) => (
          <button key={digit} type="button" onClick={() => press(digit)} disabled={locked} className={keyClass}>
            {digit}
          </button>
        ))}
        <button
          type="button"
          onClick={clear}
          disabled={locked}
          className={`${keyClass} text-sm font-bold tracking-wider text-neutral-500 uppercase`}
        >
          {t.login.clear}
        </button>
        <button type="button" onClick={() => press('0')} disabled={locked} className={keyClass}>
          0
        </button>
        <button
          type="button"
          onClick={erase}
          disabled={locked}
          aria-label={t.login.erase}
          title={t.login.erase}
          className={`${keyClass} text-neutral-500`}
        >
          <Delete size={20} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => void submit()}
        disabled={pin.length < MIN || busy || locked}
        className="btn-primary flex h-12 w-full items-center justify-center gap-2 rounded text-sm font-bold tracking-[0.14em] uppercase"
      >
        <LogIn size={18} />
        {submitLabel ?? t.login.enter}
      </button>
    </div>
  )
}

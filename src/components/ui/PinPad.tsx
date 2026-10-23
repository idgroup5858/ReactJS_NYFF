import { Delete, LogIn } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useT } from '@/i18n'

const MIN = 4
const MAX = 8
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

type Props = {
  /** PIN tekshiruvchi: xato bo'lsa matnini qaytaradi, muvaffaqiyatli bo'lsa `null` */
  onSubmit: (pin: string) => Promise<string | null>
  submitLabel?: string
}

/**
 * Sensorli ekran uchun katta tugmali PIN pad; klaviaturadan ham ishlaydi (raqamlar, Backspace, Esc, Enter).
 * Kirish (shu ekran), kassa bloki va PIN almashtirishda qayta ishlatiladi.
 */
export default function PinPad({ onSubmit, submitLabel }: Props) {
  const t = useT()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [shakeKey, setShakeKey] = useState(0)
  const [busy, setBusy] = useState(false)
  // klaviaturadan tez yozilganda Enter qayta chizilishni kutmasdan keladi — joriy qiymat ref'dan o'qiladi
  const pinRef = useRef('')
  const busyRef = useRef(false)

  const update = (next: string) => {
    pinRef.current = next
    setPin(next)
  }
  const press = (digit: string) => {
    setError(null)
    if (pinRef.current.length < MAX) update(pinRef.current + digit)
  }
  const erase = () => update(pinRef.current.slice(0, -1))
  const clear = () => update('')

  const submit = async () => {
    const value = pinRef.current
    if (value.length < MIN || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    const message = await onSubmit(value)
    busyRef.current = false
    setBusy(false)
    if (message) {
      setError(message)
      update('')
      setShakeKey((key) => key + 1)
    }
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
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
  const keyClass =
    'flex h-16 cursor-pointer items-center justify-center rounded border border-neutral-200 bg-white text-2xl font-semibold text-neutral-950 transition-colors select-none hover:border-neutral-400 active:bg-brand-100'

  return (
    <div className="space-y-4">
      <div key={shakeKey} className={`flex h-8 items-center justify-center gap-3 ${shakeKey > 0 ? 'shake' : ''}`} aria-live="polite">
        {Array.from({ length: slots }, (_, index) => (
          <span
            key={index}
            className={`h-4 w-4 rounded-full border-2 transition-colors ${index < pin.length ? 'border-coal bg-coal' : 'border-neutral-300 bg-white'}`}
          />
        ))}
      </div>
      <p className={`h-5 text-center text-sm ${error ? 'font-semibold text-red-700' : 'text-neutral-400'}`}>{error ?? t.login.pinHint}</p>

      <div className="grid grid-cols-3 gap-2">
        {DIGITS.map((digit) => (
          <button key={digit} type="button" onClick={() => press(digit)} className={keyClass}>
            {digit}
          </button>
        ))}
        <button type="button" onClick={clear} className={`${keyClass} text-sm font-bold tracking-wider text-neutral-500 uppercase`}>
          {t.login.clear}
        </button>
        <button type="button" onClick={() => press('0')} className={keyClass}>
          0
        </button>
        <button type="button" onClick={erase} aria-label={t.login.erase} title={t.login.erase} className={`${keyClass} text-neutral-500`}>
          <Delete size={24} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => void submit()}
        disabled={pin.length < MIN || busy}
        className="btn-primary flex h-14 w-full items-center justify-center gap-2 rounded text-sm font-bold tracking-[0.14em] uppercase"
      >
        <LogIn size={18} />
        {submitLabel ?? t.login.enter}
      </button>
    </div>
  )
}

import { KeyRound, LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { errorMessage, useT } from '@/i18n'
import { SCREEN_CODE_LENGTH } from '@/store/screenCodes'

type Props = {
  /** TV — qora fon, kiosk — oq */
  tone: 'dark' | 'light'
  title: string
  hint: string
  /** nima uchun yana so'ralyapti (kod yangilangan, ko'p xato) */
  notice: string | null
  /** kod serverda tekshiriladi (xato — `ApiError`: noto'g'ri kod, blok, tarmoq) */
  verify: (code: string) => Promise<unknown>
  /** kod to'g'ri — sahifa uni saqlaydi va ekranni ochadi */
  onConnected: (code: string) => void
}

const TONES = {
  dark: {
    icon: 'bg-taxi/15 text-taxi',
    title: 'text-white',
    hint: 'text-white/60',
    input: 'border-coal-line bg-coal-soft text-white placeholder:text-white/20 focus:border-taxi',
    error: 'bg-red-500/15 text-red-300',
  },
  light: {
    icon: 'bg-taxi text-coal',
    title: 'text-neutral-950',
    hint: 'text-neutral-500',
    input: 'border-neutral-300 bg-white text-neutral-950 placeholder:text-neutral-300 focus:border-select',
    error: 'bg-red-50 text-red-700',
  },
} as const

/**
 * Zal ekrani (TV / kiosk) kodi: 8 raqam, bir marta kiritiladi. Faqat raqamlar qoladi (bo'sh joy / chiziqcha bilan yozilsa
 * yoki nusxalansa ham); 8 ta bo'lmaguncha "Ulash" bosilmaydi. Xato bo'lsa — matni va maydon tozalanadi.
 */
export default function ScreenCodeForm({ tone, title, hint, notice, verify, onConnected }: Props) {
  const t = useT()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(notice)
  const [busy, setBusy] = useState(false)
  const style = TONES[tone]

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (code.length !== SCREEN_CODE_LENGTH || busy) return
    setBusy(true)
    try {
      await verify(code)
      onConnected(code)
    } catch (failure) {
      setError(errorMessage(failure))
      setCode('')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="w-full max-w-md space-y-5 text-center">
      <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${style.icon}`}>
        <KeyRound size={30} />
      </span>
      <h1 className={`text-3xl font-black ${style.title}`}>{title}</h1>
      <p className={`text-sm ${style.hint}`}>{hint}</p>
      <input
        autoFocus
        inputMode="numeric"
        autoComplete="off"
        aria-label={t.screenCode.label}
        placeholder={'•'.repeat(SCREEN_CODE_LENGTH)}
        value={code}
        onChange={(event) => {
          setCode(event.target.value.replace(/\D/g, '').slice(0, SCREEN_CODE_LENGTH))
          setError(null)
        }}
        className={`h-16 w-full rounded border text-center font-mono text-3xl font-black tracking-[0.4em] tabular-nums outline-none ${style.input}`}
      />
      {error && <p className={`rounded px-3 py-2 text-sm font-semibold ${style.error}`}>{error}</p>}
      <button
        type="submit"
        disabled={busy || code.length !== SCREEN_CODE_LENGTH}
        className="btn-primary flex h-14 w-full items-center justify-center gap-2 rounded text-base font-extrabold tracking-[0.12em] uppercase"
      >
        {busy && <LoaderCircle size={18} className="animate-spin" />}
        {t.screenCode.submit}
      </button>
    </form>
  )
}

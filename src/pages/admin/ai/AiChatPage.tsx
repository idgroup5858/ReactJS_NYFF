import { CircleAlert, MessageSquarePlus, Send, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { api } from '@/api'
import { Card } from '@/components/ui/Card'
import { textareaClass } from '@/components/ui/styles'
import type { AiChatStart, AiMessage } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { formatDateTime, formatTime } from '@/lib/format'
import { confirmDialog, showToast } from '@/lib/swal'

/** Savol uzunligi — backend bilan bir xil. */
const MAX_LENGTH = 4000

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString()

function Avatar() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-coal text-taxi">
      <Sparkles size={15} />
    </span>
  )
}

/** Xabar pufakchasi: savol — o'ngda sariq, javob — chapda kulrang (oddiy matn, qatorlar saqlanadi). */
function Bubble({ role, text, time }: { role: AiMessage['role']; text: string; time?: string }) {
  const mine = role === 'user'
  return (
    <div className={`flex items-start gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
      {!mine && <Avatar />}
      <div className={`flex max-w-[85%] flex-col ${mine ? 'items-end' : 'items-start'} md:max-w-[75%]`}>
        <div
          className={`rounded-card px-4 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap ${
            mine ? 'rounded-br-sm bg-taxi text-coal' : 'rounded-bl-sm bg-neutral-100 text-neutral-900'
          }`}
        >
          {text}
        </div>
        {time && (
          <span className="mt-1 px-1 text-[11px] text-neutral-400 tabular-nums">
            {isToday(time) ? formatTime(time) : formatDateTime(time)}
          </span>
        )}
      </div>
    </div>
  )
}

/** Javob kutilmoqda: uchta sakrovchi nuqta. */
function Thinking({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-2" role="status" aria-live="polite">
      <Avatar />
      <div className="flex items-center gap-2 rounded-card rounded-bl-sm bg-neutral-100 px-4 py-3 text-sm text-neutral-500">
        <span className="flex gap-1" aria-hidden>
          {[0, 150, 300].map((delay) => (
            <span key={delay} className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: `${delay}ms` }} />
          ))}
        </span>
        {label}
      </div>
    </div>
  )
}

/**
 * AI chat: direktor savol yozadi, server Gemini orqali tizim ma'lumotlaridan javob beradi (bir necha soniya). Tarix
 * saqlanmaydi: sahifa har ochilganda (yangilanganda ham) yangi suhbat — server oldingisini o'chirib, salom qaytaradi;
 * xabarlar faqat shu sahifada, suhbat ichida AI oldingi savollarni eslaydi. Kunning birinchi savolida javobdan oldin
 * salom (alohida pufakcha). Savol berilmaguncha — savol namunalari.
 */
export default function AiChatPage() {
  const t = useT()
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [configured, setConfigured] = useState(true)
  // yangi suhbat ochildi (yoki ochilmadi — xato) — shungacha savol namunalari chiqmaydi
  const [started, setStarted] = useState(false)
  const [startError, setStartError] = useState<unknown>(null)
  const [text, setText] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  // kutish pufakchasidagi ibora — savol turiga qarab serverdan (kelguncha — umumiy matn)
  const [waiting, setWaiting] = useState<string | null>(null)
  const askSeq = useRef(0)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const busy = pending !== null
  // hali savol yo'q (bo'sh chat yoki "Yangi suhbat" dan keyin faqat salom) — savol namunalari ko'rinadi
  const asked = messages.some((m) => m.role === 'user')

  // yangi xabar yoki kutish — ro'yxat pastga suriladi
  useLayoutEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages.length, pending])

  const begin = (chat: AiChatStart) => {
    setConfigured(chat.configured)
    setMessages([chat.greeting])
    setStartError(null)
  }

  // sahifa ochilganda — yangi suhbat (avvalgisi serverda o'chadi)
  useEffect(() => {
    let alive = true
    api.ai
      .start()
      .then(
        (chat) => alive && begin(chat),
        (error: unknown) => alive && setStartError(error),
      )
      .finally(() => alive && setStarted(true))
    return () => {
      alive = false
    }
  }, [])

  const ask = async (question: string) => {
    const value = question.trim()
    if (!value || busy) return
    const seq = ++askSeq.current
    setPending(value)
    setWaiting(null)
    setText('')
    // javob bilan bir vaqtda; oldingi savolniki kechikib kelsa — e'tiborsiz
    api.ai.waiting(value).then(
      (result) => askSeq.current === seq && setWaiting(result.text),
      () => {},
    )
    try {
      const { question: saved, greeting, answer } = await api.ai.ask(value)
      setMessages((prev) => [...prev, saved, ...(greeting ? [greeting] : []), answer])
    } catch (error) {
      // savol yo'qolmasin — maydonga qaytadi
      setText(value)
      showToast(errorMessage(error), 'error')
    } finally {
      setPending(null)
      inputRef.current?.focus()
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void ask(text)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void ask(text)
    }
  }

  const newChat = async () => {
    if (!(await confirmDialog(t.ai.chat.newChatTitle, t.ai.chat.newChatText, t.ai.chat.newChat))) return
    try {
      begin(await api.ai.start())
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  return (
    <Card className="flex h-[calc(100dvh-15rem)] min-h-[480px] flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-2.5">
        <p className="flex min-w-0 items-center gap-2 text-xs text-neutral-500">
          <ShieldCheck size={14} className="shrink-0 text-emerald-600" />
          <span className="line-clamp-2">{t.ai.chat.readOnly}</span>
        </p>
        <button
          type="button"
          onClick={() => void newChat()}
          disabled={!asked || busy}
          className="btn-ghost flex h-9 shrink-0 items-center gap-2 rounded px-3 text-xs font-semibold"
        >
          <MessageSquarePlus size={15} />
          <span className="hidden sm:inline">{t.ai.chat.newChat}</span>
        </button>
      </div>

      {!configured && (
        <p className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <CircleAlert size={16} className="mt-0.5 shrink-0" />
          {t.ai.chat.notConfigured}
        </p>
      )}

      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {Boolean(startError) && <p className="py-10 text-center text-sm text-neutral-500">{errorMessage(startError)}</p>}
        {messages.map((message) => (
          <Bubble key={message.id} role={message.role} text={message.text} time={message.createdAt} />
        ))}
        {pending !== null && (
          <>
            <Bubble role="user" text={pending} />
            <Thinking label={waiting ?? t.ai.chat.thinking} />
          </>
        )}
        {started && !startError && !asked && !busy && (
          <div className="mx-auto flex max-w-2xl flex-col items-center py-6 text-center">
            <p className="mt-1 max-w-lg text-sm text-neutral-500">{t.ai.chat.welcomeHint}</p>
            <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
              {t.ai.chat.suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={!configured}
                  onClick={() => void ask(suggestion)}
                  className="cursor-pointer rounded-card border border-neutral-200 bg-white px-4 py-3 text-left text-sm font-medium text-neutral-800 transition-colors hover:border-taxi hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={submit} className="border-t border-neutral-100 p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(event) => setText(event.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={onKeyDown}
            rows={Math.min(6, Math.max(1, text.split('\n').length))}
            placeholder={t.ai.chat.placeholder}
            aria-label={t.ai.chat.placeholder}
            disabled={!configured}
            autoFocus
            className={`${textareaClass} max-h-40 min-h-10 leading-6`}
          />
          <button
            type="submit"
            disabled={!text.trim() || busy || !configured}
            title={t.ai.chat.send}
            aria-label={t.ai.chat.send}
            className="btn-primary flex h-10 w-10 shrink-0 items-center justify-center rounded"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="mt-1.5 hidden px-1 text-[11px] text-neutral-400 sm:block">{t.ai.chat.sendHint}</p>
      </form>
    </Card>
  )
}

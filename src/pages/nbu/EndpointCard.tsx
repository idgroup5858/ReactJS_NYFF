import { RotateCcw, Send } from 'lucide-react'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { textareaClass } from '@/components/ui/styles'
import type { BackUrl, NbuEndpoint } from './endpoints'
import type { NbuCallResult } from './nbuApi'
import ResultView from './ResultView'

type Props = {
  item: NbuEndpoint
  back: BackUrl
  result?: NbuCallResult
  busy: boolean
  onSend: (item: NbuEndpoint, body?: Record<string, unknown>) => void
}

export function MethodBadge({ method }: { method: string }) {
  return (
    <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${method === 'GET' ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-800'}`}>
      {method}
    </span>
  )
}

/** Bitta endpoint: tavsif, tahrirlanadigan JSON (bo'lsa), "Yuborish" va oxirgi natija. */
export default function EndpointCard({ item, back, result, busy, onSend }: Props) {
  const sample = () => (item.template ? JSON.stringify(item.template(back), null, 2) : '')
  const [text, setText] = useState(sample)
  const [jsonError, setJsonError] = useState<string | null>(null)

  const submit = () => {
    if (!item.template) {
      onSend(item)
      return
    }
    let body: unknown
    try {
      body = JSON.parse(text)
    } catch (error) {
      setJsonError(`JSON xato: ${error instanceof Error ? error.message : String(error)}`)
      return
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      setJsonError("Tana JSON obyekt bo'lishi kerak: { … }")
      return
    }
    setJsonError(null)
    onSend(item, body as Record<string, unknown>)
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <h3 className="mr-auto text-sm font-bold text-neutral-900">{item.title}</h3>
        <MethodBadge method={item.method} />
        <code className="font-mono text-xs text-neutral-600">{item.path}</code>
      </div>
      <div className="space-y-3 p-4">
        <p className="text-xs text-neutral-500">{item.hint}</p>
        {item.template ? (
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={Math.min(14, text.split('\n').length + 1)}
            spellCheck={false}
            aria-label={`${item.title} — so'rov tanasi`}
            className={`${textareaClass} resize-y font-mono text-xs leading-relaxed`}
          />
        ) : (
          <p className="rounded bg-neutral-50 px-3 py-2 text-xs text-neutral-600">So'rov tanasi va imzo serverda avtomatik tuziladi.</p>
        )}
        {jsonError && <p className="text-xs font-semibold text-red-700">{jsonError}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={submit} disabled={busy} className="btn-primary flex h-9 items-center gap-2 rounded px-4 text-xs font-bold">
            <Send size={14} />
            {busy ? 'Yuborilmoqda…' : 'Yuborish'}
          </button>
          {item.template && (
            <button
              type="button"
              onClick={() => {
                setText(sample())
                setJsonError(null)
              }}
              className="btn-ghost flex h-9 items-center gap-2 rounded px-3 text-xs font-semibold"
            >
              <RotateCcw size={14} />
              Namuna
            </button>
          )}
        </div>
        {result && <ResultView result={result} />}
      </div>
    </Card>
  )
}

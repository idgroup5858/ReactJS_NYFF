import { ExternalLink } from 'lucide-react'
import { formatTime } from '@/lib/format'
import type { NbuCallResult } from './nbuApi'

type BankBody = { status?: { code?: number; message?: string }; data?: { paymentUrl?: string } } | null | undefined

export function JsonBlock({ label, value, open = false }: { label: string; value: unknown; open?: boolean }) {
  return (
    <details open={open}>
      <summary className="cursor-pointer text-xs font-semibold text-neutral-600 select-none">{label}</summary>
      <pre className="mt-1 max-h-96 overflow-auto rounded border border-line bg-neutral-50 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all text-neutral-800">
        {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
      </pre>
    </details>
  )
}

export function OkChip({ ok }: { ok: boolean }) {
  return (
    <span className={`rounded-chip px-2 py-0.5 text-[11px] font-bold ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
      {ok ? 'OK' : 'XATO'}
    </span>
  )
}

/** Bitta so'rov natijasi: holat qatori, xato, to'lov havolasi, javob va (yig'ilgan) so'rov. */
export default function ResultView({ result }: { result: NbuCallResult }) {
  const body = result.response?.body as BankBody
  const code = body?.status?.code
  const paymentUrl = body?.data?.paymentUrl

  return (
    <div className="space-y-2 rounded-card border border-line p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-700">
        <OkChip ok={result.ok} />
        {result.response && <span className="font-mono">HTTP {result.response.httpStatus}</span>}
        {code !== undefined && <span className="font-mono">status.code = {code}</span>}
        {body?.status?.message && <span className="font-semibold">{body.status.message}</span>}
        <span className="ml-auto text-neutral-500 tabular-nums">
          {result.ms} ms · {formatTime(result.at)}
        </span>
      </div>
      {result.error && <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{result.error}</p>}
      {paymentUrl && (
        <a href={paymentUrl} target="_blank" rel="noreferrer" className="btn-primary inline-flex h-9 items-center gap-2 rounded px-4 text-xs font-bold">
          <ExternalLink size={14} />
          To'lov sahifasini ochish
        </a>
      )}
      {result.response && <JsonBlock label="Javob" value={result.response.body} open />}
      {result.request && <JsonBlock label="Yuborilgan so'rov (sarlavhalar, tana)" value={result.request} />}
    </div>
  )
}

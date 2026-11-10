import { Check, Copy, Globe, Pencil, RotateCcw, Save, Trash2, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { inputClass, labelClass, textareaClass } from '@/components/ui/styles'
import { errorMessage } from '@/i18n'
import { copyText } from '@/lib/clipboard'
import { formatTime } from '@/lib/format'
import { confirmDialog, showToast } from '@/lib/swal'
import { opTitle } from './endpoints'
import { nbuApi, type NbuConfigPatch, type NbuState } from './nbuApi'
import { OkChip } from './ResultView'
import ResultView from './ResultView'

type Apply = (action: () => Promise<NbuState>) => Promise<void>

function Row({ label, children, tag }: { label: string; children: ReactNode; tag?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs">
      <span className="shrink-0 text-neutral-500">
        {label}
        {tag && <span className="ml-1.5 rounded-chip bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">vaqtincha</span>}
      </span>
      <span className="min-w-0 truncate text-right font-mono text-neutral-900">{children}</span>
    </div>
  )
}

function Flag({ on }: { on: boolean }) {
  return on ? <Check size={14} className="inline text-emerald-700" /> : <X size={14} className="inline text-red-700" />
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: T[]; onChange: (value: T) => void }) {
  return (
    <span className="inline-flex overflow-hidden rounded border border-line">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => option !== value && onChange(option)}
          className={`px-2 py-0.5 font-mono text-[11px] ${option === value ? 'bg-taxi font-bold text-coal' : 'text-neutral-600 hover:bg-neutral-100'}`}
        >
          {option}
        </button>
      ))}
    </span>
  )
}

const FIELDS: { key: keyof NbuConfigPatch & string; label: string; secret?: boolean; multiline?: boolean }[] = [
  { key: 'baseUrl', label: 'Base URL' },
  { key: 'apiKey', label: 'API key (X-API-KEY)', secret: true },
  { key: 'secretKey', label: 'Secret key (imzo)', secret: true },
  { key: 'username', label: 'Login' },
  { key: 'password', label: 'Parol', secret: true },
  { key: 'bankPublicKey', label: "Bank ochiq kaliti (credits uchun, PEM yoki base64)", multiline: true },
]

/** Vaqtincha almashtirish: faqat to'ldirilgan maydonlar yuboriladi (xotirada, server restartigacha). */
function ConfigForm({ apply, onDone }: { apply: Apply; onDone: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({})
  const save = async () => {
    const patch: NbuConfigPatch = {}
    for (const field of FIELDS) {
      const value = values[field.key]?.trim()
      if (value) patch[field.key as Exclude<keyof NbuConfigPatch, 'clear'>] = value
    }
    if (Object.keys(patch).length === 0) return onDone()
    await apply(() => nbuApi.config(patch))
    onDone()
  }
  return (
    <div className="space-y-2 border-t border-line pt-3">
      <p className="text-[11px] text-neutral-500">Bo'sh qoldirilgan maydon o'zgarmaydi. Qiymatlar faqat server xotirasida (restartda .env ga qaytadi).</p>
      {FIELDS.map((field) => (
        <label key={field.key} className="block">
          <span className={labelClass}>{field.label}</span>
          {field.multiline ? (
            <textarea
              rows={3}
              value={values[field.key] ?? ''}
              onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
              spellCheck={false}
              className={`${textareaClass} font-mono text-[11px]`}
            />
          ) : (
            <input
              type={field.secret ? 'password' : 'text'}
              value={values[field.key] ?? ''}
              onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
              autoComplete="off"
              spellCheck={false}
              className={`${inputClass} font-mono`}
            />
          )}
        </label>
      ))}
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" onClick={() => void save()} className="btn-primary flex h-8 items-center gap-1.5 rounded px-3 text-xs font-bold">
          <Save size={13} />
          Saqlash
        </button>
        <button type="button" onClick={onDone} className="btn-ghost flex h-8 items-center rounded px-3 text-xs font-semibold">
          Bekor
        </button>
      </div>
    </div>
  )
}

export function ConfigCard({ state, apply }: { state: NbuState; apply: Apply }) {
  const { config } = state
  const [editing, setEditing] = useState(false)
  const [ip, setIp] = useState<string | null>(null)
  const over = (key: string) => config.overridden.includes(key)

  const checkIp = async () => {
    setIp('…')
    try {
      const result = await nbuApi.ip()
      setIp(result.ip ?? result.error ?? '?')
    } catch (error) {
      setIp(errorMessage(error))
    }
  }

  return (
    <Card>
      <CardHeader
        title="Sozlamalar"
        hint="Kalitlar serverda (.env); brauzerga kelmaydi"
        actions={
          !editing && (
            <button type="button" onClick={() => setEditing(true)} className="btn-ghost flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-semibold">
              <Pencil size={13} />
              Vaqtincha
            </button>
          )
        }
      />
      <div className="divide-y divide-neutral-100 px-4 py-2">
        <Row label="Base URL" tag={over('baseUrl')}>{config.baseUrl}</Row>
        <Row label="API key" tag={over('apiKey')}>{config.apiKey ?? <Flag on={false} />}</Row>
        <Row label="Secret key" tag={over('secretKey')}><Flag on={config.secretKey} /></Row>
        <Row label="Login" tag={over('username')}>{config.username ?? <Flag on={false} />}</Row>
        <Row label="Parol" tag={over('password')}><Flag on={config.password} /></Row>
        <Row label="Bank ochiq kaliti" tag={over('bankPublicKey')}><Flag on={config.bankPublicKey} /></Row>
        <Row label="Imzo kodlash" tag={over('signatureEncoding')}>
          <Segmented value={config.signatureEncoding} options={['hex', 'base64']} onChange={(value) => void apply(() => nbuApi.config({ signatureEncoding: value }))} />
        </Row>
        <Row label="OAEP hash" tag={over('oaepHash')}>
          <Segmented value={config.oaepHash} options={['sha1', 'sha256']} onChange={(value) => void apply(() => nbuApi.config({ oaepHash: value }))} />
        </Row>
        <div className="flex items-center justify-between gap-3 py-2 text-xs">
          <button type="button" onClick={() => void checkIp()} className="btn-ghost flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-semibold">
            <Globe size={13} />
            Server IP
          </button>
          <span className="font-mono text-neutral-900">{ip ?? ''}</span>
        </div>
        {config.overridden.length > 0 && !editing && (
          <div className="py-2">
            <button type="button" onClick={() => void apply(() => nbuApi.config({ clear: true }))} className="btn-ghost flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-semibold">
              <RotateCcw size={13} />
              Hammasini .env ga qaytarish
            </button>
          </div>
        )}
        {editing && (
          <div className="py-2">
            <ConfigForm apply={apply} onDone={() => setEditing(false)} />
          </div>
        )}
      </div>
    </Card>
  )
}

function CopyValue({ value }: { value: string | null }) {
  if (!value) return <span className="text-neutral-400">—</span>
  return (
    <button
      type="button"
      title="Nusxa olish"
      onClick={() => void copyText(value).then(() => showToast('Nusxa olindi'))}
      className="inline-flex max-w-full items-center gap-1 truncate hover:underline"
    >
      <span className="truncate">{value}</span>
      <Copy size={11} className="shrink-0 text-neutral-400" />
    </button>
  )
}

export function SessionCard({ state, apply }: { state: NbuState; apply: Apply }) {
  const { session } = state
  const [cardToken, setCardToken] = useState('')

  const reset = async () => {
    if (!(await confirmDialog('Sessiyani tozalash', "Tokenlar, oxirgi order / tranzaksiya, karta tokeni va jurnal o'chiriladi. Sozlamalar qoladi.", 'Tozalash'))) return
    await apply(nbuApi.reset)
  }

  return (
    <Card>
      <CardHeader
        title="Sessiya"
        hint="Server xotirasida (restartda tozalanadi)"
        actions={
          <button type="button" onClick={() => void reset()} className="btn-icon-danger flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-semibold">
            <Trash2 size={13} />
            Tozalash
          </button>
        }
      />
      <div className="divide-y divide-neutral-100 px-4 py-2">
        <Row label="pubKey / identityToken">
          <Flag on={session.pubKey} /> <Flag on={session.identityToken} />
        </Row>
        <Row label="accessToken">
          {session.accessToken ? `${session.accessToken} · ${session.accessTokenAt ? formatTime(session.accessTokenAt) : ''}` : <Flag on={false} />}
        </Row>
        <Row label="refreshToken"><Flag on={session.refreshToken} /></Row>
        <Row label="Oxirgi orderId"><CopyValue value={session.lastOrderId} /></Row>
        <Row label="Oxirgi transactionId"><CopyValue value={session.lastTransactionId} /></Row>
        <Row label="paymentUrl">
          {session.paymentUrl ? (
            <a href={session.paymentUrl} target="_blank" rel="noreferrer" className="text-sky-700 hover:underline">
              ochish
            </a>
          ) : (
            <span className="text-neutral-400">—</span>
          )}
        </Row>
        <Row label="cardToken"><CopyValue value={session.cardToken} /></Row>
        <div className="space-y-1.5 py-2">
          <span className={labelClass}>cardToken (bank callback'idan, purpose=CARD_BINDING)</span>
          <div className="flex gap-2">
            <input
              value={cardToken}
              onChange={(event) => setCardToken(event.target.value)}
              placeholder={session.cardToken ?? 'token…'}
              spellCheck={false}
              className={`${inputClass} font-mono`}
            />
            <button
              type="button"
              disabled={!cardToken.trim()}
              onClick={() => void apply(() => nbuApi.session({ cardToken })).then(() => setCardToken(''))}
              className="btn-primary flex h-8 shrink-0 items-center gap-1.5 rounded px-3 text-xs font-bold"
            >
              <Save size={13} />
              Saqlash
            </button>
          </div>
        </div>
      </div>
    </Card>
  )
}

export function HistoryCard({ state }: { state: NbuState }) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <Card>
      <CardHeader title="Jurnal" hint="Oxirgi 30 ta so'rov" />
      {state.history.length === 0 ? (
        <p className="px-4 py-3 text-xs text-neutral-500">Hali so'rov yuborilmagan.</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {state.history.map((item) => {
            const key = `${item.at}-${item.op}`
            const code = (item.response?.body as { status?: { code?: number } } | null | undefined)?.status?.code
            return (
              <li key={key}>
                <button type="button" onClick={() => setOpen(open === key ? null : key)} className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs hover:bg-neutral-50">
                  <OkChip ok={item.ok} />
                  <span className="min-w-0 flex-1 truncate font-semibold text-neutral-800">{opTitle(item.op)}</span>
                  <span className="font-mono text-neutral-500">
                    {item.response ? item.response.httpStatus : '—'}
                    {code !== undefined ? ` · ${code}` : ''}
                  </span>
                  <span className="text-neutral-400 tabular-nums">{formatTime(item.at)}</span>
                </button>
                {open === key && (
                  <div className="px-4 pb-3">
                    <ResultView result={item} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

export function TestDataCard() {
  return (
    <Card>
      <CardHeader title="Test ma'lumotlar" hint="Bank hujjatidan" />
      <div className="space-y-1 px-4 py-3 font-mono text-[11px] text-neutral-700">
        <p>HUMO 9860990000000010 (OK)</p>
        <p>UZCARD 8600990000000017 (OK)</p>
        <p>OTP: 111111</p>
        <p>VISA 4000000000002503 (3-D Secure)</p>
        <p>MASTERCARD 5200000000002151 (3-D Secure)</p>
        <p className="pt-1 font-sans text-neutral-500">
          Body ichidagi <code>{'{{orderId}}'}</code> — har so'rovda yangi UUID v7; <code>{'{{lastOrderId}}'}</code>,{' '}
          <code>{'{{lastTransactionId}}'}</code>, <code>{'{{cardToken}}'}</code> — "Sessiya"dagi qiymatlar. Ularni o'zingiz ham yozib qo'yishingiz mumkin.
        </p>
        <p className="pt-1 font-sans text-neutral-500">
          Bank callback'lari ishlab turgan <code>/api/callback</code> ga boradi — bu sahifa unga tegmaydi.
        </p>
      </div>
    </Card>
  )
}

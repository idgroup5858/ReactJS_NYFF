import { Bot, Copy, ExternalLink, KeyRound, RefreshCw, Unlink, Unplug } from 'lucide-react'
import { toDataURL } from 'qrcode'
import { useEffect, useState, type FormEvent } from 'react'
import { api } from '@/api'
import { useTelegramStatus } from '@/api/queries'
import { Card, CardHeader } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import { inputClass, tdClass, thClass } from '@/components/ui/styles'
import type { TelegramStatus } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { formatDateTime } from '@/lib/format'
import { confirmDialog, showToast } from '@/lib/swal'

/** Nusxalash: `navigator.clipboard` faqat https / localhost'da — lokal tarmoqdagi http manzilda eski usul. */
async function copyText(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text)
  const area = document.createElement('textarea')
  area.value = text
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.append(area)
  area.select()
  document.execCommand('copy')
  area.remove()
}

/** Start link QR kodi — brauzerda yasaladi (linkda maxfiy kod bor — tashqi xizmatga yuborilmaydi). */
function LinkQr({ link }: { link: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    toDataURL(link, { margin: 1, width: 440, errorCorrectionLevel: 'M' })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(null))
    return () => {
      alive = false
    }
  }, [link])
  return (
    <div className="flex h-[220px] w-[220px] shrink-0 items-center justify-center rounded-card border border-neutral-200 bg-white p-2">
      {src && <img src={src} alt="QR" width={204} height={204} />}
    </div>
  )
}

/** Token maydoni — birinchi ulash va almashtirish uchun. */
function TokenForm({ submitLabel, onDone }: { submitLabel: string; onDone?: () => void }) {
  const t = useT()
  const [token, setToken] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      await api.telegram.connect(token.trim())
      setToken('')
      showToast(t.ai.telegram.connected)
      onDone?.()
    } catch (error) {
      showToast(errorMessage(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-2 sm:flex-row">
      <input
        type="password"
        value={token}
        onChange={(event) => setToken(event.target.value)}
        placeholder="123456789:AA…"
        aria-label={t.ai.telegram.token}
        autoComplete="off"
        spellCheck={false}
        className={`${inputClass} font-mono`}
      />
      <button type="submit" disabled={!token.trim() || saving} className="btn-primary flex h-10 shrink-0 items-center justify-center gap-2 rounded px-5 text-sm font-bold">
        <KeyRound size={15} />
        {submitLabel}
      </button>
    </form>
  )
}

/** Bot hali ulanmagan: @BotFather qadamlari va token maydoni. */
function ConnectCard() {
  const t = useT()
  return (
    <Card className="max-w-2xl">
      <CardHeader title={t.ai.telegram.connectTitle} />
      <div className="space-y-4 p-4">
        <ol className="space-y-2.5">
          {t.ai.telegram.steps.map((step, index) => (
            <li key={step} className="flex items-start gap-3 text-sm text-neutral-700">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-taxi text-xs font-bold text-coal">{index + 1}</span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
        <TokenForm submitLabel={t.ai.telegram.connect} />
      </div>
    </Card>
  )
}

function Connected({ status }: { status: TelegramStatus }) {
  const t = useT()
  const bot = status.bot!
  const link = status.link ?? ''
  const [replacing, setReplacing] = useState(false)

  const copy = async () => {
    try {
      await copyText(link)
      showToast(t.ai.telegram.copied)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  // tasdiqlangandan keyin buyruq; xato — xabar
  const run = async (question: [string, string, string], action: () => Promise<unknown>) => {
    if (!(await confirmDialog(...question))) return
    try {
      await action()
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <Card>
          <CardHeader title={t.ai.telegram.linkTitle} hint={t.ai.telegram.personal} />
          <div className="flex flex-col gap-5 p-4 md:flex-row md:items-center">
            <LinkQr link={link} />
            <div className="min-w-0 flex-1 space-y-3">
              <p className="text-sm text-neutral-600">{t.ai.telegram.linkHint}</p>
              <p className="rounded border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-xs break-all text-neutral-800 select-all">{link}</p>
              <div className="flex flex-wrap gap-2">
                <a href={link} target="_blank" rel="noreferrer" className="btn-primary flex h-10 items-center gap-2 rounded px-4 text-sm font-bold">
                  <ExternalLink size={15} />
                  {t.ai.telegram.open}
                </a>
                <button type="button" onClick={() => void copy()} className="btn-ghost flex h-10 items-center gap-2 rounded px-4 text-sm font-semibold">
                  <Copy size={15} />
                  {t.ai.telegram.copy}
                </button>
                <button
                  type="button"
                  onClick={() => void run([t.ai.telegram.regenerateTitle, t.ai.telegram.regenerateText, t.ai.telegram.regenerate], api.telegram.regenerateLink)}
                  className="btn-ghost flex h-10 items-center gap-2 rounded px-4 text-sm font-semibold"
                >
                  <RefreshCw size={15} />
                  {t.ai.telegram.regenerate}
                </button>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title={t.ai.tabs.telegram}
            actions={
              <span
                className={`inline-flex items-center gap-1.5 rounded-chip px-2 py-1 text-xs font-semibold ${
                  status.running ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${status.running ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
                {status.running ? t.ai.telegram.running : t.ai.telegram.stopped}
              </span>
            }
          />
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-coal text-taxi">
                <Bot size={20} />
              </span>
              <div className="min-w-0">
                <p className="truncate font-bold text-neutral-900">{bot.name}</p>
                <a href={`https://t.me/${bot.username}`} target="_blank" rel="noreferrer" className="text-sm text-neutral-500 hover:text-neutral-900 hover:underline">
                  @{bot.username}
                </a>
              </div>
            </div>
            {!status.running && <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-900">{t.ai.telegram.stoppedHint}</p>}
            {replacing ? (
              <TokenForm submitLabel={t.common.save} onDone={() => setReplacing(false)} />
            ) : (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setReplacing(true)} className="btn-ghost flex h-9 items-center gap-2 rounded px-3 text-xs font-semibold">
                  <KeyRound size={14} />
                  {t.ai.telegram.replaceToken}
                </button>
                <button
                  type="button"
                  onClick={() => void run([t.ai.telegram.disconnectTitle, t.ai.telegram.disconnectText, t.ai.telegram.disconnect], api.telegram.disconnect)}
                  className="btn-icon-danger flex h-9 items-center gap-2 rounded px-3 text-xs font-semibold"
                >
                  <Unplug size={14} />
                  {t.ai.telegram.disconnect}
                </button>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title={t.ai.telegram.chatsTitle} />
        {status.chats.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={Unlink} title={t.ai.telegram.chatsEmpty} message={t.ai.telegram.linkHint} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200">
                <tr>
                  <th className={thClass}>{t.ai.telegram.telegramUser}</th>
                  <th className={thClass}>{t.ai.telegram.admin}</th>
                  <th className={thClass}>{t.ai.telegram.linkedAt}</th>
                  <th className={thClass} />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {status.chats.map((chat) => (
                  <tr key={chat.chatId}>
                    <td className={tdClass}>
                      <span className="font-semibold">{chat.name || chat.chatId}</span>
                      {chat.username && <span className="block text-xs text-neutral-500">@{chat.username}</span>}
                    </td>
                    <td className={tdClass}>{chat.userName}</td>
                    <td className={`${tdClass} tabular-nums`}>{formatDateTime(chat.linkedAt)}</td>
                    <td className={`${tdClass} text-right`}>
                      <button
                        type="button"
                        onClick={() => void run([t.ai.telegram.unlinkTitle, t.ai.telegram.unlinkText, t.ai.telegram.unlink], () => api.telegram.unlink(chat.chatId))}
                        className="btn-icon-danger inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-semibold"
                      >
                        <Unlink size={13} />
                        {t.ai.telegram.unlink}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

/**
 * Telegram bot: token kiritilmagan bo'lsa — @BotFather qadamlari; ulangan bo'lsa — shu adminning start linki (QR bilan,
 * muddatsiz), bot holati va ulangan chatlar. Direktor linkni ochib "Start" bosadi — keyin botga savol yozadi.
 */
export default function TelegramPage() {
  const status = useTelegramStatus()
  if (!status.data) {
    return <EmptyState icon={Bot} title={status.error ? errorMessage(status.error) : ' '} />
  }
  return status.data.bot ? <Connected status={status.data} /> : <ConnectCard />
}

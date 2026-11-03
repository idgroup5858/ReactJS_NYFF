import { Copy, RefreshCw } from 'lucide-react'
import { api } from '@/api'
import { useScreenCode } from '@/api/queries'
import Modal from '@/components/ui/Modal'
import type { Branch } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { copyText } from '@/lib/clipboard'
import { confirmDialog, showToast } from '@/lib/swal'
import type { ScreenKind } from '@/store/screenCodes'

/** `48217390` → `4821 7390` (TV pultida / kiosk ekranida terish uchun o'qishga oson). */
const grouped = (code: string) => code.replace(/(\d{4})(?=\d)/g, '$1 ')

/**
 * Filialning TV (navbat ekrani) yoki kiosk kodi — 8 raqam: ekran birinchi ochilganda so'raydi va eslab qoladi.
 * Nusxalash va yangilash (TV lar darhol uziladi, kiosk keyingi mijozdan oldin — ikkalasi ham yangi kodni so'raydi).
 * Kodlar bir-biridan va offline kassa kalitidan alohida.
 */
export default function ScreenCodeModal({ kind, branch, onClose }: { kind: ScreenKind; branch: Branch; onClose: () => void }) {
  const t = useT()
  const b = t.admin.branches
  const text =
    kind === 'tv'
      ? { label: b.tvCode, title: b.tvCodeTitle, hint: b.tvCodeHint, renewTitle: b.tvCodeRenewTitle, renewText: b.tvCodeRenewText }
      : { label: b.kioskCode, title: b.kioskCodeTitle, hint: b.kioskCodeHint, renewTitle: b.kioskCodeRenewTitle, renewText: b.kioskCodeRenewText }
  const query = useScreenCode(kind, branch.id)
  const code = query.data?.code ?? ''

  const copy = async () => {
    await copyText(code)
    showToast(b.tvCodeCopied)
  }

  const renew = async () => {
    if (!(await confirmDialog(text.renewTitle, text.renewText, b.tvCodeRenew))) return
    try {
      await api.branches.renewScreenCode(kind, branch.id)
      showToast(b.tvCodeRenewed)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  return (
    <Modal
      title={text.title(branch.name)}
      onClose={onClose}
      footer={
        <div className="flex w-full gap-2">
          <button type="button" onClick={() => void renew()} disabled={!code} className="btn-ghost flex h-11 items-center gap-2 rounded px-4 text-xs font-bold">
            <RefreshCw size={15} />
            {b.tvCodeRenew}
          </button>
          <button type="button" onClick={() => void copy()} disabled={!code} className="btn-primary flex h-11 flex-1 items-center justify-center gap-2 rounded text-sm font-bold">
            <Copy size={16} />
            {b.tvCodeCopy}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-neutral-600">{text.hint}</p>
        {query.error ? (
          <p className="rounded bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errorMessage(query.error)}</p>
        ) : (
          <p
            aria-label={text.label}
            className="rounded border border-neutral-200 bg-neutral-50 py-4 text-center font-mono text-4xl font-black tracking-[0.2em] text-neutral-950 tabular-nums select-all"
          >
            {code ? grouped(code) : ' '}
          </p>
        )}
      </div>
    </Modal>
  )
}

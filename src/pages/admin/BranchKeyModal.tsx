import { Copy, RefreshCw } from 'lucide-react'
import { api } from '@/api'
import { useHrKey, useOfflineKey } from '@/api/queries'
import Modal from '@/components/ui/Modal'
import { inputClass } from '@/components/ui/styles'
import type { Branch } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { copyText } from '@/lib/clipboard'
import { confirmDialog, showToast } from '@/lib/swal'

/** `offline` — kassa kompyuteridagi "NYFF Offline"; `hr` — filialdagi "NYFF HR" (FaceID davomat). */
export type BranchKeyKind = 'offline' | 'hr'

/**
 * Filial kaliti: "NYFF Offline" (offline kassa) yoki "NYFF HR" (FaceID — terminaldagi «Kirish» / «Chiqish» larni
 * markazga yuboradi) sozlamalariga kiritiladi. Nusxalash va yangilash (eskisi bilan dastur endi ulana olmaydi —
 * yangisini kiritish kerak). Ikkala kalit alohida — birini yangilash boshqasiga tegmaydi.
 */
export default function BranchKeyModal({ kind, branch, onClose }: { kind: BranchKeyKind; branch: Branch; onClose: () => void }) {
  const t = useT()
  const texts = t.admin.branches
  const offlineQuery = useOfflineKey(branch.id, { enabled: kind === 'offline' })
  const hrQuery = useHrKey(branch.id, { enabled: kind === 'hr' })
  const query = kind === 'hr' ? hrQuery : offlineQuery
  const key = query.data?.key ?? ''
  const label = kind === 'hr' ? texts.hrKey : texts.offlineKey

  const copy = async () => {
    await copyText(key)
    showToast(texts.offlineKeyCopied)
  }

  const renew = async () => {
    const [title, text] = kind === 'hr' ? [texts.hrKeyRenewTitle, texts.hrKeyRenewText] : [texts.offlineKeyRenewTitle, texts.offlineKeyRenewText]
    if (!(await confirmDialog(title, text, texts.offlineKeyRenew))) return
    try {
      await (kind === 'hr' ? api.branches.renewHrKey(branch.id) : api.branches.renewOfflineKey(branch.id))
      showToast(texts.offlineKeyRenewed)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  return (
    <Modal
      title={kind === 'hr' ? texts.hrKeyTitle(branch.name) : texts.offlineKeyTitle(branch.name)}
      onClose={onClose}
      footer={
        <div className="flex w-full gap-2">
          <button type="button" onClick={() => void renew()} disabled={!key} className="btn-ghost flex h-9 items-center gap-2 rounded px-4 text-xs font-bold">
            <RefreshCw size={15} />
            {texts.offlineKeyRenew}
          </button>
          <button type="button" onClick={() => void copy()} disabled={!key} className="btn-primary flex h-9 flex-1 items-center justify-center gap-2 rounded text-sm font-bold">
            <Copy size={16} />
            {texts.offlineKeyCopy}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-neutral-600">{kind === 'hr' ? texts.hrKeyHint : texts.offlineKeyHint}</p>
        {query.error ? (
          <p className="rounded bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errorMessage(query.error)}</p>
        ) : (
          <input
            readOnly
            aria-label={label}
            value={key}
            onFocus={(event) => event.target.select()}
            className={`${inputClass} font-mono text-sm`}
          />
        )}
      </div>
    </Modal>
  )
}

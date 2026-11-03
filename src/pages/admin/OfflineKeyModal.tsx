import { Copy, RefreshCw } from 'lucide-react'
import { api } from '@/api'
import { useOfflineKey } from '@/api/queries'
import Modal from '@/components/ui/Modal'
import { inputClass } from '@/components/ui/styles'
import type { Branch } from '@/domain/types'
import { errorMessage, useT } from '@/i18n'
import { copyText } from '@/lib/clipboard'
import { confirmDialog, showToast } from '@/lib/swal'

/**
 * Filialning offline kassa kaliti (kassa kompyuteridagi "NYFF Offline" dasturi birinchi ishga tushganda so'raydi):
 * nusxalash va yangilash (eskisi bilan kassa kompyuteri endi ulana olmaydi — yangisini dasturga kiritish kerak).
 */
export default function OfflineKeyModal({ branch, onClose }: { branch: Branch; onClose: () => void }) {
  const t = useT()
  const query = useOfflineKey(branch.id)
  const key = query.data?.key ?? ''

  const copy = async () => {
    await copyText(key)
    showToast(t.admin.branches.offlineKeyCopied)
  }

  const renew = async () => {
    if (!(await confirmDialog(t.admin.branches.offlineKeyRenewTitle, t.admin.branches.offlineKeyRenewText, t.admin.branches.offlineKeyRenew))) return
    try {
      await api.branches.renewOfflineKey(branch.id)
      showToast(t.admin.branches.offlineKeyRenewed)
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }

  return (
    <Modal
      title={t.admin.branches.offlineKeyTitle(branch.name)}
      onClose={onClose}
      footer={
        <div className="flex w-full gap-2">
          <button type="button" onClick={() => void renew()} disabled={!key} className="btn-ghost flex h-11 items-center gap-2 rounded px-4 text-xs font-bold">
            <RefreshCw size={15} />
            {t.admin.branches.offlineKeyRenew}
          </button>
          <button type="button" onClick={() => void copy()} disabled={!key} className="btn-primary flex h-11 flex-1 items-center justify-center gap-2 rounded text-sm font-bold">
            <Copy size={16} />
            {t.admin.branches.offlineKeyCopy}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-neutral-600">{t.admin.branches.offlineKeyHint}</p>
        {query.error ? (
          <p className="rounded bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errorMessage(query.error)}</p>
        ) : (
          <input
            readOnly
            aria-label={t.admin.branches.offlineKey}
            value={key}
            onFocus={(event) => event.target.select()}
            className={`${inputClass} font-mono text-sm`}
          />
        )}
      </div>
    </Modal>
  )
}

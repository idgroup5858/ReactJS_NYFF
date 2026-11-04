import { Trash2 } from 'lucide-react'
import { useT } from '@/i18n'

/**
 * Tahrirlash oynasi pastki qatori: "Saqlash" va (tahrirda) o'chirish tugmasi — menyu va ombor mahsulotlarida ro'yxat
 * qatoriga yana bir tugma sig'maydi (yoki ikki ko'rinish bor), shuning uchun o'chirish oynaning o'zida.
 */
export default function FormFooter({ formId, saving, onDelete }: { formId: string; saving: boolean; onDelete?: () => void }) {
  const t = useT()
  return (
    <div className="flex w-full gap-2">
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={saving}
          aria-label={t.common.delete}
          title={t.common.delete}
          className="btn-icon-danger flex h-9 w-9 shrink-0 items-center justify-center rounded"
        >
          <Trash2 size={16} />
        </button>
      )}
      <button type="submit" form={formId} disabled={saving} className="btn-primary h-9 flex-1 rounded text-sm font-bold">
        {t.common.save}
      </button>
    </div>
  )
}

import Modal from '@/components/ui/Modal'
import { useT } from '@/i18n'

/**
 * Smena topshirilgach chiqadigan xayrlashuv oynasi — tushum hisoboti ko'rsatilmaydi (foydalanuvchi: "info chiqishi
 * kerak emas"), faqat kassa tilidagi katta rahmat yozuvi; faqat "Chiqish" tugmasi bilan yopiladi.
 */
export default function ShiftReportModal({ onDone }: { onDone: () => void }) {
  const t = useT()

  return (
    <Modal
      title={t.report.title}
      onClose={onDone}
      dismissable={false}
      size="md"
      footer={
        <button type="button" autoFocus onClick={onDone} className="btn-primary h-10 w-full rounded text-sm font-bold tracking-[0.14em] uppercase">
          {t.report.done}
        </button>
      }
    >
      {/* ikki qator navbatma-navbat yonib-o'chadi: qizil fon + oq matn ↔ fonsiz qizil matn (global.css: goodbye-blink) */}
      <div className="space-y-2 py-3 text-center font-black uppercase">
        <p className="goodbye-blink rounded px-3 py-3 text-4xl">{t.report.thanks}</p>
        <p className="goodbye-blink goodbye-blink-alt rounded px-3 py-3 text-2xl leading-tight">{t.report.goodbye}</p>
      </div>
    </Modal>
  )
}

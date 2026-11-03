import type { AlertSound } from '@/lib/alertSound'

/** online — qizil (mijoz kassa oldida emas, qabul muddati bor), kiosk — to'q sariq */
const COLORS: Record<AlertSound, string> = { online: '220 38 38', kiosk: '254 154 0' }

/**
 * Kassir ko'rmagan buyurtma bor — butun ekran chetlarida yonib-o'chuvchi nur: ko'zning chetidan, uzoqdan ham seziladi.
 * Hech narsani to'smaydi (`pointer-events: none`) — kassir sotishda, to'lovda, oynalarda ishlayveradi.
 */
export default function AlertFrame({ kind }: { kind: AlertSound }) {
  const rgb = COLORS[kind]
  return (
    <div
      aria-hidden
      className="alert-frame pointer-events-none fixed inset-0 z-[80]"
      style={{ boxShadow: `inset 0 0 0 6px rgb(${rgb}), inset 0 0 90px 20px rgb(${rgb} / 0.55)` }}
    />
  )
}

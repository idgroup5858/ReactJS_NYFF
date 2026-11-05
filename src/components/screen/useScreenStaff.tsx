import { useState, type ReactNode } from 'react'
import { useScreenLock } from '@/lib/fullscreen'
import ScreenStaffDialog from './ScreenStaffDialog'

type Options = {
  /** ekran kodi serverda tekshiriladi (TV — navbat so'rovi, kiosk — `check`); xato — `ApiError` */
  verify: (code: string) => Promise<unknown>
  /** "Filialni almashtirish" — kirish ekranidagi shu ekran turining filial qadami */
  changeBranchPath: string
}

/**
 * Zal ekrani (TV, kiosk): mijozdan himoya va xodim uchun yashirin chiqish. Ekran to'liq ekranda ushlab turiladi
 * (`useScreenLock`); logotip 10 soniya bosib turilsa ([onBrandHold]) — ekran kodi so'raladi ([ScreenStaffDialog]). Kod
 * to'g'ri bo'lsa — to'liq ekrandan chiqadi va sahifa qayta yuklanguncha (yoki "To'liq ekranga qaytish" bosilguncha) o'zi
 * qaytmaydi. [dialog] — sahifaning har holatida (kod ekrani, bosh ekran, menyu) chiziladi.
 */
export function useScreenStaff({ verify, changeBranchPath }: Options): { onBrandHold: () => void; dialog: ReactNode } {
  const [open, setOpen] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  useScreenLock(!unlocked)

  const dialog = open && (
    <ScreenStaffDialog
      unlocked={unlocked}
      verify={verify}
      changeBranchPath={changeBranchPath}
      onUnlock={() => setUnlocked(true)}
      onRelock={() => setUnlocked(false)}
      onClose={() => setOpen(false)}
    />
  )
  return { onBrandHold: () => setOpen(true), dialog }
}

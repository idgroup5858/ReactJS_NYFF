import { ChevronLeft, CloudOff } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { offlineApi, type OfflineCashier } from '@/api/offline'
import Brand from '@/components/layout/Brand'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import { SectionTitle } from '@/components/ui/Card'
import PinPad from '@/components/ui/PinPad'
import UserAvatar from '@/components/ui/UserAvatar'
import { fullName } from '@/domain/rules'
import { pinFailure, useT, type PinFailure } from '@/i18n'
import { enterFullscreen } from '@/lib/fullscreen'
import UserStep from '../login/UserStep'

/** Kirish ekrani qobig'i (oddiy kirishdagidek) — qizil "Offline" belgisi bilan. */
export function OfflineShell({ title, subtitle, onBack, wide = false, children }: {
  title: string
  subtitle?: string
  onBack?: () => void
  wide?: boolean
  children: ReactNode
}) {
  const t = useT()
  return (
    <div className="flex min-h-screen flex-col bg-coal">
      <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <span className="flex items-center gap-3">
          <Brand size="lg" />
          <span className="flex items-center gap-1.5 rounded-chip bg-red-600 px-2.5 py-1 text-xs font-bold tracking-wider text-white uppercase">
            <CloudOff size={14} />
            {t.offline.badge}
          </span>
        </span>
        <LanguageSwitcher tone="dark" />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-4 pb-10 sm:items-center">
        <div className={`page-enter w-full overflow-hidden rounded-card bg-white shadow-2xl ${wide ? 'max-w-3xl' : 'max-w-md'}`}>
          <div className="flex items-center gap-3 border-b border-neutral-200 px-5 py-4">
            {onBack && (
              <button type="button" onClick={onBack} aria-label={t.common.back} title={t.common.back} className="btn-icon flex h-9 w-9 shrink-0 items-center justify-center rounded">
                <ChevronLeft size={18} />
              </button>
            )}
            <div className="min-w-0">
              <SectionTitle as="h1">{title}</SectionTitle>
              {subtitle && <p className="mt-0.5 pl-3 text-xs text-neutral-500 gomeal:pl-0 modern:pl-0">{subtitle}</p>}
            </div>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </main>
      <footer className="pb-4 text-center text-[11px] tracking-[0.2em] text-white/25 uppercase">{t.appName}</footer>
    </div>
  )
}

/**
 * Offline kassaga PIN bilan kirish (online kassadan o'tilmagan, kassir almashgan yoki kassa bloklangan edi). Kassirlar va
 * PIN xeshlari — markazdan olingan nusxada (offline serverda); PIN o'sha yerda tekshiriladi.
 */
export default function OfflineLogin({ branchName, cashiers }: { branchName: string; cashiers: OfflineCashier[] }) {
  const t = useT()
  const [selected, setSelected] = useState<OfflineCashier | null>(null)
  const asUser = (cashier: OfflineCashier) => ({ ...cashier, role: 'cashier' as const, branchId: null, email: null })

  const submitPin = async (pin: string): Promise<PinFailure | null> => {
    if (!selected) return null
    try {
      await offlineApi.login(selected.id, pin)
      // online kassadagidek — PIN bilan kirganda darhol to'liq ekran
      enterFullscreen()
      return null
    } catch (error) {
      return pinFailure(error)
    }
  }

  if (!selected) {
    return (
      <OfflineShell title={t.offline.chooseCashier} subtitle={branchName} wide={cashiers.length > 2}>
        {cashiers.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-500">{t.offline.noCashiers}</p>
        ) : (
          <UserStep users={cashiers.map(asUser)} onSelect={(user) => setSelected(cashiers.find((c) => c.id === user.id) ?? null)} />
        )}
      </OfflineShell>
    )
  }

  return (
    <OfflineShell title={t.login.enterPin} subtitle={branchName} onBack={() => setSelected(null)}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <UserAvatar name={fullName(selected)} size="lg" />
          <div>
            <p className="text-lg font-bold text-neutral-950">{fullName(selected)}</p>
            <p className="text-xs text-neutral-500">{t.roles.cashier}</p>
          </div>
        </div>
        <PinPad key={selected.id} onSubmit={submitPin} />
      </div>
    </OfflineShell>
  )
}

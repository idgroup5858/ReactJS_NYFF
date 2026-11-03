import { ChevronLeft } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { adminLogin } from '@/api/session'
import Brand from '@/components/layout/Brand'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import { SectionTitle } from '@/components/ui/Card'
import Field from '@/components/ui/Field'
import { inputClass } from '@/components/ui/styles'
import { errorMessage, useT } from '@/i18n'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

/**
 * Admin kirishi — `/admin` manzilida, email va parol bilan (umumiy kirish ekranida admin yo'q, PIN ham yo'q). Kirgach
 * shu manzildagi admin panel ochiladi (`RequireRole` sessiyani ko'radi). Ko'rinishi — kirish ekranidagidek.
 */
export default function AdminLoginPage() {
  const t = useT()
  useDocumentTitle(t.login.adminTitle)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy || !email.trim() || !password) return
    setBusy(true)
    setError(null)
    try {
      await adminLogin(email.trim(), password)
    } catch (caught) {
      setError(errorMessage(caught))
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-coal">
      <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <Brand size="lg" />
        <LanguageSwitcher tone="dark" />
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pt-4 pb-10 sm:items-center">
        <div className="page-enter w-full max-w-md overflow-hidden rounded-card bg-white shadow-2xl">
          <div className="flex items-center gap-3 border-b border-neutral-200 px-5 py-4">
            <Link to="/" aria-label={t.login.toStaffLogin} title={t.login.toStaffLogin} className="btn-icon flex h-9 w-9 shrink-0 items-center justify-center rounded">
              <ChevronLeft size={18} />
            </Link>
            <div className="min-w-0">
              <SectionTitle as="h1">{t.login.adminTitle}</SectionTitle>
              <p className="mt-0.5 pl-3 text-xs text-neutral-500 gomeal:pl-0 modern:pl-0">{t.login.adminHint}</p>
            </div>
          </div>
          <form onSubmit={(event) => void submit(event)} className="space-y-3 p-5">
            <Field label={t.login.email} htmlFor="admin-email">
              <input
                id="admin-email"
                type="email"
                autoFocus
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(event) => setEmail(event.target.value.replace(/\s/g, '').slice(0, 100))}
                className={inputClass}
              />
            </Field>
            <Field label={t.login.password} htmlFor="admin-password">
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value.slice(0, 64))}
                className={inputClass}
              />
            </Field>
            {error && <p className="rounded bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>}
            <button type="submit" disabled={busy || !email.trim() || !password} className="btn-primary h-11 w-full rounded text-sm font-bold">
              {t.login.enter}
            </button>
            <p className="text-xs text-neutral-500">{t.login.forgot}</p>
          </form>
        </div>
      </main>

      <footer className="pb-4 text-center text-[11px] tracking-[0.2em] text-white/25 uppercase">{t.appName}</footer>
    </div>
  )
}

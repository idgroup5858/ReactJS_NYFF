import { Link } from 'react-router'
import Brand from '@/components/layout/Brand'
import { useT } from '@/i18n'

export default function NotFoundPage() {
  const t = useT()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-coal px-6 text-center text-white">
      <Brand size="lg" />
      <p className="text-6xl font-black text-taxi">404</p>
      <p className="text-sm text-white/60">{t.errors.not_found}</p>
      <Link to="/" className="btn-primary inline-flex h-10 items-center rounded px-5 text-xs font-bold tracking-[0.12em] uppercase">
        {t.common.home}
      </Link>
    </div>
  )
}

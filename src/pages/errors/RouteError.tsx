import { RefreshCw, RotateCcw, TriangleAlert } from 'lucide-react'
import { useRouteError } from 'react-router'
import { resetDb } from '@/api'
import Brand from '@/components/layout/Brand'
import { useT } from '@/i18n'

/** Sahifada kutilmagan xato bo'lsa — oq ekran o'rniga tushunarli oyna: qayta yuklash yoki demo ma'lumotni tiklash. */
export default function RouteError() {
  const t = useT()
  const error = useRouteError()
  const message = error instanceof Error ? error.message : String(error)

  const reset = () => {
    resetDb()
    window.location.assign('/')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-coal px-4 text-center text-white">
      <Brand size="lg" />
      <div className="w-full max-w-lg space-y-4 rounded-card bg-white p-6 text-neutral-900 shadow-2xl">
        <TriangleAlert size={40} className="mx-auto text-select" />
        <h1 className="text-lg font-extrabold">{t.errorPage.title}</h1>
        <p className="text-sm text-neutral-500">{t.errorPage.text}</p>
        <p className="rounded bg-neutral-100 px-3 py-2 font-mono text-xs break-words text-neutral-600">{message}</p>
        {/* ikkalasi sig'masa — ustma-ust (matn bo'linmaydi) */}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => window.location.reload()} className="btn-primary flex h-11 flex-[1_1_auto] items-center justify-center gap-2 rounded px-4 text-xs font-bold uppercase">
            <RefreshCw size={16} />
            {t.errorPage.reload}
          </button>
          <button type="button" onClick={reset} className="btn-ghost flex h-11 flex-[1_1_auto] items-center justify-center gap-2 rounded px-4 text-xs font-bold uppercase">
            <RotateCcw size={16} />
            {t.common.resetData}
          </button>
        </div>
      </div>
    </div>
  )
}

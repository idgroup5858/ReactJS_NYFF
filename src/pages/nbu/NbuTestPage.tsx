import { Landmark, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import StaffLayout from '@/components/layout/StaffLayout'
import { SectionTitle } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import { errorMessage } from '@/i18n'
import { confirmDialog, showToast } from '@/lib/swal'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import EndpointCard from './EndpointCard'
import { NBU_ENDPOINTS, NBU_GROUPS, type BackUrl, type NbuEndpoint } from './endpoints'
import { nbuApi, type NbuCallResult, type NbuState } from './nbuApi'
import { ConfigCard, HistoryCard, SessionCard, TestDataCard } from './SidePanel'

const TITLE = 'NBU test — Milliy Ecom'

/** To'lovdan keyin bank shu sahifaga qaytaradi: `?result=success&orderId=…` */
const back: BackUrl = (result) => `${window.location.origin}${import.meta.env.BASE_URL}nbu/test?result=${result}&orderId={{orderId}}`

/**
 * Milliy Ecom (NBU ekvayring) API sinovi — `/nbu/test`, faqat admin, admin menyusida yo'q. Har endpoint uchun JSON
 * tahrirlanadi va server orqali yuboriladi (imzo, shifrlash, token — serverda). Asosiy tizim va `/api/callback` ga
 * tegmaydi.
 */
export default function NbuTestPage() {
  useDocumentTitle(TITLE)
  const [state, setState] = useState<NbuState | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, NbuCallResult>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [params, setParams] = useSearchParams()
  const returned = params.get('result')
  const returnedOrder = params.get('orderId')

  const refresh = useCallback(async () => {
    try {
      setState(await nbuApi.state())
      setLoadError(null)
    } catch (error) {
      setLoadError(errorMessage(error))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const apply = useCallback(async (action: () => Promise<NbuState>) => {
    try {
      setState(await action())
    } catch (error) {
      showToast(errorMessage(error), 'error')
    }
  }, [])

  const send = async (item: NbuEndpoint, body?: Record<string, unknown>) => {
    if (busy) return
    if (item.confirm && !(await confirmDialog(item.title, item.confirm, 'Yuborish'))) return
    setBusy(item.key)
    try {
      const result = await nbuApi.call(item.op, body)
      setResults((prev) => ({ ...prev, [item.key]: result }))
      await refresh()
    } catch (error) {
      showToast(errorMessage(error), 'error')
    } finally {
      setBusy(null)
    }
  }

  const statusItem = NBU_ENDPOINTS.find((item) => item.key === 'status')!

  return (
    <StaffLayout title={TITLE}>
      {!state ? (
        <EmptyState icon={Landmark} title={loadError ?? ' '} />
      ) : (
        <div className="space-y-5">
          {returned && (
            <div
              className={`flex flex-wrap items-center gap-3 rounded-card border px-4 py-3 text-sm ${
                returned === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              <span className="font-bold">Bank qaytardi: {returned === 'success' ? 'muvaffaqiyatli' : 'muvaffaqiyatsiz'}</span>
              {returnedOrder && <span className="font-mono text-xs break-all">orderId: {returnedOrder}</span>}
              <span className="ml-auto flex gap-2">
                {returnedOrder && (
                  <button
                    type="button"
                    onClick={() => void send(statusItem, { orderId: returnedOrder })}
                    className="btn-primary flex h-8 items-center gap-1.5 rounded px-3 text-xs font-bold"
                  >
                    <Search size={13} />
                    Holatini tekshirish
                  </button>
                )}
                <button type="button" onClick={() => setParams({}, { replace: true })} className="btn-ghost flex h-8 items-center rounded px-3 text-xs font-semibold">
                  Yopish
                </button>
              </span>
            </div>
          )}

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
            <div className="space-y-6">
              {NBU_GROUPS.map((group) => (
                <section key={group.title} className="space-y-3">
                  <SectionTitle>{group.title}</SectionTitle>
                  {group.items.map((item) => (
                    <EndpointCard key={item.key} item={item} back={back} result={results[item.key]} busy={busy === item.key} onSend={(it, body) => void send(it, body)} />
                  ))}
                </section>
              ))}
            </div>
            <div className="space-y-5 xl:sticky xl:top-4">
              <ConfigCard state={state} apply={apply} />
              <SessionCard state={state} apply={apply} />
              <HistoryCard state={state} />
              <TestDataCard />
            </div>
          </div>
        </div>
      )}
    </StaffLayout>
  )
}

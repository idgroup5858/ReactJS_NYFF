import { CircleX, CloudOff, CreditCard, ExternalLink, Hourglass } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { cardBinding, startCardBinding } from '../data'
import { currentDict, errorText, useT } from '../i18n'
import { useNav } from '../nav'
import { DarkButton, Outcome, PillButton, PrimaryButton, Spinner, TopBar } from '../ui'
import { openBankPage } from '../webapp'

type Stage =
  | { kind: 'loading' }
  | { kind: 'open'; url: string; id: string }
  | { kind: 'waiting'; url: string; id: string }
  | { kind: 'failed' }
  | { kind: 'pending'; id: string }
  | { kind: 'error'; message: string }

const POLL_MS = 2_000
/** karta oynasi ochiq — shuncha vaqt kutiladi (bank tokenni callback bilan yuboradi) */
const WAIT_MS = 10 * 60_000
/** "Yangilash" — ~1 daqiqa */
const RECHECK_MS = 60_000

/**
 * "Karta qo'shish" (API.md 5.8) — rasmiylashtirishdan yoki profildan. Bog'lash sessiyasi ochiladi → karta alohida oynada
 * kiritiladi (pul yechilmaydi) → natija serverdan so'raladi → bog'langach sahifa yopiladi, karta ro'yxatda. Orqaga —
 * tasdiqsiz (pul harakati yo'q).
 */
export default function CardBindPage() {
  const t = useT()
  const nav = useNav()
  const [stage, setStage] = useState<Stage>({ kind: 'loading' })
  // yangi tsikl boshlansa (yoki sahifa yopilsa) eskisi to'xtaydi
  const poller = useRef(0)

  /** Bog'lash sessiyasini ochish (bosqich `loading` — chaqiruvchi qo'yadi). */
  const start = useCallback(() => {
    const run = ++poller.current
    startCardBinding().then(
      (started) => {
        if (run === poller.current) setStage({ kind: 'open', url: started.paymentUrl, id: started.binding.id })
      },
      (e: unknown) => {
        // til almashganda sessiya qayta ochilmasin — matn shu paytdagi tilda
        if (run === poller.current) setStage({ kind: 'error', message: errorText(currentDict(), e) })
      },
    )
  }, [])

  /** Sahifa yopildi — so'rash to'xtaydi. */
  const stopPolling = useCallback(() => {
    poller.current++
  }, [])

  const retry = () => {
    setStage({ kind: 'loading' })
    start()
  }

  /** Natijani so'rash (bosqich — chaqiruvchi qo'yadi). */
  const wait = useCallback(
    (id: string, durationMs: number) => {
      const run = ++poller.current
      const until = Date.now() + durationMs
      void (async () => {
        for (let attempt = 0; ; attempt++) {
          if (attempt > 0) await sleep(POLL_MS)
          if (run !== poller.current) return
          let status = 'pending'
          try {
            status = (await cardBinding(id)).status
          } catch {
            // aloqa uzildi — yana urinadi
          }
          if (run !== poller.current) return
          if (status === 'active') {
            nav.back()
            return
          }
          if (status === 'failed') {
            setStage({ kind: 'failed' })
            return
          }
          if (Date.now() >= until) {
            setStage({ kind: 'pending', id })
            return
          }
        }
      })()
    },
    [nav],
  )

  // bank sahifasidan shu oynaga qaytdi (`?binding=<id>`, [openBankPage]) — yangi sessiya ochilmaydi, natija so'raladi
  const [params] = useSearchParams()
  const returned = params.get('binding')
  useEffect(() => {
    if (returned) wait(returned, RECHECK_MS)
    else start()
    return stopPolling
  }, [returned, start, stopPolling, wait])

  // oynadan qaytdi — darhol so'ralsin
  useEffect(() => {
    if (stage.kind !== 'waiting') return
    const { id } = stage
    const onVisible = () => {
      if (document.visibilityState === 'visible') wait(id, WAIT_MS)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [stage, wait])

  const open = (id: string, url: string) => {
    openBankPage(url, id, `${window.location.pathname}?binding=${encodeURIComponent(id)}`)
    setStage({ kind: 'waiting', url, id })
    wait(id, WAIT_MS)
  }

  const recheck = (id: string) => {
    setStage({ kind: 'loading' })
    wait(id, RECHECK_MS)
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title={t.cardAdd} subtitle={t.cardAddHint} onBack={nav.back} />
      {stage.kind === 'loading' && (
        <div className="flex flex-1 items-center justify-center p-12">
          <Spinner size={40} />
        </div>
      )}
      {stage.kind === 'open' && (
        <Outcome icon={CreditCard} title={t.cardAdd} text={t.cardAddOpenText}>
          <PrimaryButton onClick={() => open(stage.id, stage.url)}>
            <span className="inline-flex items-center gap-2">
              <ExternalLink size={18} />
              {t.cardAddOpen}
            </span>
          </PrimaryButton>
        </Outcome>
      )}
      {stage.kind === 'waiting' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <Spinner size={40} />
          <p className="text-[18px] font-extrabold text-(--nyt-text)">{t.cardWaiting}</p>
          <p className="text-[14px] text-(--nyt-text-muted)">{t.cardAddOpenText}</p>
          <div className="mt-3">
            <PillButton icon={ExternalLink} onClick={() => open(stage.id, stage.url)}>
              {t.paymentReopen}
            </PillButton>
          </div>
        </div>
      )}
      {stage.kind === 'failed' && (
        <Outcome icon={CircleX} title={t.cardFailed} text={t.cardFailedHint}>
          <PrimaryButton onClick={retry}>{t.retry}</PrimaryButton>
          <DarkButton onClick={nav.back}>{t.back}</DarkButton>
        </Outcome>
      )}
      {stage.kind === 'pending' && (
        <Outcome icon={Hourglass} title={t.cardPending} text={t.cardPendingHint}>
          <PrimaryButton onClick={() => recheck(stage.id)}>{t.paymentRecheck}</PrimaryButton>
          <DarkButton onClick={nav.back}>{t.back}</DarkButton>
        </Outcome>
      )}
      {stage.kind === 'error' && (
        <Outcome icon={CloudOff} title={t.cardAddFailed} text={stage.message}>
          <PrimaryButton onClick={retry}>{t.retry}</PrimaryButton>
          <DarkButton onClick={nav.back}>{t.back}</DarkButton>
        </Outcome>
      )}
    </div>
  )
}

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

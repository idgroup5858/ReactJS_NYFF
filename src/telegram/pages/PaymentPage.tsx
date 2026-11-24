import { CircleCheck, CircleX, CreditCard, ExternalLink, Hourglass } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { checkPayment, type PaymentOutcome } from '../data'
import { useT } from '../i18n'
import { useBackHandler, useNav } from '../nav'
import { cartStore, pendingPayment, type PendingPayment } from '../store'
import { ConfirmDialog, DarkButton, Outcome, PillButton, PrimaryButton, Spinner, TopBar } from '../ui'
import { openBankPage } from '../webapp'

/**
 * - `open` — to'lov oynasini ochish tugmasi (foydalanuvchi bosganda ochiladi — brauzer bloklamasin);
 * - `waiting` — oyna ochildi, natija serverdan so'ralmoqda;
 * - `checking` — mijoz bekor qildi / saqlangan karta javobi kechikdi: bir necha marta so'raladi.
 */
type Stage = 'open' | 'waiting' | 'checking' | 'failed' | 'paidNoOrder' | 'pending'

const POLL_MS = 2_000
/** saqlangan karta / "Yangilash" — ~1,5 daqiqa */
const SHORT_ATTEMPTS = 45
/** mijoz bekor qildi — to'lagan bo'lishi mumkin, 3 marta */
const CANCEL_ATTEMPTS = 3
/** to'lov oynasi ochiq — muddat (`expiresAt`) + 1 daqiqa; noma'lum bo'lsa 16 daqiqa */
const DEFAULT_WINDOW_MS = 16 * 60_000

/**
 * Karta bilan to'lov (API.md 5.7). Android'da bank sahifasi ilova ichida ochilib, qaytish manzili ushlanadi; Telegram
 * ilovasida — mini appning o'z oynasida, bank to'lovdan keyin shu sahifaga qaytaradi ([openBankPage]); Telegram Web va
 * brauzerda — alohida oynada. Natija har 2 soniyada serverdan so'raladi. To'langan bo'lsa savat tozalanadi va buyurtma
 * sahifasi ochiladi.
 */
export default function PaymentPage() {
  const t = useT()
  const nav = useNav()
  const { paymentId = '' } = useParams()
  const [pending] = useState<PendingPayment | null>(() => {
    const saved = pendingPayment.get()
    return saved?.id === paymentId ? saved : null
  })
  // oyna avval ochilgan (mini app qayta ochildi) — natija kutiladi; saqlangan kartadan — holat so'raladi
  const [stage, setStage] = useState<Stage>(() => {
    if (!pending) return 'pending'
    if (!pending.paymentUrl) return 'checking'
    return pending.opened ? 'waiting' : 'open'
  })
  const [confirmCancel, setConfirmCancel] = useState(false)
  // yangi so'rash tsikli boshlansa (yoki sahifa yopilsa) eskisi to'xtaydi
  const poller = useRef(0)

  /**
   * [until] — shu paytgacha (ms) yoki [attempts] marta so'raladi; natija bo'lmasa — [onTimeout]. Bosqich (`checking`,
   * `waiting`) — chaqiruvchi o'zi qo'yadi.
   */
  const poll = useCallback(
    (options: { attempts?: number; until?: number; onTimeout: Stage }) => {
      if (!pending) return
      const run = ++poller.current
      void (async () => {
        for (let attempt = 0; ; attempt++) {
          if (attempt > 0) await sleep(POLL_MS)
          if (run !== poller.current) return
          let outcome: PaymentOutcome
          try {
            outcome = await checkPayment(pending)
          } catch {
            // aloqa uzildi / server javob bermadi — yana urinadi
            outcome = { kind: 'waiting' }
          }
          if (run !== poller.current) return
          if (outcome.kind === 'paid') {
            cartStore.set([])
            nav.reset(`order/${outcome.orderId}`)
            return
          }
          if (outcome.kind === 'paidNoOrder') {
            cartStore.set([])
            setStage('paidNoOrder')
            return
          }
          if (outcome.kind === 'failed') {
            setStage('failed')
            return
          }
          const done = options.until != null ? Date.now() >= options.until : attempt + 1 >= (options.attempts ?? 1)
          if (done) {
            setStage(options.onTimeout)
            return
          }
        }
      })()
    },
    [pending, nav],
  )

  /** Sahifa yopildi — so'rash to'xtaydi. */
  const stopPolling = useCallback(() => {
    poller.current++
  }, [])

  /** To'lov oynasi ochiq — muddat tugaguncha so'raladi. */
  const waitForPayment = useCallback(() => {
    if (!pending) return
    const expires = Date.parse(pending.expiresAt ?? '')
    const until = Number.isNaN(expires) ? pending.createdAt + DEFAULT_WINDOW_MS : expires + 60_000
    poll({ until, onTimeout: 'pending' })
  }, [pending, poll])

  useEffect(() => {
    if (pending?.paymentUrl) {
      // oyna ochilmagan bo'lsa — bir marta tekshiriladi (to'lov allaqachon yakunlangan bo'lishi mumkin)
      if (pending.opened) waitForPayment()
      else poll({ attempts: 1, onTimeout: 'open' })
    } else if (pending) {
      // saqlangan kartadan — oyna yo'q, bank javobi kechikkan
      poll({ attempts: SHORT_ATTEMPTS, onTimeout: 'pending' })
    }
    return stopPolling
  }, [pending, poll, stopPolling, waitForPayment])

  // mijoz to'lov oynasidan qaytdi — darhol so'ralsin (fonda turgan paytdagi kutish uzun bo'lishi mumkin)
  useEffect(() => {
    if (stage !== 'waiting') return
    const onVisible = () => {
      if (document.visibilityState === 'visible') waitForPayment()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [stage, waitForPayment])

  const openWindow = () => {
    if (!pending?.paymentUrl) return
    if (!pending.opened) pendingPayment.save({ ...pending, opened: true })
    // shu oynada ochilishi mumkin — oldin saqlanib bo'lsin; bank shu sahifaga qaytaradi (`opened` — natija kutiladi)
    openBankPage(pending.paymentUrl, pending.id, window.location.pathname)
    setStage('waiting')
    waitForPayment()
  }

  // to'lov yarim yo'lda qolmasin — chiqishdan oldin tasdiq; tekshirish paytida — orqaga yo'q
  useBackHandler(stage === 'open' || stage === 'waiting' ? () => setConfirmCancel(true) : stage === 'checking' ? () => {} : null)

  const cancel = () => {
    setConfirmCancel(false)
    setStage('checking')
    poll({ attempts: CANCEL_ATTEMPTS, onTimeout: 'failed' })
  }

  const recheck = () => {
    setStage('checking')
    poll({ attempts: SHORT_ATTEMPTS, onTimeout: 'pending' })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title={t.paymentTitle} onBack={stage === 'checking' ? undefined : nav.back} />
      {stage === 'checking' && <Busy title={t.paymentChecking} hint={t.paymentCheckingHint} />}
      {stage === 'open' && (
        <Outcome icon={CreditCard} title={t.paymentOpenTitle} text={t.paymentOpenText}>
          <PrimaryButton onClick={openWindow}>
            <span className="inline-flex items-center gap-2">
              <ExternalLink size={18} />
              {t.paymentOpen}
            </span>
          </PrimaryButton>
        </Outcome>
      )}
      {stage === 'waiting' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <Spinner size={40} />
          <p className="text-[18px] font-extrabold text-(--nyt-text)">{t.paymentWaiting}</p>
          <p className="text-[14px] text-(--nyt-text-muted)">{t.paymentWaitingHint}</p>
          <div className="mt-3 flex flex-col items-center gap-3">
            <PillButton icon={ExternalLink} onClick={openWindow}>
              {t.paymentReopen}
            </PillButton>
            <button type="button" onClick={() => setConfirmCancel(true)} className="text-[14px] font-bold text-(--nyt-danger)">
              {t.paymentCancel}
            </button>
          </div>
        </div>
      )}
      {stage === 'failed' && (
        <Outcome icon={CircleX} title={t.paymentFailed} text={t.paymentFailedHint}>
          {/* rasmiylashtirishga — savat joyida */}
          <PrimaryButton onClick={nav.back}>{t.retry}</PrimaryButton>
          <DarkButton onClick={nav.home}>{t.toHome}</DarkButton>
        </Outcome>
      )}
      {stage === 'paidNoOrder' && (
        <Outcome icon={CircleCheck} title={t.paymentPaidNoOrder} text={t.paymentPaidNoOrderHint}>
          <DarkButton onClick={nav.home}>{t.toHome}</DarkButton>
        </Outcome>
      )}
      {stage === 'pending' && (
        <Outcome icon={Hourglass} title={t.paymentPending} text={t.paymentPendingHint}>
          {pending && (
            <PrimaryButton onClick={recheck}>{t.paymentRecheck}</PrimaryButton>
          )}
          <DarkButton onClick={nav.home}>{t.toHome}</DarkButton>
        </Outcome>
      )}
      {confirmCancel && (
        <ConfirmDialog
          title={t.paymentCancelTitle}
          text={t.paymentCancelText}
          confirm={t.paymentCancel}
          cancel={t.paymentContinue}
          onConfirm={cancel}
          onCancel={() => setConfirmCancel(false)}
        />
      )}
    </div>
  )
}

function Busy({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-12 text-center">
      <Spinner size={40} />
      <p className="text-[18px] font-extrabold text-(--nyt-text)">{title}</p>
      <p className="text-[14px] text-(--nyt-text-muted)">{hint}</p>
    </div>
  )
}

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

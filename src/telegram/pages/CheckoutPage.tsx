import { Banknote, CircleAlert, CreditCard, Globe, MapPin, Store, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AddCardRow, BranchSheet, ChoiceRow } from '../components'
import { ApiError } from '../api'
import { cardEnabled, loadMenu, placeOrder, refreshBranches, refreshCards, startPayment, updateRoute } from '../data'
import { cart, isOpen, lineAvailable, lineSum, menuBranchId, phone, takeawayBranch, visibleBranches, type OrderMode, type PricedLine } from '../domain'
import { errorText, useLocalize, useT, type Dict } from '../i18n'
import { branchStateText, cardTitle, cx, deliveryFeeLine, feeText, money } from '../labels'
import { useNav } from '../nav'
import {
  cardsStore,
  cartStore,
  catalogStore,
  checkoutStore,
  draftStore,
  profileStore,
  savedPayment,
  savePayment,
  useStore,
  type CheckoutForm,
} from '../store'
import type { MobileOrderRequest, OnlinePayment } from '../types'
import {
  BottomBar,
  Card,
  Field,
  FoodImage,
  IconButton,
  Notice,
  PillButton,
  PrimaryButton,
  QtyStepper,
  SectionLabel,
  Segmented,
  TopBar,
} from '../ui'

const patch = (change: Partial<CheckoutForm>) => checkoutStore.set((f) => ({ ...f, ...change }))

/** Filiallar holati va dostavka yo'nalishi — ochilganda yangidan (eskirgan bo'lishi mumkin), keyin menyu narxlari. */
async function refreshPlace(): Promise<void> {
  try {
    await refreshBranches()
    const point = draftStore.get().deliveryPoint
    if (point) await updateRoute(point)
  } catch {
    // ekranda oxirgi ma'lum holat qoladi; buyurtma berishda server yana tekshiradi
  }
  await refreshMenu()
}

async function refreshMenu(): Promise<void> {
  const branches = catalogStore.get().branches
  if (!branches) return
  const { mode, takeawayBranchId, route } = draftStore.get()
  const id = menuBranchId(mode, branches, takeawayBranchId, route)
  if (id) await loadMenu(id, true).catch(() => undefined)
}

async function checkCards(): Promise<void> {
  const enabled = await cardEnabled()
  patch({ cardEnabled: enabled })
  if (enabled) await refreshCards().catch(() => undefined)
}

/**
 * Rasmiylashtirish (Android `CheckoutScreen`): tur, joy, savat, ism / telefon / manzil / izoh, to'lov → naqd —
 * `POST /mobile/orders`, karta — `POST /mobile/payments` (saqlangan kartadan — darhol, aks holda to'lov oynasi).
 */
export default function CheckoutPage() {
  const t = useT()
  const nav = useNav()
  const form = useStore(checkoutStore)
  const draft = useStore(draftStore)
  const catalog = useStore(catalogStore)
  const lines = useStore(cartStore)
  const savedCards = useStore(cardsStore)
  const [showProblems, setShowProblems] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [branchSheet, setBranchSheet] = useState(false)

  useEffect(() => {
    // birinchi ochilishda: ism va telefon — profildan, to'lov — oxirgi tanlov; manzil va izoh bo'sh
    if (!checkoutStore.get().ready) {
      const profile = profileStore.get()
      patch({ ready: true, name: profile.name, phone: profile.phone, payment: savedPayment() })
    }
    void refreshPlace()
    void checkCards()
  }, [])

  const delivery = draft.mode === 'delivery'
  const all = catalog.branches ?? []
  const menuId = catalog.branches ? menuBranchId(draft.mode, all, draft.takeawayBranchId, draft.route) : null
  const menu = menuId ? (catalog.menus[menuId] ?? null) : null
  const priced = cart.price(lines, menu)
  const available = priced.filter(lineAvailable)
  const itemsTotal = available.reduce((sum, l) => sum + lineSum(l), 0)
  const hasUnavailable = menu != null && priced.some((l) => !lineAvailable(l))
  const takeaway = catalog.branches ? takeawayBranch(all, draft.takeawayBranchId) : null
  const route = draft.route

  // karta tanlangan, lekin serverda ulanmagan (yoki hali bilinmagan) — naqd
  const payment: OnlinePayment = form.payment === 'card' && !form.cardEnabled ? 'cash' : form.payment
  const cards = form.cardEnabled ? (savedCards ?? []) : []
  const selectedCardId = !form.cardChosen
    ? (cards[0]?.id ?? null)
    : form.cardChoice && cards.some((c) => c.id === form.cardChoice)
      ? form.cardChoice
      : null
  const paysWithSavedCard = payment === 'card' && selectedCardId != null

  const problems = {
    phone: !phone.isComplete(form.phone),
    // xaritadan joy tanlangan bo'lsa manzil matni ixtiyoriy — kuryer koordinatani oladi
    address: delivery && !draft.deliveryPoint && !form.address.trim(),
  }
  const placeReady = delivery ? draft.deliveryPoint != null && route?.branchId != null : takeaway != null && isOpen(takeaway)

  const setMode = (mode: OrderMode) => {
    draftStore.set((d) => ({ ...d, mode }))
    setError(null)
    void refreshPlace()
  }

  const place = async () => {
    if (placing) return
    if (problems.phone || problems.address || available.length === 0 || !placeReady) {
      setShowProblems(true)
      return
    }
    const request: MobileOrderRequest = {
      type: draft.mode,
      ...(delivery ? {} : { branchId: takeaway?.id }),
      items: available.map((l) => ({ productId: l.line.productId, qty: l.line.qty })),
      note: form.note.trim(),
      online: {
        platform: 'telegram',
        name: form.name.trim(),
        phone: phone.full(form.phone),
        address: delivery ? form.address.trim() : '',
        payment,
        ...(delivery && draft.deliveryPoint ? { location: draft.deliveryPoint } : {}),
      },
      ...(payment === 'card' && selectedCardId ? { cardId: selectedCardId } : {}),
    }
    const card = payment === 'card'
    const savedCard = request.cardId != null
    const deliveryFee = delivery ? (route?.fee ?? null) : null
    setPlacing(true)
    setError(null)
    setShowProblems(true)
    try {
      if (card) {
        // savat to'langunga qadar qoladi — to'lov o'tmasa mijoz qaytadan urinadi
        const started = await startPayment(request, deliveryFee)
        savePayment(payment)
        if (started.paidOrderId) {
          // saqlangan kartadan darhol to'landi — buyurtma qurilmada
          cartStore.set([])
          nav.reset(`order/${started.paidOrderId}`)
        } else {
          nav.go(`payment/${started.pending.id}`)
        }
      } else {
        const saved = await placeOrder(request, deliveryFee)
        savePayment(payment)
        cartStore.set([])
        // buyurtmadan keyin "orqaga" — bosh sahifaga (rasmiylashtirishga emas)
        nav.reset(`order/${saved.order.id}`)
      }
    } catch (e) {
      setError(placeErrorText(t, e, card, savedCard))
      const code = e instanceof ApiError ? e.code : ''
      // holat o'zgargan — filial / narxlar yangilansin; karta boshqa joyda o'chirilgan bo'lishi mumkin
      if (code === 'branch_closed' || code === 'not_found') {
        void refreshPlace()
        if (savedCard) void refreshCards().catch(() => undefined)
      }
      // taom sotuvdan olingan / "faqat zalda" — yangi menyuda u yo'q, savatda "sotilmaydi"
      if (code === 'product_unavailable' || code === 'dine_in_only') void refreshMenu()
      // serverda karta o'chirilgan — tanlov naqdga qaytadi
      if (code === 'card_unavailable') void checkCards()
    } finally {
      setPlacing(false)
    }
  }

  const buttonText = paysWithSavedCard ? t.payNow : payment === 'card' ? t.goToPayment : t.placeOrder
  const visible = visibleBranches(all)

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title={t.checkout} onBack={nav.back} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <Segmented
          options={[
            { id: 'delivery', label: t.delivery },
            { id: 'takeaway', label: t.pickup },
          ]}
          value={draft.mode}
          onChange={setMode}
        />
        <PlaceCard onOpenLocation={() => nav.go('location')} onOpenBranches={() => setBranchSheet(true)} />
        <CartCard lines={priced} hasUnavailable={hasUnavailable} />

        <section className="flex flex-col gap-1.5">
          <SectionLabel>{t.contacts}</SectionLabel>
          <Field value={form.name} onChange={(v) => patch({ name: v.slice(0, 100) })} placeholder={t.name} autoCapitalize="words" autoComplete="name" />
          <Field
            value={form.phone}
            onChange={(v) => patch({ phone: phone.clean(v) })}
            display={phone.group}
            placeholder="90 123 45 67"
            prefix={`${phone.PREFIX} `}
            inputMode="tel"
            autoComplete="tel-national"
            error={showProblems && problems.phone ? t.errors.phone_required : null}
          />
          {delivery && (
            <Field
              value={form.address}
              onChange={(v) => patch({ address: v.slice(0, 300) })}
              placeholder={`${t.address}: ${t.addressPlaceholder}`}
              multiline
              autoCapitalize="sentences"
              error={showProblems && problems.address ? t.errors.address_required : null}
            />
          )}
          <Field value={form.note} onChange={(v) => patch({ note: v.slice(0, 500) })} placeholder={`${t.note}: ${t.notePlaceholder}`} autoCapitalize="sentences" />
        </section>

        <section className="flex flex-col gap-2">
          <SectionLabel>{t.payment}</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            <PaymentOption
              icon={Banknote}
              title={t.payCash}
              hint={delivery ? t.payCashDelivery : t.payCashPickup}
              selected={payment === 'cash'}
              onClick={() => {
                patch({ payment: 'cash' })
                setError(null)
              }}
            />
            <PaymentOption
              icon={CreditCard}
              title={t.payCard}
              hint={form.cardEnabled ? t.payCardHint : t.comingSoon}
              selected={payment === 'card'}
              onClick={
                form.cardEnabled
                  ? () => {
                      patch({ payment: 'card' })
                      setError(null)
                    }
                  : null
              }
            />
          </div>
          {payment === 'card' && (
            <div className="flex flex-col gap-2">
              {cards.map((c) => (
                <ChoiceRow
                  key={c.id}
                  icon={CreditCard}
                  title={cardTitle(t, c)}
                  hint={t.cardSavedHint}
                  selected={selectedCardId === c.id}
                  onClick={() => patch({ cardChoice: c.id, cardChosen: true })}
                />
              ))}
              <ChoiceRow
                icon={Globe}
                title={t.cardOneTime}
                hint={t.cardOneTimeHint}
                selected={selectedCardId == null}
                onClick={() => patch({ cardChoice: null, cardChosen: true })}
              />
              <AddCardRow
                onClick={() => {
                  // qaytganda eng yangi (qo'shilgan) karta tanlanadi
                  patch({ cardChosen: false })
                  setError(null)
                  nav.go('card')
                }}
              />
            </div>
          )}
        </section>

        <Summary itemsTotal={itemsTotal} />
      </div>

      <BottomBar>
        {error && <p className="text-center text-[13px] font-medium text-(--nyt-danger)">{error}</p>}
        <PrimaryButton onClick={() => void place()} disabled={available.length === 0 || !placeReady} loading={placing} trailing={money(t, itemsTotal)}>
          {buttonText}
        </PrimaryButton>
      </BottomBar>

      {branchSheet && (
        <BranchSheet
          branches={visible}
          selectedId={takeaway?.id ?? null}
          onSelect={(branch) => {
            draftStore.set((d) => ({ ...d, takeawayBranchId: branch.id }))
            setError(null)
            setBranchSheet(false)
            void refreshMenu()
          }}
          onClose={() => setBranchSheet(false)}
        />
      )}
    </div>
  )
}

/** Tarmoq xatosi: naqdda — buyurtma tushgan bo'lishi mumkin (qayta yuborish xavfli); kartada — pul yechilmagan. */
function placeErrorText(t: Dict, error: unknown, card: boolean, savedCard: boolean): string {
  if (!(error instanceof ApiError) || error.code !== 'network') return errorText(t, error)
  // saqlangan kartadan server pulni yechib ulgurgan bo'lishi mumkin
  if (savedCard) return t.networkPaySaved
  return card ? t.networkPay : t.networkPlace
}

/** Dostavka — yetkazish narxi (qaysi filial olishi ko'rsatilmaydi); olib ketish — tanlangan filial. */
function PlaceCard({ onOpenLocation, onOpenBranches }: { onOpenLocation: () => void; onOpenBranches: () => void }) {
  const t = useT()
  const draft = useStore(draftStore)
  const { branches } = useStore(catalogStore)
  const delivery = draft.mode === 'delivery'
  const takeaway = branches ? takeawayBranch(branches, draft.takeawayBranchId) : null
  const route = draft.route

  let title: string
  let detail: string | null = null
  if (!delivery) {
    title = takeaway?.name ?? t.chooseBranch
    detail = takeaway ? [takeaway.address, branchStateText(t, takeaway)].filter(Boolean).join(' · ') : null
  } else if (!draft.deliveryPoint) title = t.setAddress
  else if (!route) title = t.checking
  else if (route.branchId == null) title = t.noBranchOpen
  else {
    title = t.myLocation
    detail = deliveryFeeLine(t, route.fee)
  }

  let problem: string | null = null
  if (delivery && draft.deliveryPoint && route && route.branchId == null) problem = t.noBranchOpen
  else if (!delivery && takeaway && !isOpen(takeaway)) problem = t.takeawayClosed
  else if (!delivery && !takeaway && branches && visibleBranches(branches).length > 0) problem = t.noBranchOpen

  return (
    <Card>
      <button
        type="button"
        onClick={delivery ? onOpenLocation : onOpenBranches}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left active:opacity-80"
      >
        {delivery ? <MapPin size={18} className="shrink-0 text-(--nyt-select)" /> : <Store size={18} className="shrink-0 text-(--nyt-select)" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold text-(--nyt-text)">{title}</span>
          {detail && <span className="line-clamp-2 block text-[12px] text-(--nyt-text-muted)">{detail}</span>}
          {/* "Yetkazish narxini kuryer aytadi" — tagida kichik izoh */}
          {delivery && route?.branchId != null && route.fee == null && (
            <span className="block text-[12px] text-(--nyt-text-faint)">{t.feeByDistance}</span>
          )}
        </span>
        <span className="shrink-0 text-[13px] font-semibold text-(--nyt-select)">{t.change}</span>
      </button>
      {problem && <Notice className="mx-3 mb-2.5" tone="danger" icon={CircleAlert} title={problem} />}
      {delivery && !draft.deliveryPoint && (
        <div className="px-3 pb-2.5">
          <PillButton icon={MapPin} onClick={onOpenLocation}>
            {t.myLocation}
          </PillButton>
        </div>
      )}
    </Card>
  )
}

function CartCard({ lines, hasUnavailable }: { lines: PricedLine[]; hasUnavailable: boolean }) {
  const t = useT()
  const localize = useLocalize()
  return (
    <Card>
      {lines.length === 0 && <p className="px-4 py-6 text-center text-[14px] text-(--nyt-text-muted)">{t.emptyCart}</p>}
      {lines.map((l) => {
        const available = lineAvailable(l)
        return (
          <div key={l.line.key} className={cx('flex items-center gap-3 px-3 py-2.5', !available && 'opacity-55')}>
            <FoodImage src={l.product?.image} className="h-[52px] w-[52px] shrink-0 rounded-[10px] bg-(--nyt-muted)" iconSize={20} />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[14px] font-semibold text-(--nyt-text)">{l.product ? localize(l.product.name) : l.line.productId}</p>
              <p className="text-[12px]" style={{ color: available ? 'var(--nyt-text-muted)' : 'var(--nyt-danger)' }}>
                {available ? money(t, lineSum(l)) : t.lineUnavailable}
              </p>
            </div>
            {available ? (
              <QtyStepper qty={l.line.qty} onChange={(d) => cartStore.set((ls) => cart.change(ls, l.line.key, d))} />
            ) : (
              <IconButton
                icon={X}
                label=""
                onClick={() => cartStore.set((ls) => cart.remove(ls, l.line.key))}
                className="bg-(--nyt-muted) text-(--nyt-text)"
                size={36}
                iconSize={18}
              />
            )}
          </div>
        )
      })}
      {hasUnavailable && <p className="px-3.5 pb-3 text-[12px] text-(--nyt-warning)">{t.unavailableExcluded}</p>}
    </Card>
  )
}

/** [onClick] `null` — usul hali ulanmagan: xira, tanlanmaydi, izohi mayda matnda ("Tez kunda"). */
function PaymentOption({
  icon: Icon,
  title,
  hint,
  selected,
  onClick,
}: {
  icon: typeof Banknote
  title: string
  hint: string
  selected: boolean
  onClick: (() => void) | null
}) {
  const enabled = onClick != null
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={!enabled}
      onClick={onClick ?? undefined}
      className={cx(
        'flex items-center gap-2 rounded-[14px] bg-(--nyt-surface) px-2.5 py-2 text-left',
        selected ? 'border-2 border-(--nyt-select)' : 'border border-(--nyt-line)',
      )}
    >
      <Icon size={20} className="shrink-0" style={{ color: selected ? 'var(--nyt-select)' : 'var(--nyt-text-faint)' }} />
      <span className="min-w-0 flex-1">
        <span className={cx('block text-[14px] font-bold', enabled ? 'text-(--nyt-text)' : 'text-(--nyt-text-faint)')}>{title}</span>
        <span className={cx('line-clamp-2 block', enabled ? 'text-[12px] text-(--nyt-text-muted)' : 'text-[9px] leading-3 text-(--nyt-text-faint)')}>
          {hint}
        </span>
      </span>
    </button>
  )
}

/** Taomlar summasi; dostavkada — yetkazish narxi alohida (buyurtma summasiga kirmaydi, API.md 5.2). */
function Summary({ itemsTotal }: { itemsTotal: number }) {
  const t = useT()
  const draft = useStore(draftStore)
  const route = draft.route
  return (
    <Card>
      <div className="flex flex-col gap-1.5 px-3.5 py-3">
        <Row label={t.itemsTotal} value={money(t, itemsTotal)} />
        {draft.mode === 'delivery' && route?.branchId != null && (
          route.fee == null ? (
            <p className="text-[14px] text-(--nyt-text-muted)">{t.feeCourierNote}</p>
          ) : (
            <Row label={`${t.deliveryFee} · ${t.feeSeparate}`} value={feeText(t, route.fee)} muted />
          )
        )}
        {/* chekdagidek uzuq-uzuq chiziq — jami ustida */}
        <div className="my-1 border-t border-dashed border-(--nyt-text-faint)" />
        <div className="flex items-center">
          <span className="flex-1 text-[16px] font-extrabold text-(--nyt-text)">{t.total}</span>
          <span className="text-[24px] font-extrabold text-(--nyt-text)">{money(t, itemsTotal)}</span>
        </div>
      </div>
    </Card>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-start gap-3 text-[14px]">
      <span className="flex-1 text-(--nyt-text-muted)">{label}</span>
      <span className={cx('whitespace-nowrap', muted ? 'text-(--nyt-text-muted)' : 'text-(--nyt-text)')}>{value}</span>
    </div>
  )
}

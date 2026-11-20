import { ChevronDown, ChevronRight, CircleAlert, EllipsisVertical, MapPin, MapPinned, Plus, ReceiptText, ShoppingBag, Store, User } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { BranchSheet, ProductSheet, StatusLine } from '../components'
import { loadMenu, refreshBranches, refreshOrder, resumePayment, updateRoute } from '../data'
import {
  ALL_CATEGORIES,
  cart,
  format,
  lineAvailable,
  lineSum,
  menuBranchId,
  NBSP,
  productsOf,
  progress,
  selectedCategory,
  takeawayBranch,
  visibleBranches,
} from '../domain'
import { errorText, LANGS, useLocalize, useT } from '../i18n'
import { branchStateText, cx, headlineText, imageUrl, money } from '../labels'
import { useNav } from '../nav'
import { cartStore, catalogStore, draftStore, ordersStore, resetForms, settingsStore, useStore, type SavedOrder } from '../store'
import type { Category, GeoPoint, MenuProduct } from '../types'
import { Card, FoodImage, Notice, PillButton, Segmented, Sheet, Spinner } from '../ui'

/** Banner uchun joriy buyurtma eng yangi shuncha buyurtma ichidan qidiriladi. */
const CURRENT_SCAN = 20
/** "Barchasi" ikonkasi — kategoriya ikonkalari to'plamidan. */
const ALL_CATEGORIES_ICON = '/images/icons/bento-box.png'

/**
 * Bosh sahifa (Android `HomeScreen`): qora sarlavha (joy, "Buyurtmalarim", sozlamalar), "Buyurtmam" banneri, joy haqida
 * ogohlantirish, kategoriyalar ("Barchasi" — standart), 2 ustunli menyu, savat paneli.
 */
export default function HomePage() {
  const t = useT()
  const nav = useNav()
  const draft = useStore(draftStore)
  const catalog = useStore(catalogStore)
  const lines = useStore(cartStore)
  const orders = useStore(ordersStore)

  const [branchesError, setBranchesError] = useState<unknown>(null)
  const [routeError, setRouteError] = useState<unknown>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [menuError, setMenuError] = useState<unknown>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [opened, setOpened] = useState<MenuProduct | null>(null)
  const [sheet, setSheet] = useState<'branch' | 'settings' | null>(null)

  const all = catalog.branches
  const branches = all ? visibleBranches(all) : null
  const menuId = all ? menuBranchId(draft.mode, all, draft.takeawayBranchId, draft.route) : null
  const menu = menuId ? (catalog.menus[menuId] ?? null) : null
  const takeaway = all ? takeawayBranch(all, draft.takeawayBranchId) : null
  const categoryId = selectedCategory(menu, category)
  const products = productsOf(menu, categoryId)
  const counts = cart.counts(lines)
  const priced = cart.price(lines, menu).filter(lineAvailable)
  const cartQty = priced.reduce((sum, l) => sum + l.line.qty, 0)
  const cartTotal = priced.reduce((sum, l) => sum + lineSum(l), 0)
  const current = orders.slice(0, CURRENT_SCAN).find((o) => progress.isCurrent(o.order))

  const loadBranches = useCallback(async () => {
    try {
      await refreshBranches()
      setBranchesError(null)
    } catch (e) {
      setBranchesError(e)
    }
  }, [])

  const loadRoute = useCallback(async (point: GeoPoint) => {
    setRouteLoading(true)
    try {
      await updateRoute(point)
      setRouteError(null)
    } catch (e) {
      setRouteError(e)
    } finally {
      setRouteLoading(false)
    }
  }, [])

  // keyingi rasmiylashtirish — yangi forma (manzil va izoh bo'sh, ism / telefon — profildan)
  useEffect(() => resetForms(), [])

  // ochilganda va mini appga qaytganda: filiallar, yo'nalish, yakunlanmagan karta to'lovi, ishdagi buyurtmalar holati
  useEffect(() => {
    const resume = () => {
      void loadBranches()
      const point = draftStore.get().deliveryPoint
      if (point) void loadRoute(point)
      void resumePayment().then(refreshCurrentOrders)
    }
    resume()
    const onVisible = () => {
      if (document.visibilityState === 'visible') resume()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadBranches, loadRoute])

  useEffect(() => {
    if (!menuId) return
    let cancelled = false
    loadMenu(menuId).then(
      () => !cancelled && setMenuError(null),
      (e: unknown) => !cancelled && setMenuError(e),
    )
    return () => {
      cancelled = true
    }
  }, [menuId])

  const retry = () => {
    void loadBranches()
    const { deliveryPoint, route } = draftStore.get()
    if (deliveryPoint && !route) void loadRoute(deliveryPoint)
    if (menuId && !menu) loadMenu(menuId).then(() => setMenuError(null), setMenuError)
  }

  const add = (productId: string, qty = 1) => cartStore.set((l) => cart.add(l, productId, qty))
  const delivery = draft.mode === 'delivery'

  return (
    <div className={cx('flex min-h-dvh flex-col gap-3', cartQty > 0 ? 'pb-28' : 'pb-8')}>
      <header className="flex flex-col gap-3.5 rounded-b-[24px] bg-(--nyt-header) px-4 pt-3 pb-5">
        <div className="flex items-center gap-2">
          <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] bg-(--nyt-accent) text-[15px] font-black text-(--nyt-on-accent)">
            NY
          </span>
          <button
            type="button"
            onClick={() => (delivery ? nav.go('location') : setSheet('branch'))}
            className="flex h-[38px] min-w-0 flex-1 items-center gap-1.5 rounded-full bg-(--nyt-header-chip) pr-2 pl-2.5 active:opacity-80"
          >
            {delivery ? <MapPin size={16} className="shrink-0 text-(--nyt-accent)" /> : <Store size={16} className="shrink-0 text-(--nyt-accent)" />}
            <span className="truncate text-[13px] font-semibold text-(--nyt-on-header)">
              {delivery ? t.myLocation : (takeaway?.name ?? t.chooseBranch)}
            </span>
            <ChevronDown size={18} className="ml-auto shrink-0 text-(--nyt-on-header-muted)" />
          </button>
          <HeaderButton label={t.myOrders} onClick={() => nav.go('orders')}>
            <ReceiptText size={20} />
          </HeaderButton>
          <HeaderButton label={t.settings} onClick={() => setSheet('settings')}>
            <EllipsisVertical size={20} />
          </HeaderButton>
        </div>
        <div>
          <p className="text-[14px] text-(--nyt-on-header-muted)">{t.greeting}</p>
          <h1 className="text-[27px] leading-tight font-black text-(--nyt-on-header)">{t.homeTitle}</h1>
        </div>
      </header>

      {current && <CurrentOrderBanner saved={current} onClick={() => nav.go(`order/${current.order.id}`)} />}

      <PlaceNotice
        loaded={branches != null}
        routeLoading={routeLoading}
        routeError={routeError}
        onOpenLocation={() => nav.go('location')}
        onRetryRoute={() => draft.deliveryPoint && void loadRoute(draft.deliveryPoint)}
      />

      {(() => {
        const error = menuError ?? (branches == null ? branchesError : null)
        if (!menu && error) {
          return (
            <Notice
              className="mx-4"
              tone="danger"
              icon={CircleAlert}
              title={errorText(t, error)}
              action={<PillButton onClick={retry}>{t.retry}</PillButton>}
            />
          )
        }
        // filial yo'q — menyu so'ralmaydi, yuklanish belgisi to'xtamay aylanmasin
        if (!menu && all != null && menuId == null) {
          return (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <Store size={40} className="text-(--nyt-text-faint)" />
              <p className="text-[17px] font-bold text-(--nyt-text)">{t.menuUnavailableTitle}</p>
              <p className="text-[14px] text-(--nyt-text-muted)">{t.menuUnavailableText}</p>
              <div className="mt-2">
                <PillButton onClick={retry}>{t.retry}</PillButton>
              </div>
            </div>
          )
        }
        if (!menu) {
          return (
            <div className="flex justify-center p-12">
              <Spinner />
            </div>
          )
        }
        if (menu.categories.length === 0) return <p className="p-6 text-[14px] text-(--nyt-text-muted)">{t.menuEmpty}</p>
        return (
          <>
            <CategoryRow categories={menu.categories} selected={categoryId} onSelect={setCategory} />
            <div className="grid grid-cols-2 gap-3 px-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  count={counts[product.id]}
                  onOpen={() => setOpened(product)}
                  onAdd={() => add(product.id)}
                />
              ))}
            </div>
          </>
        )
      })()}

      {cartQty > 0 && (
        <div className="nyt-safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[640px] px-3">
          <button
            type="button"
            onClick={() => nav.go('checkout')}
            className="flex w-full items-center gap-3 rounded-[16px] bg-(--nyt-bar) p-2.5 text-left active:opacity-90"
          >
            <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-(--nyt-accent) text-(--nyt-on-accent)">
              <ShoppingBag size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-bold text-(--nyt-on-bar)">{t.cart}</span>
              <span className="block text-[12px] text-(--nyt-on-bar) opacity-60">{t.itemsCount(cartQty)}</span>
            </span>
            <span className="text-[16px] font-black text-(--nyt-on-bar)">{money(t, cartTotal)}</span>
            <ChevronRight size={20} className="text-(--nyt-on-bar)" />
          </button>
        </div>
      )}

      {opened && (
        <ProductSheet
          product={opened}
          onAdd={(qty) => {
            add(opened.id, qty)
            setOpened(null)
          }}
          onClose={() => setOpened(null)}
        />
      )}
      {sheet === 'branch' && branches && (
        <BranchSheet
          branches={branches}
          selectedId={takeaway?.id ?? null}
          onSelect={(branch) => {
            draftStore.set((d) => ({ ...d, takeawayBranchId: branch.id }))
            setSheet(null)
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'settings' && (
        <SettingsSheet
          onProfile={() => {
            setSheet(null)
            nav.go('profile')
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  )
}

/** Banner eskirmasin: ishdagi buyurtmalar holati serverdan (mini app yopiq turgan bo'lishi mumkin). */
async function refreshCurrentOrders() {
  const live = ordersStore
    .get()
    .slice(0, CURRENT_SCAN)
    .filter((o) => progress.isCurrent(o.order))
    .slice(0, 3)
  await Promise.all(live.map((o) => refreshOrder(o.order.id).catch(() => undefined)))
}

function HeaderButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-(--nyt-header-chip) text-(--nyt-on-header) active:opacity-80"
    >
      {children}
    </button>
  )
}

function CurrentOrderBanner({ saved, onClick }: { saved: SavedOrder; onClick: () => void }) {
  const t = useT()
  return (
    <div className="px-4">
      <Card onClick={onClick}>
        <div className="flex items-center gap-3 px-3.5 py-2">
          <span className="text-[22px] font-black text-(--nyt-text)">{format.orderNumber(saved.order.number)}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] text-(--nyt-text-muted)">{t.myOrder}</span>
            <StatusLine order={saved.order} text={headlineText(t, saved.order)} />
          </span>
          <ChevronRight size={20} className="text-(--nyt-text-faint)" />
        </div>
      </Card>
    </div>
  )
}

/** Dostavkada — manzil belgilanmagan yoki filial topilmagan bo'lsa; olib ketishda — tanlangan filial yopiq bo'lsa. */
function PlaceNotice({
  loaded,
  routeLoading,
  routeError,
  onOpenLocation,
  onRetryRoute,
}: {
  loaded: boolean
  routeLoading: boolean
  routeError: unknown
  onOpenLocation: () => void
  onRetryRoute: () => void
}) {
  const t = useT()
  const draft = useStore(draftStore)
  const { branches } = useStore(catalogStore)
  if (!loaded || !branches) return null
  if (draft.mode === 'takeaway') {
    const branch = takeawayBranch(branches, draft.takeawayBranchId)
    if (!branch) return <Notice className="mx-4" tone="danger" icon={CircleAlert} title={t.noBranchOpen} />
    if (branch.onlineState !== 'open') {
      return <Notice className="mx-4" tone="warning" icon={CircleAlert} title={t.takeawayClosed} text={`${branch.name} · ${branchStateText(t, branch)}`} />
    }
    return null
  }
  if (!draft.deliveryPoint) {
    return (
      <Card className="mx-4">
        <div className="flex items-center gap-3 p-3.5">
          <MapPinned size={28} className="shrink-0 text-(--nyt-select)" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-(--nyt-text)">{t.setAddress}</p>
            <p className="text-[12px] text-(--nyt-text-muted)">{t.menuPreviewHint}</p>
          </div>
        </div>
        <div className="px-3.5 pb-3.5">
          <PillButton icon={MapPin} onClick={onOpenLocation}>
            {t.myLocation}
          </PillButton>
        </div>
      </Card>
    )
  }
  if (!draft.route && routeError && !routeLoading) {
    return (
      <Notice
        className="mx-4"
        tone="danger"
        icon={CircleAlert}
        title={errorText(t, routeError)}
        action={<PillButton onClick={onRetryRoute}>{t.retry}</PillButton>}
      />
    )
  }
  // qaysi filial olishi mijozga ko'rsatilmaydi — tizim o'zi hal qiladi
  if (draft.route && draft.route.branchId == null) return <Notice className="mx-4" tone="danger" icon={CircleAlert} title={t.noBranchOpen} />
  return null
}

function CategoryRow({
  categories,
  selected,
  onSelect,
}: {
  categories: Category[]
  selected: string
  onSelect: (id: string) => void
}) {
  const t = useT()
  const localize = useLocalize()
  return (
    <div className="nyt-scroll-x flex gap-2 overflow-x-auto px-4">
      <CategoryChip text={t.allCategories} icon={ALL_CATEGORIES_ICON} active={selected === ALL_CATEGORIES} onClick={() => onSelect(ALL_CATEGORIES)} />
      {categories.map((c) => (
        <CategoryChip key={c.id} text={localize(c.name)} icon={c.icon} active={c.id === selected} onClick={() => onSelect(c.id)} />
      ))}
    </div>
  )
}

function CategoryChip({ text, icon, active, onClick }: { text: string; icon: string; active: boolean; onClick: () => void }) {
  const url = imageUrl(icon)
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cx(
        'flex h-[34px] shrink-0 items-center gap-1.5 rounded-full pr-3 text-[13px] font-semibold whitespace-nowrap',
        url ? 'pl-1.5' : 'pl-3',
        active ? 'bg-(--nyt-accent) text-(--nyt-on-accent)' : 'bg-(--nyt-surface) text-(--nyt-text)',
      )}
    >
      {url && <img src={url} alt="" className="h-[22px] w-[22px] object-contain" />}
      {text}
    </button>
  )
}

/** Taom kartasi (web "GoMeal"): rasm butun, nom 2 qator, pastda narx + oltin "+" tugma. */
function ProductCard({ product, count, onOpen, onAdd }: { product: MenuProduct; count?: number; onOpen: () => void; onAdd: () => void }) {
  const t = useT()
  const localize = useLocalize()
  const name = localize(product.name)
  return (
    <div className="relative flex flex-col rounded-[16px] border border-(--nyt-card-border) bg-(--nyt-surface) p-2">
      {/* butun karta — taom oynasi; "+" tugmasi uning ustida (tugma ichida tugma yo'q) */}
      <button
        type="button"
        aria-label={name}
        onClick={onOpen}
        className="absolute inset-0 rounded-[16px] active:bg-[rgba(127,127,127,0.08)]"
      />
      <div className="pointer-events-none relative">
        <FoodImage src={product.image} className="aspect-[4/3] w-full rounded-[12px]" />
        {count != null && count > 0 && (
          <span className="absolute top-0 right-0 flex h-7 min-w-7 items-center justify-center rounded-full bg-(--nyt-gold) px-1.5 text-[13px] font-bold text-white">
            {count}
          </span>
        )}
      </div>
      <div className="pointer-events-none relative flex flex-1 flex-col p-2">
        <p className="line-clamp-2 text-[14px] leading-snug text-(--nyt-text)">{name}</p>
        <div className="mt-auto flex items-center gap-1.5 pt-2">
          <p className="min-w-0 flex-1 truncate text-[15px] font-bold text-(--nyt-text)">
            {format.number(product.price ?? 0)}
            {NBSP}
            <span className="text-[0.8em] text-(--nyt-gold)">{t.soum}</span>
          </p>
          <button
            type="button"
            aria-label={t.add}
            onClick={onAdd}
            className="pointer-events-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-(--nyt-gold) text-(--nyt-header) active:opacity-80"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}

/** "⋮": profil, til va yorug' / tungi rejim — bitta oynada. */
function SettingsSheet({ onProfile, onClose }: { onProfile: () => void; onClose: () => void }) {
  const t = useT()
  const settings = useStore(settingsStore)
  return (
    <Sheet title={t.settings} onClose={onClose}>
      <div className="flex flex-col gap-4 p-4 pt-2">
        <button type="button" onClick={onProfile} className="flex items-center gap-3 rounded-[14px] bg-(--nyt-muted) px-3 py-3 text-left">
          <User size={20} className="text-(--nyt-select)" />
          <span className="flex-1">
            <span className="block text-[15px] font-bold text-(--nyt-text)">{t.profile}</span>
            <span className="block text-[12px] text-(--nyt-text-muted)">{t.profileHint}</span>
          </span>
          <ChevronRight size={18} className="text-(--nyt-text-faint)" />
        </button>
        <div className="flex flex-col gap-1.5">
          <p className="px-1 text-[12px] font-bold text-(--nyt-text-muted)">{t.language}</p>
          <Segmented options={LANGS} value={settings.lang} onChange={(lang) => settingsStore.set((s) => ({ ...s, lang }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="px-1 text-[12px] font-bold text-(--nyt-text-muted)">{t.theme}</p>
          <Segmented
            options={[
              { id: 'light', label: t.themeLight },
              { id: 'dark', label: t.themeDark },
            ]}
            value={settings.theme}
            onChange={(theme) => settingsStore.set((s) => ({ ...s, theme }))}
          />
        </div>
      </div>
    </Sheet>
  )
}

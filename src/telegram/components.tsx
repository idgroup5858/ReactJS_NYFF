import {
  Bike,
  ChefHat,
  CircleAlert,
  CirclePlus,
  CircleX,
  Clock,
  CreditCard,
  House,
  Package,
  PartyPopper,
  Trash,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { isOpen, progress } from './domain'
import { useLocalize, useT } from './i18n'
import { branchStateText, cardTitle, cx, money, statusColor } from './labels'
import type { Branch, CustomerOrder, MenuProduct, SavedCard } from './types'
import { FoodImage, PrimaryButton, QtyStepper, Sheet, Spinner } from './ui'

/** Holat ikonkasi — kuzatish sahifasidagi bosqich bilan bir xil. */
function StatusIcon({ order, size }: { order: CustomerOrder; size: number }) {
  const props = { size, className: 'shrink-0' }
  switch (progress.headline(order)) {
    case 'waiting':
      return <Clock {...props} />
    case 'cooking':
      return <ChefHat {...props} />
    case 'readyDelivery':
      return <Package {...props} />
    case 'readyPickup':
      return <PartyPopper {...props} />
    case 'onTheWay':
      return <Bike {...props} />
    case 'delivered':
      return <House {...props} />
    case 'returned':
      return <CircleAlert {...props} />
    default:
      return <CircleX {...props} />
  }
}

/** Rangli holat matni va ikonka (fonsiz) — "Buyurtmam" banneri, tarix. */
export function StatusLine({ order, text, size = 13 }: { order: CustomerOrder; text: string; size?: number }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 font-semibold" style={{ color: statusColor(order), fontSize: size }}>
      <StatusIcon order={order} size={size + 2} />
      <span className="truncate">{text}</span>
    </span>
  )
}

// ---------------------------------------------------------------- filial tanlash (olib ketish)

/** Faqat ochiq filialni tanlash mumkin (API.md 5.2); yopiqlari — xira, holati bilan. */
export function BranchSheet({
  branches,
  selectedId,
  onSelect,
  onClose,
}: {
  branches: Branch[]
  selectedId: string | null
  onSelect: (branch: Branch) => void
  onClose: () => void
}) {
  const t = useT()
  return (
    <Sheet title={t.chooseBranch} onClose={onClose}>
      <div className="flex flex-col gap-2 p-4 pt-2">
        {branches.map((branch) => {
          const open = isOpen(branch)
          const selected = branch.id === selectedId
          return (
            <button
              key={branch.id}
              type="button"
              disabled={!open}
              onClick={() => onSelect(branch)}
              className={cx(
                'flex flex-col items-start rounded-[14px] border bg-(--nyt-surface) px-3 py-2.5 text-left',
                selected ? 'border-2 border-(--nyt-select)' : 'border-(--nyt-line)',
                !open && 'opacity-55',
              )}
            >
              <span className="text-[15px] font-bold text-(--nyt-text)">{branch.name}</span>
              {branch.address && <span className="text-[12px] text-(--nyt-text-muted)">{branch.address}</span>}
              <span className="mt-0.5 text-[12px] font-semibold" style={{ color: open ? 'var(--nyt-success)' : 'var(--nyt-text-faint)' }}>
                {branchStateText(t, branch)}
              </span>
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}

// ---------------------------------------------------------------- taom oynasi

export function ProductSheet({ product, onAdd, onClose }: { product: MenuProduct; onAdd: (qty: number) => void; onClose: () => void }) {
  const t = useT()
  const localize = useLocalize()
  const [qty, setQty] = useState(1)
  const composition = product.composition.map(localize).filter(Boolean)
  return (
    <Sheet onClose={onClose}>
      <div className="flex flex-col gap-3 p-4 pt-2">
        <FoodImage src={product.image} className="aspect-[4/3] w-full rounded-[16px] bg-(--nyt-surface)" iconSize={48} />
        <h2 className="text-[20px] leading-tight font-extrabold text-(--nyt-text)">{localize(product.name)}</h2>
        {composition.length > 0 && (
          <div>
            <p className="text-[12px] font-bold tracking-wide text-(--nyt-text-muted) uppercase">{t.composition}</p>
            <p className="mt-1 text-[14px] text-(--nyt-text-muted)">{composition.join(', ')}</p>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[20px] font-extrabold text-(--nyt-text)">{money(t, product.price ?? 0)}</span>
          <QtyStepper qty={qty} onChange={(d) => setQty((q) => Math.max(1, Math.min(99, q + d)))} />
        </div>
        <PrimaryButton onClick={() => onAdd(qty)} trailing={money(t, (product.price ?? 0) * qty)}>
          {t.addToCart}
        </PrimaryButton>
      </div>
    </Sheet>
  )
}

// ---------------------------------------------------------------- kartalar

/** Tanlanadigan qator (saqlangan karta / bir martalik to'lov). */
export function ChoiceRow({
  icon: Icon,
  title,
  hint,
  selected,
  onClick,
}: {
  icon: LucideIcon
  title: string
  hint?: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cx(
        'flex w-full items-center gap-2.5 rounded-[14px] bg-(--nyt-surface) px-3 py-2.5 text-left',
        selected ? 'border-2 border-(--nyt-select)' : 'border border-(--nyt-line)',
      )}
    >
      <Icon size={20} className="shrink-0" style={{ color: selected ? 'var(--nyt-select)' : 'var(--nyt-text-faint)' }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-bold text-(--nyt-text)">{title}</span>
        {hint && <span className="block text-[12px] text-(--nyt-text-muted)">{hint}</span>}
      </span>
    </button>
  )
}

/** "+ Karta qo'shish" — rasmiylashtirishda ham, profilda ham. */
export function AddCardRow({ onClick }: { onClick: () => void }) {
  const t = useT()
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-left active:opacity-70">
      <CirclePlus size={20} className="text-(--nyt-select)" />
      <span className="text-[14px] font-bold text-(--nyt-select)">{t.cardAdd}</span>
    </button>
  )
}

/** Profildagi karta: nomi va o'chirish tugmasi (tasdiqsiz). */
export function SavedCardRow({ card, deleting, onDelete }: { card: SavedCard; deleting: boolean; onDelete: () => void }) {
  const t = useT()
  return (
    <div className="flex items-center gap-2.5 rounded-[14px] border border-(--nyt-line) bg-(--nyt-surface) py-1 pr-1 pl-3">
      <CreditCard size={20} className="shrink-0 text-(--nyt-text-faint)" />
      <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-(--nyt-text)">{cardTitle(t, card)}</span>
      {deleting ? (
        <span className="flex h-11 w-11 items-center justify-center">
          <Spinner size={20} color="var(--nyt-danger)" />
        </span>
      ) : (
        <button
          type="button"
          aria-label={t.cardDelete}
          onClick={onDelete}
          className="flex h-11 w-11 items-center justify-center rounded-full text-(--nyt-danger) active:opacity-70"
        >
          <Trash size={20} />
        </button>
      )}
    </div>
  )
}

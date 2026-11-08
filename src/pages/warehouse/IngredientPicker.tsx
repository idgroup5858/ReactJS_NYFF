import { Check, ChevronDown, Search } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { inputClass } from '@/components/ui/styles'
import { INGREDIENT_GROUPS, type ID, type Ingredient, type IngredientGroup } from '@/domain/types'
import { useLocalize, useT } from '@/i18n'

/** katta-kichik harf va o' / o‘ / oʻ farqsiz */
const normalize = (text: string) => text.toLowerCase().replace(/[‘’ʻʼ`´]/g, "'")
/** raqamlar son sifatida: "Cola 0.5 l" → "Cola 1 l" → "Cola 1.5 l" → "Cola 2 l" */
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

type Section = { group: IngredientGroup; items: Ingredient[] }

/** Guruhlar tartibida, guruh ichida alifbo bo'yicha (bir xil nomlilar yonma-yon). So'zlarning hammasi nomda bo'lishi kerak. */
function buildSections(ingredients: Ingredient[], query: string, localize: (text: Ingredient['name']) => string): Section[] {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  const matches = (item: Ingredient) =>
    words.length === 0 ||
    Object.values(item.name).some((name) => {
      const text = normalize(name)
      return words.every((word) => text.includes(word))
    })
  return INGREDIENT_GROUPS.map((group) => ({
    group,
    items: ingredients.filter((item) => item.group === group && matches(item)).sort((a, b) => collator.compare(localize(a.name), localize(b.name))),
  })).filter((section) => section.items.length > 0)
}

type Props = {
  value: ID
  onChange: (id: ID) => void
  /** tanlash mumkin bo'lganlar (faollar) */
  ingredients: Ingredient[]
  /** tanlangan mahsulot — ro'yxatda bo'lmasa ham (nofaol) nomi ko'rinadi */
  selected?: Ingredient
  className?: string
}

/**
 * Mahsulot tanlash: select ko'rinishidagi tugma → qidiruv maydoni va guruhlangan ro'yxat. Klaviatura: yozish — qidiruv,
 * ↑/↓ — yurish, Enter — tanlash, Esc — yopish. Yopiq tugmada harf bosilsa — o'sha harf bilan qidiruv ochiladi.
 */
export default function IngredientPicker({ value, onChange, ingredients, selected, className = '' }: Props) {
  const t = useT()
  const localize = useLocalize()
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const sections = open ? buildSections(ingredients, query, localize) : []
  const flat = sections.flatMap((section) => section.items)
  const indexOf = new Map(flat.map((item, index) => [item.id, index]))

  const openWith = (initial = '') => {
    // qidiruvsiz ochilsa — tanlangan mahsulot ustida turadi
    const index = initial ? 0 : buildSections(ingredients, '', localize).flatMap((section) => section.items).findIndex((item) => item.id === value)
    setQuery(initial)
    setActive(Math.max(0, index))
    setOpen(true)
  }
  const close = (refocus = false) => {
    setOpen(false)
    if (refocus) buttonRef.current?.focus()
  }
  const pick = (id: ID) => {
    onChange(id)
    close(true)
  }

  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [open])

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const onButtonKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      openWith()
    } else if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault()
      openWith(event.key)
    }
  }

  const onSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => Math.min(index + 1, flat.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      // forma yuborilmasin
      event.preventDefault()
      const item = flat[active]
      if (item) pick(item.id)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close(true)
    } else if (event.key === 'Tab') {
      close()
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? close() : openWith())}
        onKeyDown={onButtonKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t.purchase.chooseIngredient}
        className={`${inputClass} flex cursor-pointer items-center gap-2 text-left focus-visible:border-neutral-900 focus-visible:outline-none dark:focus-visible:border-vsc-focus`}
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? '' : 'text-neutral-400'}`}>{selected ? localize(selected.name) : t.purchase.chooseIngredient}</span>
        <ChevronDown size={14} className={`shrink-0 text-neutral-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full right-0 left-0 z-40 mt-1 min-w-64 rounded-card bg-surface p-1.5 text-neutral-900 shadow-float">
          <label className="relative block">
            <Search size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-neutral-400" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActive(0)
              }}
              onKeyDown={onSearchKey}
              placeholder={t.stock.search}
              role="combobox"
              aria-label={t.stock.search}
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={flat[active] ? `${listId}-${active}` : undefined}
              className={`${inputClass} pl-8`}
            />
          </label>
          <div ref={listRef} id={listId} role="listbox" className="mt-1.5 max-h-72 overflow-y-auto">
            {sections.length === 0 ? (
              <p className="px-2.5 py-3 text-center text-sm text-neutral-500">{t.stock.emptySearch}</p>
            ) : (
              sections.map((section) => (
                <div key={section.group} role="group" aria-label={t.stock.groups[section.group]}>
                  <p className="px-2.5 pt-2 pb-1 text-[10px] font-bold tracking-[0.14em] text-neutral-400 uppercase">{t.stock.groups[section.group]}</p>
                  {section.items.map((item) => {
                    const index = indexOf.get(item.id) ?? -1
                    const isSelected = item.id === value
                    return (
                      <div
                        key={item.id}
                        id={`${listId}-${index}`}
                        data-index={index}
                        role="option"
                        aria-selected={isSelected}
                        // fokus qidiruv maydonida qolsin
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseMove={() => setActive(index)}
                        onClick={() => pick(item.id)}
                        className={`flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-sm ${index === active ? 'bg-neutral-100' : ''} ${isSelected ? 'font-semibold' : ''}`}
                      >
                        <span className="min-w-0 flex-1 truncate">{localize(item.name)}</span>
                        {isSelected && <Check size={14} className="shrink-0 text-select" />}
                      </div>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

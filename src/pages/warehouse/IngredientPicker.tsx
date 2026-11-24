import { Check, ChevronDown, Search } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useIngredientGroups } from '@/api/queries'
import { inputClass } from '@/components/ui/styles'
import type { ID, Ingredient, IngredientGroup } from '@/domain/types'
import { useLocalize, useT } from '@/i18n'
import { compareIngredients, groupSections } from './groupSections'

/** katta-kichik harf va o' / o‘ / oʻ farqsiz */
const normalize = (text: string) => text.toLowerCase().replace(/[‘’ʻʼ`´]/g, "'")

type Option = { id: ID; label: string }
type Section = { key: string; title: string; items: Option[] }

/** Ro'yxat boshidagi qo'shimcha bo'lim (masalan chiqim turlari): berilgan tartibda, mahsulot guruhlaridan oldin. */
export type ExtraSection = { title: string; items: Option[] }

/**
 * Avval qo'shimcha bo'lim, keyin mahsulot guruhlari tartibida, guruh ichida admin surgan tartibda («Mahsulotlar» dagi
 * ↑ / ↓, 2026-11-24 gacha — alifbo). So'zlarning hammasi nomda bo'lishi kerak (mahsulotda — istalgan tildagi nomida).
 * Guruhlar hali yuklanmagan bo'lsa ([groups] — `undefined`) — sarlavhasiz bitta ro'yxat.
 */
function buildSections(
  ingredients: Ingredient[],
  query: string,
  localize: (text: Ingredient['name']) => string,
  groups: IngredientGroup[] | undefined,
  extra?: ExtraSection,
): Section[] {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  const matches = (names: string[]) =>
    words.length === 0 ||
    names.some((name) => {
      const text = normalize(name)
      return words.every((word) => text.includes(word))
    })
  const head = extra ? [{ key: 'extra', title: extra.title, items: extra.items.filter((option) => matches([option.label])) }] : []
  const options = (items: Ingredient[]) =>
    items
      .filter((item) => matches(Object.values(item.name)))
      .sort(compareIngredients)
      .map((item) => ({ id: item.id, label: localize(item.name) }))
  const sections = groups
    ? groupSections(groups, ingredients, (item) => item.group).map(({ group, items }) => ({ key: group.id, title: localize(group.name), items: options(items) }))
    : [{ key: 'all', title: '', items: options(ingredients) }]
  return [...head, ...sections].filter((section) => section.items.length > 0)
}

/** ro'yxat oynasining joyi (ekranga nisbatan): pastda joy yetmasa — tugmaning tepasiga ochiladi */
type Place = { left: number; width: number; top?: number; bottom?: number; listMax: number }

const MIN_WIDTH = 256
const LIST_MAX = 288
/** qidiruv maydoni (32) + oraliq (6) + ichki chekinish (12) */
const CHROME = 50
/** tugmadan va ekran chetidan masofa */
const GAP = 4
const EDGE = 8

function placeFor(button: HTMLElement): Place {
  const rect = button.getBoundingClientRect()
  const width = Math.max(rect.width, MIN_WIDTH)
  const left = Math.max(EDGE, Math.min(rect.left, window.innerWidth - width - EDGE))
  const below = window.innerHeight - rect.bottom - GAP - EDGE
  const above = rect.top - GAP - EDGE
  if (below < CHROME + LIST_MAX && above > below) {
    return { left, width, bottom: window.innerHeight - rect.top + GAP, listMax: Math.max(96, Math.min(LIST_MAX, above - CHROME)) }
  }
  return { left, width, top: rect.bottom + GAP, listMax: Math.max(96, Math.min(LIST_MAX, below - CHROME)) }
}

type Props = {
  value: ID
  onChange: (id: ID) => void
  /** tanlash mumkin bo'lganlar (faollar) */
  ingredients: Ingredient[]
  /** tanlangan mahsulot — ro'yxatda bo'lmasa ham (nofaol) nomi ko'rinadi */
  selected?: Ingredient
  /** ro'yxat boshida mahsulot bo'lmagan tanlovlar (masalan chiqimda: svet, gaz...) — `value` ulardan biri bo'lishi mumkin */
  extra?: ExtraSection
  /** tugma id si — `<label htmlFor>` bilan bog'lash uchun */
  id?: string
  className?: string
}

/**
 * Mahsulot tanlash: select ko'rinishidagi tugma → qidiruv maydoni va guruhlangan ro'yxat. Klaviatura: yozish — qidiruv,
 * ↑/↓ — yurish, Enter — tanlash, Esc — yopish. Yopiq tugmada harf bosilsa — o'sha harf bilan qidiruv ochiladi.
 * Ro'yxat `body` ga chiqariladi — oyna (Modal) ichida ham kesilmaydi; pastda joy yetmasa tepaga ochiladi. `extra` —
 * ro'yxat boshida mahsulot bo'lmagan tanlovlar (chiqim turlari), qidiruv ularga ham ishlaydi.
 */
export default function IngredientPicker({ value, onChange, ingredients, selected, extra, id, className = '' }: Props) {
  const t = useT()
  const localize = useLocalize()
  const listId = useId()
  const [place, setPlace] = useState<Place | null>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const open = place !== null
  const groups = useIngredientGroups().data

  const sections = open ? buildSections(ingredients, query, localize, groups, extra) : []
  const flat = sections.flatMap((section) => section.items)
  const indexOf = new Map(flat.map((item, index) => [item.id, index]))
  const current = extra?.items.find((option) => option.id === value)?.label ?? (selected ? localize(selected.name) : null)

  const openWith = (initial = '') => {
    if (!buttonRef.current) return
    // qidiruvsiz ochilsa — tanlangan mahsulot ustida turadi
    const index = initial
      ? 0
      : buildSections(ingredients, '', localize, groups, extra)
          .flatMap((section) => section.items)
          .findIndex((item) => item.id === value)
    setQuery(initial)
    setActive(Math.max(0, index))
    setPlace(placeFor(buttonRef.current))
  }
  const close = (refocus = false) => {
    setPlace(null)
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
      const target = event.target as Node
      if (!rootRef.current?.contains(target) && !popupRef.current?.contains(target)) setPlace(null)
    }
    // sahifa yoki oyna o'ralsa / o'lchami o'zgarsa — ro'yxat tugma ortidan yuradi (ro'yxatning o'z o'ralishi bundan mustasno)
    const onMove = (event: Event) => {
      if (event.target instanceof Node && popupRef.current?.contains(event.target)) return
      if (buttonRef.current) setPlace(placeFor(buttonRef.current))
    }
    document.addEventListener('mousedown', onPointer)
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
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
        id={id}
        type="button"
        onClick={() => (open ? close() : openWith())}
        onKeyDown={onButtonKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        // id bo'lsa — nomi `<label>` dan
        aria-label={id ? undefined : t.purchase.chooseIngredient}
        className={`${inputClass} flex cursor-pointer items-center gap-2 text-left focus-visible:border-neutral-900 focus-visible:outline-none dark:focus-visible:border-vsc-focus`}
      >
        <span className={`min-w-0 flex-1 truncate ${current ? '' : 'text-neutral-400'}`}>{current ?? t.purchase.chooseIngredient}</span>
        <ChevronDown size={14} className={`shrink-0 text-neutral-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {place &&
        createPortal(
          // Modal (z-50) ustida
          <div
            ref={popupRef}
            style={{ left: place.left, width: place.width, top: place.top, bottom: place.bottom }}
            className="fixed z-[60] rounded-card bg-surface p-1.5 text-neutral-900 shadow-float"
          >
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
            <div ref={listRef} id={listId} role="listbox" style={{ maxHeight: place.listMax }} className="mt-1.5 overflow-y-auto">
              {sections.length === 0 ? (
                <p className="px-2.5 py-3 text-center text-sm text-neutral-500">{t.stock.emptySearch}</p>
              ) : (
                sections.map((section) => (
                  <div key={section.key} role="group" aria-label={section.title}>
                    {section.title && <p className="px-2.5 pt-2 pb-1 text-[10px] font-bold tracking-[0.14em] text-neutral-400 uppercase">{section.title}</p>}
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
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          {isSelected && <Check size={14} className="shrink-0 text-select" />}
                        </div>
                      )
                    })}
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

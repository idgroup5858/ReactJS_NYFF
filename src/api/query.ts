import { useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react'

/**
 * Serverdan o'qilgan ma'lumotlar keshi (kalit → javob). Bir xil kalitli komponentlar bitta so'rovni bo'lishadi;
 * buyruqdan keyin `invalidate('orders:')` — shu kalitlar qaytadan yuklanadi (ochiq turganlari darhol, qolganlari
 * keyingi ochilishda). Qayta yuklanayotganda eski ma'lumot ko'rinib turadi (sahifa sakramaydi).
 */

export interface QueryState<T> {
  data: T | undefined
  error: unknown
  /** birinchi yuklash yoki qayta yuklash davom etyapti */
  loading: boolean
}

export interface QueryResult<T> extends QueryState<T> {
  reload: () => void
}

interface Entry {
  state: QueryState<unknown>
  fetcher: () => Promise<unknown>
  listeners: Set<() => void>
  loadedAt: number
  stale: boolean
  /** oxirgi yuborilgan so'rov raqami — eski javob yangisini bosib ketmasin */
  seq: number
  inflight: Promise<void> | null
}

/** Sahifaga qaytilganda shundan eski ma'lumot qaytadan yuklanadi. */
const FRESH_MS = 15_000

const entries = new Map<string, Entry>()
const IDLE: QueryState<never> = { data: undefined, error: null, loading: false }
const STARTING: QueryState<never> = { data: undefined, error: null, loading: true }

function ensure(key: string, fetcher: () => Promise<unknown>): Entry {
  let entry = entries.get(key)
  if (!entry) {
    entry = { state: STARTING, fetcher, listeners: new Set(), loadedAt: 0, stale: true, seq: 0, inflight: null }
    entries.set(key, entry)
  }
  return entry
}

function setState(entry: Entry, patch: Partial<QueryState<unknown>>): void {
  entry.state = { ...entry.state, ...patch }
  entry.listeners.forEach((listener) => listener())
}

/** Yuklaydi; [force] bo'lmasa davom etayotgan so'rovga qo'shiladi. */
function load(key: string, force = false): Promise<void> {
  const entry = entries.get(key)
  if (!entry) return Promise.resolve()
  if (entry.inflight && !force) return entry.inflight
  const seq = ++entry.seq
  entry.stale = false
  if (!entry.state.loading) setState(entry, { loading: true })
  const run = entry.fetcher().then(
    (data) => {
      if (entry.seq !== seq) return
      entry.loadedAt = Date.now()
      setState(entry, { data, error: null, loading: false })
    },
    (error: unknown) => {
      if (entry.seq === seq) setState(entry, { error, loading: false })
    },
  )
  entry.inflight = run.finally(() => {
    if (entry.seq === seq) entry.inflight = null
  })
  return entry.inflight
}

/**
 * [key] — so'rovni aniqlaydigan satr (`menu:br_chilonzor`); `null` — hali so'ralmaydi (masalan filial tanlanmagan).
 * [refetchMs] — ochiq turganda davriy yangilash (socket'siz ekranlar uchun).
 */
export function useQuery<T>(key: string | null, fetcher: () => Promise<T>, options: { refetchMs?: number } = {}): QueryResult<T> {
  // eng so'nggi fetcher (yangi closure) — effektlardan oldin yangilanadi
  const fetcherRef = useRef(fetcher)
  useLayoutEffect(() => {
    fetcherRef.current = fetcher
  })

  const subscribe = useCallback(
    (listener: () => void) => {
      if (!key) return () => {}
      const entry = ensure(key, () => fetcherRef.current())
      entry.listeners.add(listener)
      return () => {
        entry.listeners.delete(listener)
      }
    },
    [key],
  )
  const state = useSyncExternalStore(subscribe, () => (key ? (entries.get(key)?.state ?? STARTING) : IDLE)) as QueryState<T>

  useEffect(() => {
    if (!key) return
    const entry = ensure(key, () => fetcherRef.current())
    entry.fetcher = () => fetcherRef.current()
    if (entry.stale || Date.now() - entry.loadedAt > FRESH_MS) void load(key)
  }, [key])

  const { refetchMs } = options
  useEffect(() => {
    if (!key || !refetchMs) return
    const timer = window.setInterval(() => {
      if (!document.hidden) void load(key)
    }, refetchMs)
    return () => window.clearInterval(timer)
  }, [key, refetchMs])

  const reload = useCallback(() => {
    if (key) void load(key, true)
  }, [key])

  return { ...state, reload }
}

/**
 * Buyruqdan (yoki socket xabaridan) keyin: kaliti shu prefikslardan biri bilan boshlanadigan hamma so'rovlar eskirdi.
 * Ekranda turganlari darhol qaytadan yuklanadi, qolganlari — keyingi ochilishda. Prefikssiz — hammasi.
 */
export function invalidate(...prefixes: string[]): void {
  for (const [key, entry] of entries) {
    if (prefixes.length > 0 && !prefixes.some((prefix) => key.startsWith(prefix))) continue
    if (entry.listeners.size > 0) void load(key, true)
    else entry.stale = true
  }
}

/** Chiqishda: boshqa xodim oldingisining ma'lumotini ko'rmasin. */
export function clearQueries(): void {
  entries.clear()
}

// boshqa oynadan qaytilganda ekrandagi ma'lumot yangilansin (socket'siz sahifalar — admin, ombor)
if (typeof window !== 'undefined') {
  const refreshVisible = () => {
    if (document.hidden) return
    for (const [key, entry] of entries) {
      if (entry.listeners.size > 0 && Date.now() - entry.loadedAt > FRESH_MS) void load(key)
    }
  }
  window.addEventListener('focus', refreshVisible)
  document.addEventListener('visibilitychange', refreshVisible)
}

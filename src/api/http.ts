import type { ErrorCode } from '@/domain/errors'

/**
 * Backend (`C:\BACKEND APPS\NestJS_NYFF`) bilan HTTP. Ishlab chiqishda `/api` Vite orqali `localhost:3000` ga uzatiladi
 * (`vite.config.ts`); tayyor ilovani backend o'zi beradi — manzil nisbiy. Boshqa serverda bo'lsa — `VITE_API_URL`.
 */
export const SERVER_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const BASE = `${SERVER_URL}/api`

/** Backend xatosi: `{ statusCode, code, message, detail? }`. Server javob bermasa — `status: 0`, `code: 'network'`. */
export class ApiError extends Error {
  readonly status: number
  readonly code: ErrorCode | 'network' | 'unknown'
  readonly detail?: string

  constructor(status: number, code: ApiError['code'], message: string, detail?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.detail = detail
  }
}

type Query = Record<string, string | number | boolean | null | undefined>

/** Kim nomidan: xodim tokeni (standart — sessiyadan); `null` — tokensiz (kirish ekrani, TV, kiosk). */
export interface RequestAuth {
  token?: string | null
}

interface RequestOptions {
  query?: Query
  body?: unknown
  /** fayl yuborish (multipart) — `Content-Type` ni brauzer o'zi qo'yadi */
  form?: FormData
  auth?: RequestAuth
}

/** Sessiya moduli o'rnatadi (aylana import bo'lmasin): joriy token va 401 da nima qilish. */
let tokenProvider: () => string | null = () => null
let onUnauthorized: () => void = () => {}

export function configureHttp(options: { token: () => string | null; unauthorized: () => void }): void {
  tokenProvider = options.token
  onUnauthorized = options.unauthorized
}

function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return `${BASE}${path}${qs ? `?${qs}` : ''}`
}

export async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const auth = options.auth ?? {}
  const token = auth.token !== undefined ? auth.token : tokenProvider()
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body: options.form ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
    })
  } catch {
    throw new ApiError(0, 'network', 'network')
  }

  if (response.status === 204) return undefined as T
  const text = await response.text()
  const data: unknown = text ? JSON.parse(text) : undefined
  if (response.ok) return data as T

  const body = (data ?? {}) as { code?: ApiError['code']; message?: string | string[]; detail?: string }
  // xodim tokeni eskirgan / xodim bloklangan — sessiya tugaydi. Faqat `unauthorized` kodida: `wrong_pin` ham 401,
  // lekin u blok ekrani / PIN almashtirishdagi oddiy xato — kassir tizimdan chiqib ketmasin
  if (response.status === 401 && body.code === 'unauthorized' && token) onUnauthorized()
  const message = Array.isArray(body.message) ? body.message.join('; ') : (body.message ?? `HTTP ${response.status}`)
  throw new ApiError(response.status, body.code ?? 'unknown', message, body.detail)
}

export const http = {
  get: <T>(path: string, query?: Query, auth?: RequestAuth) => request<T>('GET', path, { query, auth }),
  post: <T>(path: string, body?: unknown, auth?: RequestAuth) => request<T>('POST', path, { body, auth }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path),
  upload: <T>(path: string, form: FormData) => request<T>('POST', path, { form }),
}

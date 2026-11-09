import { http } from '@/api/http'

/**
 * Milliy Ecom (NBU) sinovi — backend `src/nbu-test` (`/api/nbu-test/...`, faqat admin). Bankka so'rovni server yuboradi
 * (bank faqat server IP'sini qabul qiladi); kalitlar brauzerga kelmaydi — faqat "bor / yo'q" va qisqartirilgan ko'rinish.
 */

export type NbuOp =
  | 'publicKey'
  | 'tokenInit'
  | 'tokenRefresh'
  | 'paymentInit'
  | 'recurring'
  | 'bind'
  | 'unbind'
  | 'charge'
  | 'credits'
  | 'refund'
  | 'status'
  | 'account'
  | 'invoice'

export interface NbuCallResult {
  op: NbuOp
  at: string
  ok: boolean
  ms: number
  /** so'rov bankka yetib bormagan (sozlama yo'q, tarmoq xatosi, vaqt tugadi) */
  error?: string
  request?: { method: string; url: string; headers: Record<string, string>; body?: unknown }
  response?: { httpStatus: number; body: unknown }
}

export interface NbuState {
  config: {
    baseUrl: string
    apiKey: string | null
    secretKey: boolean
    username: string | null
    password: boolean
    signatureEncoding: 'hex' | 'base64'
    oaepHash: 'sha1' | 'sha256'
    bankPublicKey: boolean
    /** test sahifasidan vaqtincha almashtirilgan maydonlar */
    overridden: string[]
  }
  session: {
    pubKey: boolean
    identityToken: boolean
    accessToken: string | null
    accessTokenAt: string | null
    refreshToken: boolean
    lastOrderId: string | null
    lastTransactionId: string | null
    paymentUrl: string | null
    cardToken: string | null
  }
  history: NbuCallResult[]
}

export type NbuConfigPatch = Partial<Record<'baseUrl' | 'apiKey' | 'secretKey' | 'username' | 'password' | 'signatureEncoding' | 'oaepHash' | 'bankPublicKey', string>> & {
  clear?: boolean
}

export type NbuSessionPatch = Partial<Record<'cardToken' | 'lastOrderId' | 'lastTransactionId', string>>

export const nbuApi = {
  state: () => http.get<NbuState>('/nbu-test/state'),
  call: (op: NbuOp, body?: Record<string, unknown>) => http.post<NbuCallResult>('/nbu-test/call', { op, body }),
  config: (patch: NbuConfigPatch) => http.put<NbuState>('/nbu-test/config', patch),
  session: (patch: NbuSessionPatch) => http.put<NbuState>('/nbu-test/session', patch),
  reset: () => http.post<NbuState>('/nbu-test/reset'),
  ip: () => http.get<{ ip: string | null; error?: string }>('/nbu-test/ip'),
}

import type { NbuOp } from './nbuApi'

/** To'lovdan keyin bank mijozni qaytaradigan manzil — shu sahifaning o'zi (natija banneri bilan). */
export type BackUrl = (result: 'success' | 'failure') => string

export interface NbuEndpoint {
  key: string
  op: NbuOp
  title: string
  method: 'GET' | 'POST'
  path: string
  hint: string
  /** tahrirlanadigan JSON namunasi; yo'q bo'lsa — tanani server o'zi tuzadi */
  template?: (back: BackUrl) => Record<string, unknown>
  /** yuborishdan oldin so'raladi (pul harakati, SMS) */
  confirm?: string
}

const redirect = (back: BackUrl) => ({
  paymentType: 'REDIRECT',
  sessionTimeout: 3600,
  successUrl: back('success'),
  failureUrl: back('failure'),
})

const MONEY = "Bu so'rov pul harakatiga olib keladi (kalitlar prod bo'lsa — haqiqiy pul). Yuborilsinmi?"

/** Postman collection (NBU_Milliy_Ecom) dagi hamma endpoint — o'sha tartibda. */
export const NBU_GROUPS: { title: string; items: NbuEndpoint[] }[] = [
  {
    title: 'Autentifikatsiya',
    items: [
      {
        key: 'publicKey',
        op: 'publicKey',
        title: '1. Ochiq kalitni olish',
        method: 'GET',
        path: '/auth/token/public-key',
        hint: "pubKey va identityToken olinadi va serverda saqlanadi (keyingi qadam uchun).",
      },
      {
        key: 'tokenInit',
        op: 'tokenInit',
        title: '2. Token olish',
        method: 'POST',
        path: '/auth/token/init',
        hint: "Login va parol (.env dagi) pubKey bilan RSA PKCS#1 v1.5 da serverda shifrlanadi. accessToken — 2 soat, refreshToken — 1 yil.",
      },
      {
        key: 'tokenRefresh',
        op: 'tokenRefresh',
        title: 'Tokenni yangilash',
        method: 'POST',
        path: '/auth/token/refresh',
        hint: 'Saqlangan accessToken va refreshToken bilan yangisi olinadi.',
      },
    ],
  },
  {
    title: "To'lovlar",
    items: [
      {
        key: 'paymentInit',
        op: 'paymentInit',
        title: "Bir bosqichli to'lov",
        method: 'POST',
        path: '/payment/init',
        hint: "amount — tiyinda (100000 = 1 000 so'm), currency: 860 (UZS) / 840 (USD). Javobdagi paymentUrl ni oching. Callback: ONE_TIME_PAYMENT.",
        template: (back) => ({ amount: 100000, currency: 860, orderId: '{{orderId}}', ...redirect(back) }),
      },
      {
        key: 'recurring',
        op: 'recurring',
        title: "Rekurrent to'lov (obuna)",
        method: 'POST',
        path: '/payment/recurring',
        hint: "period — Cron (5 maydon), kamida 1 kun. Birinchi to'lovni mijoz qo'lda qiladi. Callback: RECURRING_PAYMENT, keyin SUBSCRIPTION.",
        template: (back) => ({ amount: 100000, currency: 860, orderId: '{{orderId}}', clientId: 'USER_11', period: '0 0 1 * *', ...redirect(back) }),
        confirm: "Obuna yaratiladi — birinchi to'lovdan keyin bank har davrda avtomatik yechadi. Yuborilsinmi?",
      },
      {
        key: 'bind',
        op: 'bind',
        title: "Kartani bog'lash",
        method: 'POST',
        path: '/payment/bind',
        hint: "Pul yechilmaydi. cardToken bank callback'ida (purpose=CARD_BINDING) keladi — uni o'ngdagi \"Sessiya\"ga kiriting.",
        template: (back) => ({ currency: 860, orderId: '{{orderId}}', clientId: 'USER_11', ...redirect(back) }),
      },
      {
        key: 'unbind',
        op: 'unbind',
        title: 'Kartani uzish',
        method: 'POST',
        path: '/payment/unbind',
        hint: "Oldin bog'langan kartani o'chiradi.",
        template: () => ({ clientId: 'USER_11', cardToken: '{{cardToken}}' }),
      },
      {
        key: 'charge',
        op: 'charge',
        title: "Bog'langan kartadan yechish",
        method: 'POST',
        path: '/payment/charge',
        hint: 'Natija darhol: SUCCESS yoki FAILED.',
        template: () => ({ orderId: '{{orderId}}', cardToken: '{{cardToken}}', amount: 100000, currency: 860 }),
        confirm: MONEY,
      },
      {
        key: 'creditsCard',
        op: 'credits',
        title: "Kartani to'ldirish — shifrlangan karta",
        method: 'POST',
        path: '/payment/credits',
        hint: "Faqat HUMO/UZCARD va UZS. \"card\" ({pan, expiry: MMYY}) serverda bank bergan kalit bilan RSA-OAEP shifrlanib encryptedData bo'lib ketadi (NBU_BANK_PUBLIC_KEY kerak).",
        template: () => ({ orderId: '{{orderId}}', amount: 1000000, currency: 860, card: { pan: '9860990000000010', expiry: '1230' } }),
        confirm: MONEY,
      },
      {
        key: 'creditsToken',
        op: 'credits',
        title: "Kartani to'ldirish — token bilan",
        method: 'POST',
        path: '/payment/credits',
        hint: "Bog'langan karta tokeni bilan. encryptedData va token birga yuborilmaydi.",
        template: () => ({ orderId: '{{orderId}}', amount: 1000000, currency: 860, token: '{{cardToken}}' }),
        confirm: MONEY,
      },
      {
        key: 'refund',
        op: 'refund',
        title: "To'lovni qaytarish (refund)",
        method: 'POST',
        path: '/payment/refund',
        hint: "type: DEBIT (yechilgan to'lov) yoki CREDIT (to'ldirish). Faqat SUCCESS tranzaksiyalar.",
        template: () => ({ transactionId: '{{lastTransactionId}}', type: 'DEBIT' }),
        confirm: MONEY,
      },
      {
        key: 'status',
        op: 'status',
        title: 'Tranzaksiya holati',
        method: 'POST',
        path: '/payment/status',
        hint: "Oxirgi yaratilgan orderId bo'yicha (yoki o'zingiz kiriting).",
        template: () => ({ orderId: '{{lastOrderId}}' }),
      },
      {
        key: 'account',
        op: 'account',
        title: "Hisobdan hisobga o'tkazma (B2B)",
        method: 'POST',
        path: '/payment/account',
        hint: 'Test hisoblar: …011 (SUCCESS), …029 (3004), …037 (3006), …045 (ERROR).',
        template: () => ({
          orderId: '{{orderId}}',
          amount: 1000000,
          currency: 860,
          recipientAccount: '20208000000000000011',
          recipientCodeFilial: '00450',
          recipientTax: '123456789',
          recipientName: 'OOO "EXAMPLE"',
        }),
        confirm: MONEY,
      },
      {
        key: 'invoice',
        op: 'invoice',
        title: 'Hisob-faktura (invoice)',
        method: 'POST',
        path: '/payment/invoice',
        hint: "To'lov havolasi SMS bilan yuboriladi — recipient ga o'z raqamingizni yozing (998XXXXXXXXX). language: uz | ru | en.",
        template: () => ({
          orderId: '{{orderId}}',
          clientId: 'USER_11',
          amount: 1000000,
          currency: 860,
          clientData: { foo: 'bar' },
          delivery: { channel: 'SMS', recipient: '' },
          language: 'uz',
          sessionTimeout: 3600,
        }),
        confirm: "Ko'rsatilgan raqamga SMS yuboriladi. Yuborilsinmi?",
      },
    ],
  },
]

export const NBU_ENDPOINTS = NBU_GROUPS.flatMap((group) => group.items)

/** Jurnal uchun: op → sarlavha (credits ikki xil — umumiy nom). */
export function opTitle(op: NbuOp): string {
  if (op === 'credits') return "Kartani to'ldirish"
  return NBU_ENDPOINTS.find((item) => item.op === op)?.title ?? op
}

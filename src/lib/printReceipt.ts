import type { Menu, Order, OrderItem } from '@/domain/types'
import { currentDict } from '@/i18n'
import { showToast } from '@/lib/swal'
import { settingsStore } from '@/store/settingsStore'
import { formatDateTime, formatMoney, formatOrderNumber } from './format'

const escape = (text: string) => text.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char)

/**
 * Chekka kerak maydonlar: kassa buyurtmasi (`Order`) yoki kiosk javobi — `CustomerOrder` da manba yo'q, kiosk
 * `{ ...order, source: 'kiosk' }` beradi. `online` — faqat mobil buyurtmada (aks holda `null`).
 */
export type ReceiptOrder = Pick<Order, 'number' | 'type' | 'source' | 'items' | 'note' | 'total' | 'payment' | 'online' | 'createdAt'>

/** Mijoz cheki (kassa printeri) yoki oshxona cheki (ichimliklarsiz, oshxona printeri). */
type PrintTarget = 'receipt' | 'kitchen'
type PrintJob = { to: PrintTarget; html: string }
type PrintResults = Partial<Record<PrintTarget, 'ok' | 'not_set' | 'error'>>

/** "NYFF Offline" chop etish xizmati (`ElectronJS_NYFF/printer.js`) — kassa kompyuterining o'zida. */
const PRINT_SERVICE = 'http://127.0.0.1:3101/print'
/** Online kassada Chrome birinchi marta ruxsat so'raydi — kassir javob berguncha kutiladi, keyin brauzer orqali. */
const PRINT_TIMEOUT_MS = 15_000

/**
 * 80 mm termochek: oshxona shu qog'ozdan tayyorlaydi — raqam, zal / olib ketish va izohlar katta. Raqam — eng katta va
 * qalin: Courier New'ning qalini termoprinterda ingichka chiqadi, shuning uchun Arial Black + kontur. Oshxona cheki —
 * xuddi shu, tepasida "OSHXONA" va faqat oshxonaga tegishli qatorlar ("Jami" — butun buyurtmaniki).
 */
function receiptHtml(order: ReceiptOrder, branchName: string, lines: OrderItem[], kitchen: boolean): string {
  const t = currentDict()
  const lang = settingsStore.get().lang
  const items = lines
    .map(
      (item) => `<tr><td class="qty">${item.qty}×</td><td>${escape(item.name[lang] || item.name.uz)}</td><td class="sum">${formatMoney(item.price * item.qty, t)}</td></tr>`,
    )
    .join('')
  const payment = order.payment ? t.payment[order.payment] : t.orderStatus.pending
  return `<!doctype html><html><head><meta charset="utf-8"><title>${formatOrderNumber(order.number)}</title><style>
@page { size: 80mm auto; margin: 0 }
* { box-sizing: border-box }
body { width: 80mm; margin: 0; padding: 4mm; font: 12px/1.35 'Courier New', monospace; color: #000 }
.center { text-align: center }
.brand { font-weight: 700; font-size: 14px; letter-spacing: .08em }
.kitchen { display: inline-block; background: #000; color: #fff; padding: 1mm 4mm; margin-bottom: 2mm; font: 900 16px/1.2 Arial, sans-serif; letter-spacing: .2em }
.number { font: 900 72px/1 'Arial Black', Arial, sans-serif; -webkit-text-stroke: 1.5px #000; margin: 3mm 0 2mm }
.type { display: inline-block; border: 2px solid #000; padding: 1mm 3mm; font-size: 16px; font-weight: 900; text-transform: uppercase }
hr { border: 0; border-top: 1px dashed #000; margin: 3mm 0 }
table { width: 100%; border-collapse: collapse }
td { vertical-align: top; padding: .8mm 0 }
.qty { width: 9mm; font-weight: 700; font-size: 14px }
.sum { text-align: right; white-space: nowrap; padding-left: 2mm }
.order-note { font-weight: 700 }
.total { display: flex; justify-content: space-between; font-size: 15px; font-weight: 900 }
.muted { font-size: 11px }
.credit { margin-top: 4mm; text-align: center; font-size: 8px }
</style></head><body>
<div class="center">${kitchen ? `<div class="kitchen">${escape(t.orders.kitchenLabel)}</div>` : ''}<div class="brand">${escape(t.appName.toUpperCase())}</div><div class="muted">${escape(branchName)}</div>
<div class="number">${formatOrderNumber(order.number)}</div>
<div class="type">${escape(t.orderType[order.type])}</div>${order.source !== 'cashier' ? `<div class="muted">${escape(order.source === 'kiosk' ? t.orders.kiosk : t.orders.online)}</div>` : ''}
<div class="muted">${formatDateTime(order.createdAt)}</div></div>
<hr><table>${items}</table>
${order.online ? `<hr><div>${escape([order.online.name, order.online.phone].filter(Boolean).join(' · '))}</div>${order.online.address ? `<div class="order-note">${escape(order.online.address)}</div>` : ''}` : ''}
${order.note ? `<hr><div class="order-note">${escape(t.kassa.itemNote)}: ${escape(order.note)}</div>` : ''}
<hr><div class="total"><span>${escape(t.kassa.total)}</span><span>${formatMoney(order.total, t)}</span></div>
<div class="muted">${escape(payment)}</div>
<div class="credit">by ID GROUP team</div>
</body></html>`
}

/**
 * Oshxonaga tegishli qatorlar: kategoriyasi "Oshxona chekiga chiqadi" o'chiq bo'lganlari (ichimliklar) tushadi. Taom
 * menyuda topilmasa (o'chirilgan) yoki eski offline nusxada belgi yo'q bo'lsa — chiqadi (oshxona bilmay qolmasin).
 */
function kitchenLines(items: OrderItem[], menu: Menu | null | undefined): OrderItem[] {
  if (!menu) return items
  const skip = new Set(menu.categories.filter((category) => category.kitchen === false).map((category) => category.id))
  const categoryOf = new Map(menu.products.map((product) => [product.id, product.categoryId]))
  return items.filter((item) => {
    const category = categoryOf.get(item.productId)
    return !category || !skip.has(category)
  })
}

/** Yashirin oynada brauzer orqali — standart printerga (Chrome `--kiosk-printing` bilan so'ramasdan). */
function browserPrint(html: string): void {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  frame.srcdoc = html
  frame.onload = () => {
    frame.contentWindow?.focus()
    frame.contentWindow?.print()
    // print() oyna yopilguncha kutadi; keyin iframe kerak emas
    window.setTimeout(() => frame.remove(), 1000)
  }
  document.body.appendChild(frame)
}

/**
 * Bu kompyuterda "NYFF Offline" bor: kassa sozlamasida offline kassa yoqilgan yoki sahifaning o'zi shu kompyuterdan
 * ochilgan (offline kassa — `localhost:3100/offline`). Aks holda (admin, kiosk) xizmatga so'rov ketmaydi — Chrome
 * ruxsat so'ramasin.
 */
function hasPrintService(): boolean {
  return settingsStore.get().offlineEnabled || ['localhost', '127.0.0.1'].includes(window.location.hostname)
}

/** Xizmatga yuboradi; `null` — xizmat javob bermadi (dastur ishlamayapti, ruxsat berilmadi). */
async function sendToService(jobs: PrintJob[]): Promise<PrintResults | null> {
  try {
    // matn ko'rinishida — oddiy so'rov (CORS preflight'siz); xizmat Origin'ni o'zi tekshiradi
    const response = await fetch(PRINT_SERVICE, { method: 'POST', body: JSON.stringify({ jobs }), signal: AbortSignal.timeout(PRINT_TIMEOUT_MS) })
    if (!response.ok) return null
    const body = (await response.json()) as { results?: PrintResults }
    return body.results ?? null
  } catch {
    return null
  }
}

/**
 * Chop etish: avval "NYFF Offline" orqali (ikkala chek parallel, oynasiz). Mijoz cheki chiqmasa — brauzer orqali
 * (standart printer). Oshxona cheki chiqmasa — kassirga xabar; printer tanlanmagan bo'lsa — faqat qo'lda bosilganda
 * (oshxona printeri yo'q kassada har buyurtmada xabar chiqmasin).
 */
async function print(order: ReceiptOrder, branchName: string, targets: PrintTarget[], menu: Menu | null | undefined, manual: boolean): Promise<void> {
  const t = currentDict()
  const jobs: PrintJob[] = []
  if (targets.includes('receipt')) jobs.push({ to: 'receipt', html: receiptHtml(order, branchName, order.items, false) })
  if (targets.includes('kitchen')) {
    const lines = kitchenLines(order.items, menu)
    if (lines.length > 0) jobs.push({ to: 'kitchen', html: receiptHtml(order, branchName, lines, true) })
    else if (manual) showToast(t.orders.kitchenEmpty, 'info')
  }
  if (jobs.length === 0) return

  const receipt = jobs.find((job) => job.to === 'receipt')
  const kitchen = jobs.some((job) => job.to === 'kitchen')
  if (!hasPrintService()) {
    if (receipt) browserPrint(receipt.html)
    if (kitchen && manual) showToast(t.orders.printNoService, 'error')
    return
  }

  const results = await sendToService(jobs)
  if (receipt && results?.receipt !== 'ok') browserPrint(receipt.html)
  if (!kitchen || results?.kitchen === 'ok') return
  if (!results) showToast(t.orders.printNoService, 'error')
  else if (results.kitchen === 'error') showToast(t.orders.kitchenFailed, 'error')
  else if (manual) showToast(t.orders.kitchenNotSet, 'error')
}

/** Buyurtma ochildi (to'lov, kiosk / mobil buyurtmani qabul qilish): mijoz cheki + oshxona cheki. */
export function printOrder(order: ReceiptOrder, branchName: string, menu: Menu | null | undefined): void {
  void print(order, branchName, ['receipt', 'kitchen'], menu, false)
}

/** Faqat mijoz cheki (qayta chiqarish, kiosk, admin). */
export function printReceipt(order: ReceiptOrder, branchName: string): void {
  void print(order, branchName, ['receipt'], null, true)
}

/** Faqat oshxona cheki — qayta chiqarish (qog'oz tiqildi, chek yo'qoldi). */
export function printKitchen(order: ReceiptOrder, branchName: string, menu: Menu | null | undefined): void {
  void print(order, branchName, ['kitchen'], menu, true)
}

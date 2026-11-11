import receiptLogo from '@/assets/receipt-logo.png?inline'
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

/**
 * Mijoz cheki (kassa printeri), oshxona cheki (ichimliklarsiz, oshxona printeri) yoki truck cheki (faqat truck
 * taomlari, truck printeri). Oshxona va truck cheki — bir xil ko'rinishda, har biri o'z qatorlari bilan.
 */
type Station = 'kitchen' | 'truck'
type PrintTarget = 'receipt' | Station
type PrintJob = { to: PrintTarget; html: string }
type PrintResults = Partial<Record<PrintTarget, 'ok' | 'not_set' | 'error'>>

const STATIONS: Station[] = ['kitchen', 'truck']

/** "NYFF Offline" chop etish xizmati (`ElectronJS_NYFF/printer.js`) — kassa kompyuterining o'zida. */
const PRINT_SERVICE = 'http://127.0.0.1:3101/print'
const PRINT_STATUS = 'http://127.0.0.1:3101/status'
/** Online kassada Chrome birinchi marta ruxsat so'raydi — kassir javob berguncha kutiladi, keyin brauzer orqali. */
const PRINT_TIMEOUT_MS = 15_000

/**
 * 80 mm termochek: oshxona shu qog'ozdan tayyorlaydi — raqam, zal / olib ketish va izohlar katta. Raqam — eng katta va
 * qalin: Courier New'ning qalini termoprinterda ingichka chiqadi, shuning uchun Arial Black + kontur. Mijoz cheki —
 * tepasida logo (chek ichida, data URI: Electron chekni `data:` sahifa qilib ochadi, tashqi fayl yuklanmaydi, offline'da
 * ham chiqadi). Zal / olib ketish — ikkalasida qora fonda. Oshxona cheki — logosiz, faqat oshxonaga tegishli qatorlar,
 * qator narxlarisiz; pastida buyurtmaning umumiy summasi ("Jami", ichimliklar bilan; to'lov turi yo'q) va izoh — yirik,
 * ramkada (2026-11-09); taom nomlari — yirik qalin Arial (oshpaz uzoqdan o'qisin). Mijoz chekida ham taom
 * qatorlari qalin Arial (kichikroq — summa ustuni sig'sin). Bo'shliqlar ixcham — qog'oz
 * tejaladi; "Manzil" chapda, filial manzili o'ngda (filial nomi chiqmaydi), keyingi qatorda — sana (2026-11-10).
 * `kitchen` — oshxona ko'rinishi: oshxona cheki ham, truck cheki ham shu ko'rinishda (2026-11-12).
 */
function receiptHtml(order: ReceiptOrder, branchAddress: string, lines: OrderItem[], kitchen: boolean): string {
  const t = currentDict()
  const lang = settingsStore.get().lang
  // jadval emas, grid: jadvalda uzuq chiziq har katakda alohida chiziladi va ustunlar chegarasida naqshi uziladi
  const items = lines
    .map((item) => {
      const cells = `<div>${escape(item.name[lang] || item.name.uz)}</div><div class="qty">${item.qty}×</div>`
      return kitchen ? cells : `${cells}<div class="sum">${formatMoney(item.price * item.qty, t)}</div>`
    })
    .join('<div class="sep"></div>')
  const payment = order.payment ? t.payment[order.payment] : t.orderStatus.pending
  return `<!doctype html><html><head><meta charset="utf-8"><title>${formatOrderNumber(order.number)}</title><style>
@page { size: 80mm auto; margin: 0 }
* { box-sizing: border-box }
/* 80 mm qog'ozda printer faqat ~72 mm ga chop etadi (203 dpi × 576 nuqta), chap chekka bo'shlig'ini printerning o'zi qo'yadi */
body { width: 72mm; margin: 0; padding: 2mm 1mm; font: 12px/1.25 'Courier New', monospace; color: #000 }
.center { text-align: center }
.number { font: 900 72px/.95 'Arial Black', Arial, sans-serif; -webkit-text-stroke: 1.5px #000; margin: 1mm 0 }
/* brauzer orqali chop etilganda ham qora fon chiqsin (aks holda oq yozuv oq qog'ozda yo'qoladi) */
.type { display: inline-block; background: #000; color: #fff; padding: .5mm 4mm; font: 900 16px/1.2 Arial, sans-serif; letter-spacing: .2em; text-transform: uppercase; vertical-align: middle; -webkit-print-color-adjust: exact; print-color-adjust: exact }
.source { margin-left: 2mm; vertical-align: middle }
.meta { display: flex; justify-content: space-between; gap: 2mm; margin-top: 1.5mm; text-align: left }
.meta + .meta { margin-top: .5mm }
.meta span:first-child { white-space: nowrap }
/* uzun manzil o'ng tomonda bir necha qatorga bo'linadi */
.meta span:last-child { text-align: right; overflow-wrap: anywhere }
hr { border: 0; border-top: 1px dashed #000; margin: 1.5mm 0 }
.items { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; column-gap: 3mm }
/* taom qatorlari — qalin Arial (Courier New qalini termoprinterda ingichka, xira chiqadi) */
.items > div { padding: .7mm 0; overflow-wrap: anywhere; font: 700 14px/1.25 Arial, sans-serif }
.items > .sep { grid-column: 1 / -1; padding: 0; border-top: 1px dashed #000 }
.qty, .sum { white-space: nowrap; text-align: right }
.qty { font-weight: 700; font-size: 14px }
.kitchen-items { grid-template-columns: minmax(0, 1fr) auto }
.kitchen-items > div { font: 700 18px/1.2 Arial, sans-serif; padding: 1mm 0 }
.kitchen-items .qty { font-weight: 900 }
.order-note { font-weight: 700 }
/* oshxonada izoh ko'zdan qochmasin — taom nomlaridek yirik, ramkada */
.kitchen-note { margin-top: 1.5mm; padding: 1mm 1.5mm; border: 2px solid #000; overflow-wrap: anywhere; font: 700 16px/1.25 Arial, sans-serif }
.total { display: flex; justify-content: space-between; font-size: 15px; font-weight: 900 }
.muted { font-size: 11px }
.logo { display: block; width: 35.9mm; margin: 0 auto }
.credit { margin-top: 2mm; text-align: center; font-size: 8px }
</style></head><body>
<div class="center">${kitchen ? '' : `<img class="logo" src="${receiptLogo}" alt="">`}
<div class="number">${formatOrderNumber(order.number)}</div>
<div class="type">${escape(t.orderType[order.type])}</div>${order.source !== 'cashier' ? `<span class="muted source">${escape(order.source === 'kiosk' ? t.orders.kiosk : t.orders.online)}</span>` : ''}
${branchAddress ? `<div class="meta muted"><span>${escape(t.orders.receiptAddress)}</span><span>${escape(branchAddress)}</span></div>` : ''}
<div class="meta muted"><span>${escape(t.common.date)}</span><span>${formatDateTime(order.createdAt)}</span></div></div>
<hr><div class="items${kitchen ? ' kitchen-items' : ''}">${items}</div>
${order.online ? `<hr><div>${escape([order.online.name, order.online.phone].filter(Boolean).join(' · '))}</div>${order.online.address ? `<div class="order-note">${escape(order.online.address)}</div>` : ''}` : ''}
${order.note ? (kitchen ? `<div class="kitchen-note">${escape(t.kassa.itemNote)}: ${escape(order.note)}</div>` : `<hr><div class="order-note">${escape(t.kassa.itemNote)}: ${escape(order.note)}</div>`) : ''}
<hr><div class="total"><span>${escape(t.kassa.total)}</span><span>${formatMoney(order.total, t)}</span></div>
${kitchen ? '' : `<div class="muted">${escape(payment)}</div>`}
<div class="credit">by ID GROUP team</div>
</body></html>`
}

/**
 * Oshxona / truck chekiga tegishli qatorlar (ikki belgi mustaqil — ikkalasi yoqiq taom ikkala chekda).
 * Oshxona: "Oshxona chekiga chiqadi" o'chiq taomlar (tayyor ichimlik: kola, suv) tushadi; taom menyuda topilmasa
 * (o'chirilgan) yoki eski offline nusxada belgi yo'q bo'lsa — chiqadi (oshxona bilmay qolmasin).
 * Truck: faqat "Truck chekiga chiqadi" yoqiq taomlar; menyu yo'q, taom topilmasa yoki belgi yo'q — chiqmaydi.
 */
function stationLines(station: Station, items: OrderItem[], menu: Menu | null | undefined): OrderItem[] {
  if (station === 'kitchen') {
    if (!menu) return items
    const skip = new Set(menu.products.filter((product) => product.kitchen === false).map((product) => product.id))
    return items.filter((item) => !skip.has(item.productId))
  }
  if (!menu) return []
  const take = new Set(menu.products.filter((product) => product.truck === true).map((product) => product.id))
  return items.filter((item) => take.has(item.productId))
}

/** Buyurtmada truck taomi bormi — "Truck cheki" qayta chiqarish tugmasi faqat shunda ko'rinadi. */
export const hasTruckItems = (items: OrderItem[], menu: Menu | null | undefined): boolean => stationLines('truck', items, menu).length > 0

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

// kassa sahifasi ochiq — `attachPrintService`
let kassaPage = false

/**
 * Kassa sahifasi ochilganda chaqiriladi (`useEffect`): kassa kompyuterida "NYFF Offline" turadi — cheklar unga
 * yuboriladi. Offline rejim sozlamasiga bog'liq emas. Xizmat darhol bir marta tekshiriladi: Chrome ruxsatni (https
 * sayt → shu kompyuterdagi dastur) birinchi buyurtmada emas, kassa ochilganda so'rasin. Qaytaradi — tozalash.
 */
export function attachPrintService(): () => void {
  kassaPage = true
  fetch(PRINT_STATUS, { signal: AbortSignal.timeout(PRINT_TIMEOUT_MS) }).catch(() => {})
  return () => {
    kassaPage = false
  }
}

/**
 * Bu kompyuterda "NYFF Offline" bor: kassa sahifasi yoki sahifaning o'zi shu kompyuterdan ochilgan (offline kassa —
 * `localhost:3100/offline`). Aks holda (admin, kiosk) xizmatga so'rov ketmaydi — Chrome ruxsat so'ramasin.
 */
function hasPrintService(): boolean {
  return kassaPage || ['localhost', '127.0.0.1'].includes(window.location.hostname)
}

const post = (jobs: PrintJob[]): Promise<Response> =>
  // matn ko'rinishida — oddiy so'rov (CORS preflight'siz); xizmat Origin'ni o'zi tekshiradi
  fetch(PRINT_SERVICE, { method: 'POST', body: JSON.stringify({ jobs }), signal: AbortSignal.timeout(PRINT_TIMEOUT_MS) })

/** Xizmatga yuboradi; `null` — xizmat javob bermadi (dastur ishlamayapti, ruxsat berilmadi). */
async function sendToService(jobs: PrintJob[]): Promise<PrintResults | null> {
  try {
    let response = await post(jobs)
    // eski "NYFF Offline" (0.3.x) truck chekini bilmaydi va butun so'rovni rad etadi (400) — oshxona cheki yo'qolmasin:
    // truck'siz qayta yuboriladi, truck — "tanlanmagan"
    const legacy = response.status === 400 && jobs.some((job) => job.to === 'truck')
    if (legacy) {
      const rest = jobs.filter((job) => job.to !== 'truck')
      if (rest.length === 0) return { truck: 'not_set' }
      response = await post(rest)
    }
    if (!response.ok) return null
    const body = (await response.json()) as { results?: PrintResults }
    if (!body.results) return null
    return legacy ? { ...body.results, truck: 'not_set' } : body.results
  } catch {
    return null
  }
}

/**
 * Chop etish: avval "NYFF Offline" orqali (hamma chek parallel, oynasiz). Mijoz cheki chiqmasa — brauzer orqali
 * (standart printer). Oshxona / truck cheki chiqmasa — kassirga bitta xabar (ikkalasi birga — toast bittadan
 * ko'rinadi); printer tanlanmagan bo'lsa — faqat qo'lda bosilganda (oshxona / truck printeri yo'q kassada har
 * buyurtmada xabar chiqmasin).
 */
async function print(order: ReceiptOrder, branchAddress: string, targets: PrintTarget[], menu: Menu | null | undefined, manual: boolean): Promise<void> {
  const t = currentDict()
  const ticketName: Record<Station, string> = { kitchen: t.orders.printKitchen, truck: t.orders.printTruck }
  const names = (list: Station[]) => list.map((station) => ticketName[station]).join(', ')
  const jobs: PrintJob[] = []
  if (targets.includes('receipt')) jobs.push({ to: 'receipt', html: receiptHtml(order, branchAddress, order.items, false) })
  for (const station of STATIONS) {
    if (!targets.includes(station)) continue
    const lines = stationLines(station, order.items, menu)
    if (lines.length > 0) jobs.push({ to: station, html: receiptHtml(order, branchAddress, lines, true) })
    else if (manual) showToast(station === 'kitchen' ? t.orders.kitchenEmpty : t.orders.truckEmpty, 'info')
  }
  if (jobs.length === 0) return

  const receipt = jobs.find((job) => job.to === 'receipt')
  const stations = jobs.flatMap((job) => (job.to === 'receipt' ? [] : [job.to]))
  if (!hasPrintService()) {
    if (receipt) browserPrint(receipt.html)
    if (stations.length > 0 && manual) showToast(t.orders.printNoService(names(stations)), 'error')
    return
  }

  const results = await sendToService(jobs)
  if (receipt && results?.receipt !== 'ok') browserPrint(receipt.html)
  if (stations.length === 0) return
  if (!results) {
    showToast(t.orders.printNoService(names(stations)), 'error')
    return
  }
  const failed = stations.filter((station) => results[station] === 'error')
  const notSet = stations.filter((station) => results[station] === 'not_set')
  if (failed.length > 0) showToast(t.orders.printFailed(names(failed)), 'error')
  else if (manual && notSet.length > 0) showToast(t.orders.printNotSet(names(notSet)), 'error')
}

/** Buyurtma ochildi (to'lov, kiosk / mobil buyurtmani qabul qilish): mijoz cheki + oshxona cheki + truck cheki. */
export function printOrder(order: ReceiptOrder, branchAddress: string, menu: Menu | null | undefined): void {
  void print(order, branchAddress, ['receipt', 'kitchen', 'truck'], menu, false)
}

/** Faqat mijoz cheki (qayta chiqarish, kiosk, admin). */
export function printReceipt(order: ReceiptOrder, branchAddress: string): void {
  void print(order, branchAddress, ['receipt'], null, true)
}

/** Faqat oshxona cheki — qayta chiqarish (qog'oz tiqildi, chek yo'qoldi). */
export function printKitchen(order: ReceiptOrder, branchAddress: string, menu: Menu | null | undefined): void {
  void print(order, branchAddress, ['kitchen'], menu, true)
}

/** Faqat truck cheki — qayta chiqarish. */
export function printTruck(order: ReceiptOrder, branchAddress: string, menu: Menu | null | undefined): void {
  void print(order, branchAddress, ['truck'], menu, true)
}

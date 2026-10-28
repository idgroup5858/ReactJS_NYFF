import type { Order } from '@/domain/types'
import { currentDict } from '@/i18n'
import { settingsStore } from '@/store/settingsStore'
import { formatDateTime, formatMoney, formatOrderNumber } from './format'

const escape = (text: string) => text.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char)

/**
 * Chekka kerak maydonlar: kassa buyurtmasi (`Order`) yoki kiosk javobi — `CustomerOrder` da manba yo'q, kiosk
 * `{ ...order, source: 'kiosk' }` beradi. `online` — faqat mobil buyurtmada (aks holda `null`).
 */
export type ReceiptOrder = Pick<Order, 'number' | 'type' | 'source' | 'items' | 'note' | 'total' | 'payment' | 'online' | 'createdAt'>

/** 80 mm termochek: oshxona shu qog'ozdan tayyorlaydi — raqam, zal / olib ketish va izohlar katta. */
function receiptHtml(order: ReceiptOrder, branchName: string): string {
  const t = currentDict()
  const lang = settingsStore.get().lang
  const items = order.items
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
.number { font-size: 40px; font-weight: 900; margin: 2mm 0 0 }
.type { display: inline-block; border: 2px solid #000; padding: 1mm 3mm; font-size: 16px; font-weight: 900; text-transform: uppercase }
hr { border: 0; border-top: 1px dashed #000; margin: 3mm 0 }
table { width: 100%; border-collapse: collapse }
td { vertical-align: top; padding: .8mm 0 }
.qty { width: 9mm; font-weight: 700; font-size: 14px }
.sum { text-align: right; white-space: nowrap; padding-left: 2mm }
.order-note { font-weight: 700 }
.total { display: flex; justify-content: space-between; font-size: 15px; font-weight: 900 }
.muted { font-size: 11px }
</style></head><body>
<div class="center"><div class="brand">${escape(t.appName.toUpperCase())}</div><div class="muted">${escape(branchName)}</div>
<div class="number">${formatOrderNumber(order.number)}</div>
<div class="type">${escape(t.orderType[order.type])}</div>${order.source !== 'cashier' ? `<div class="muted">${escape(order.source === 'kiosk' ? t.orders.kiosk : t.orders.online)}</div>` : ''}
<div class="muted">${formatDateTime(order.createdAt)}</div></div>
<hr><table>${items}</table>
${order.online ? `<hr><div>${escape([order.online.name, order.online.phone].filter(Boolean).join(' · '))}</div>${order.online.address ? `<div class="order-note">${escape(order.online.address)}</div>` : ''}` : ''}
${order.note ? `<hr><div class="order-note">${escape(t.kassa.itemNote)}: ${escape(order.note)}</div>` : ''}
<hr><div class="total"><span>${escape(t.kassa.total)}</span><span>${formatMoney(order.total, t)}</span></div>
<div class="muted">${escape(payment)}</div>
</body></html>`
}

/**
 * Chekni yashirin oynada chop etadi (brauzerning standart printeri — kassadagi termoprinter). Chrome `--kiosk-printing`
 * bilan ochilsa, oyna so'ramasdan darhol chiqadi.
 */
export function printReceipt(order: ReceiptOrder, branchName: string): void {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  frame.srcdoc = receiptHtml(order, branchName)
  frame.onload = () => {
    frame.contentWindow?.focus()
    frame.contentWindow?.print()
    // print() oyna yopilguncha kutadi; keyin iframe kerak emas
    window.setTimeout(() => frame.remove(), 1000)
  }
  document.body.appendChild(frame)
}

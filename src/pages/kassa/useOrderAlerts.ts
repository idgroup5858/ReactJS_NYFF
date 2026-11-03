import { useCallback, useEffect, useRef, useState } from 'react'
import type { ID, Order } from '@/domain/types'
import { keepAlertSoundUnlocked, playAlert, type AlertSound } from '@/lib/alertSound'
import { settingsStore } from '@/store/settingsStore'
import type { OrdersTab } from './OrdersDrawer'

/** Ko'rilmagan buyurtma bor ekan — shuncha vaqtda bir chalinadi. */
const REPEAT_MS = 8_000

export type OrderAlerts = {
  /** kassir hali ko'rmagan online (mobil ilova) buyurtmalar soni */
  online: number
  /** kassir hali ko'rmagan kiosk buyurtmalar soni */
  kiosk: number
  /** ekran ramkasi va ovoz turi (online ustun); `null` — ko'rilmagan buyurtma yo'q */
  ringing: AlertSound | null
}

const sourceOf = (order: Order): AlertSound => (order.source === 'mobile' ? 'online' : 'kiosk')

/**
 * Kioskdan / mobil ilovadan kelgan buyurtmani kassir ko'rmaguncha ogohlantirish: kelishi bilan va keyin har 8 soniyada
 * ovoz. Ko'rildi deb hisoblanadi — kassir buyurtmalar oynasida shu bo'limni (Online / Kioskdan) ochsa yoki shu bo'lim
 * ochiq turganda sahifani bossa: oyna ochiq qolib kassir uzoqda bo'lsa, yangi kelgani baribir chalinadi. Ko'rilgani
 * qayta chalinmaydi (kiosk buyurtmasi mijoz to'lashga kelguncha kutib turadi). Sahifa yangilansa — hali ko'rilmagan
 * hisoblanadi. [orders] `undefined` — hali yuklanmagan; [enabled] `false` — jim (smena hisoboti ochiq, kassir ketyapti).
 */
export function useOrderAlerts(orders: Order[] | undefined, viewing: OrdersTab | null, enabled: boolean): OrderAlerts {
  const [seen, setSeen] = useState<ReadonlySet<ID>>(() => new Set())
  const pending = (orders ?? []).filter((order) => order.status === 'pending')
  const viewed: AlertSound | null = viewing === 'online' || viewing === 'kiosk' ? viewing : null
  const unseen = pending.filter((order) => !seen.has(order.id))
  const online = unseen.filter((order) => sourceOf(order) === 'online').length
  const kiosk = unseen.length - online
  const ringing: AlertSound | null = !enabled ? null : online > 0 ? 'online' : kiosk > 0 ? 'kiosk' : null
  const unseenKey = unseen.map((order) => order.id).join(',')

  // oxirgi holat — hodisa tinglovchilari uchun (har renderda yangilanadi)
  const latest = useRef({ pending, viewed })
  useEffect(() => {
    latest.current = { pending, viewed }
  })

  /** Ochiq bo'limdagi buyurtmalar — ko'rildi; ro'yxatdan chiqib ketganlari (qabul qilingan, bekor) unutiladi. */
  const markViewed = useCallback(() => {
    const { pending: current, viewed: tab } = latest.current
    if (!tab) return
    setSeen((prev) => {
      const fresh = current.filter((order) => sourceOf(order) === tab && !prev.has(order.id))
      if (fresh.length === 0) return prev
      const alive = new Set(current.map((order) => order.id))
      return new Set([...[...prev].filter((id) => alive.has(id)), ...fresh.map((order) => order.id)])
    })
  }, [])

  // bo'limni ochish / almashtirish — ko'rdi (ochiq turganda kelgani — faqat bosganda, pastda)
  useEffect(markViewed, [viewed, markViewed])

  useEffect(() => {
    if (!viewed) return
    const onAct = () => markViewed()
    window.addEventListener('pointerdown', onAct, true)
    window.addEventListener('keydown', onAct, true)
    return () => {
      window.removeEventListener('pointerdown', onAct, true)
      window.removeEventListener('keydown', onAct, true)
    }
  }, [viewed, markViewed])

  useEffect(keepAlertSoundUnlocked, [])

  // yangi buyurtma — darhol, keyin har REPEAT_MS da (ko'rilgani chiqib ketsa qo'shimcha chalinmaydi)
  const known = useRef<ReadonlySet<ID>>(new Set())
  const lastRing = useRef(0)
  useEffect(() => {
    const ids = unseenKey ? unseenKey.split(',') : []
    const arrived = ids.some((id) => !known.current.has(id))
    known.current = new Set(ids)
    if (arrived && ringing) {
      playAlert(ringing, settingsStore.get().alertVolume)
      lastRing.current = Date.now()
    }
  }, [unseenKey, ringing])

  useEffect(() => {
    if (!ringing) return
    const timer = window.setInterval(() => {
      if (Date.now() - lastRing.current < REPEAT_MS - 500) return
      playAlert(ringing, settingsStore.get().alertVolume)
      lastRing.current = Date.now()
    }, 1000)
    return () => window.clearInterval(timer)
  }, [ringing])

  return { online, kiosk, ringing }
}

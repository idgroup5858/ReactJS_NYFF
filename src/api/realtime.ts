import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { SERVER_URL } from './http'
import { invalidate } from './query'

/**
 * Jonli yangilanish (Socket.IO): server faqat "o'zgardi" xabarini yuboradi (`order`), buyruqlar — REST. Xabar kelsa
 * yoki qayta ulansa ochiq ro'yxatlar REST'dan qaytadan olinadi — uzilish paytidagi xabarlar yo'qolgan bo'lishi mumkin.
 *
 *  - `{ token }` — kassir / oshpaz yordamchisi → o'z filiali xonasi;
 *  - `{ tvBranchId }` — TV (PINsiz va kodsiz) → shu filial navbati (faqat raqam, tur, holat).
 * (Mijozning `{ orderId, orderToken }` ulanishi — alohida mobil ilovada.)
 */
export type SocketAuth = { token: string } | { tvBranchId: string }

/** `order` xabaridan keyin qaytadan yuklanadigan so'rovlar (kalit prefikslari — `queries.ts`). */
const LIVE_PREFIXES = ['orders:', 'tv:', 'shift:']

interface Options {
  /** har bir xabar (masalan yangi online buyurtma ovozi uchun) — xabardagi buyurtma ko'rinishi */
  onOrder?: (order: unknown) => void
  /** server ulanishni rad etdi yoki huquq bekor bo'ldi (xodim bloklandi; TV — filial noma'lum yoki faol emas) */
  onAuthError?: () => void
}

export function useRealtime(auth: SocketAuth | null, options: Options = {}): { connected: boolean } {
  const [connected, setConnected] = useState(false)
  const optionsRef = useRef(options)
  useLayoutEffect(() => {
    optionsRef.current = options
  })
  const authKey = auth ? JSON.stringify(auth) : null

  useEffect(() => {
    if (!authKey) return
    const socket = io(SERVER_URL || window.location.origin, { auth: JSON.parse(authKey) as SocketAuth, transports: ['websocket'] })
    let timer: number | undefined
    // bir lahzada kelgan bir nechta xabar — bitta qayta yuklash
    const refresh = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => invalidate(...LIVE_PREFIXES), 150)
    }
    socket.on('ready', () => {
      setConnected(true)
      refresh()
    })
    socket.on('order', (order: unknown) => {
      optionsRef.current.onOrder?.(order)
      refresh()
    })
    socket.on('disconnect', () => setConnected(false))
    socket.on('auth_error', () => {
      socket.disconnect()
      setConnected(false)
      optionsRef.current.onAuthError?.()
    })
    return () => {
      window.clearTimeout(timer)
      socket.disconnect()
      setConnected(false)
    }
  }, [authKey])

  return { connected }
}

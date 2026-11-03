/**
 * Kassaga yangi buyurtma kelganda chalinadigan ovoz — Web Audio bilan yasaladi (fayl yuklanmaydi, internet sekin bo'lsa
 * ham darhol chiqadi). Ovoz alohida audio oqimida o'ynaydi — sahifadagi ishni (bosish, yozish) to'xtatmaydi.
 */
export type AlertSound = 'online' | 'kiosk'

type Note = { freq: number; at: number; length: number }

/**
 * Kiosk — yumshoq "ding-dong". Online — tez ko'tariluvchi uch nota ikki marta (shoshilinchroq: mijoz kassa oldida
 * turmaydi, buyurtmani qabul qilish muddati bor).
 */
const MELODIES: Record<AlertSound, Note[]> = {
  kiosk: [
    { freq: 1318.5, at: 0, length: 0.9 },
    { freq: 1046.5, at: 0.42, length: 1.1 },
  ],
  online: [0, 1].flatMap((round) =>
    [1046.5, 1318.5, 1568].map((freq, i) => ({ freq, at: round * 0.6 + i * 0.13, length: 0.4 })),
  ),
}

let context: AudioContext | null = null

function audioContext(): AudioContext | null {
  if (context) return context
  if (typeof window === 'undefined' || typeof window.AudioContext !== 'function') return null
  context = new window.AudioContext()
  return context
}

/** Brauzer ovozni foydalanuvchi sahifani bosgandan keyingina chiqaradi — har bosishda (arzon) tekshirib ochiladi. */
function unlock(): void {
  const audio = audioContext()
  if (audio && audio.state === 'suspended') void audio.resume()
}

const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'keydown'] as const

/** Sahifa ochiq turganda ovozga ruxsatni ushlab turadi; qaytargan funksiya — tinglovchilarni olib tashlaydi. */
export function keepAlertSoundUnlocked(): () => void {
  for (const type of UNLOCK_EVENTS) window.addEventListener(type, unlock, { capture: true, passive: true })
  return () => {
    for (const type of UNLOCK_EVENTS) window.removeEventListener(type, unlock, { capture: true })
  }
}

/** Ovozga hali ruxsat yo'q paytdagi oxirgi so'rov — ruxsat kelganda faqat yangisi (1.5 s ichidagisi) chalinadi. */
let deferred: { kind: AlertSound; volume: number; at: number } | null = null

/**
 * [volume] — 0…1. Ovozga ruxsat bo'lmasa (sahifa yangilangan, kassir hali bosmagan) — chalinmaydi: to'xtab turgan
 * ovozlar ruxsat kelganda birdaniga chalinib ketmasin. Takroriy qo'ng'iroq keyingi safar chalinadi.
 */
export function playAlert(kind: AlertSound, volume: number): void {
  const audio = audioContext()
  if (!audio || volume <= 0) return
  if (audio.state === 'running') return schedule(audio, kind, volume)
  const first = deferred === null
  deferred = { kind, volume, at: Date.now() }
  if (!first) return
  audio
    .resume()
    .then(() => {
      const request = deferred
      deferred = null
      if (request && Date.now() - request.at < 1500) schedule(audio, request.kind, request.volume)
    })
    .catch(() => {
      deferred = null
    })
}

/** Qo'ng'iroqqa o'xshash bo'lsin deb har notaga bir oktava yuqori yengil ohang qo'shiladi. */
function schedule(audio: AudioContext, kind: AlertSound, volume: number): void {
  const start = audio.currentTime + 0.03
  const peak = Math.min(1, volume) * 0.45
  for (const note of MELODIES[kind]) {
    const t = start + note.at
    for (const [ratio, level] of [[1, 1], [2, 0.25]] as const) {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.type = 'sine'
      osc.frequency.value = note.freq * ratio
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(peak * level, t + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + note.length)
      osc.connect(gain).connect(audio.destination)
      osc.start(t)
      osc.stop(t + note.length + 0.05)
    }
  }
}

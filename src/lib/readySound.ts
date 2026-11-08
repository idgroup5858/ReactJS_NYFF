import ready1 from '@/assets/sounds/tv-ready-1.mp3'
import ready2 from '@/assets/sounds/tv-ready-2.mp3'
import ready3 from '@/assets/sounds/tv-ready-3.mp3'
import ready4 from '@/assets/sounds/tv-ready-4.mp3'
import ready5 from '@/assets/sounds/tv-ready-5.mp3'

/**
 * TV: buyurtma "Tayyor" ga o'tganda — bitta ovoz, keyingi buyurtmada keyingisi (5 tasi aylanib). Bir vaqtda bir nechta
 * buyurtma tayyor bo'lsa — ovozlar ketma-ket (ustma-ust emas). Fayllar (`src/assets/sounds`) web bilan birga chiqadi.
 */
const SOUNDS = [ready1, ready2, ready3, ready4, ready5]
/** Navbatda kutadigan ovozlar chegarasi: aloqa uzilib qaytganda birdaniga ko'p buyurtma kelsa, uzoq chalinmasin. */
const MAX_WAITING = 3

let players: HTMLAudioElement[] | null = null
let next = 0
let waiting = 0
let playing = false

/** Fayllar TV ochilganda oldindan yuklanadi — birinchi buyurtmada kechikmasin. */
export function preloadReadySounds(): void {
  players ??= SOUNDS.map((url) => {
    const audio = new Audio(url)
    audio.preload = 'auto'
    return audio
  })
}

function playNext(): void {
  if (playing || waiting === 0) return
  preloadReadySounds()
  const audio = players![next]
  next = (next + 1) % SOUNDS.length
  waiting -= 1
  playing = true
  const done = () => {
    audio.onended = null
    audio.onerror = null
    playing = false
    playNext()
  }
  audio.onended = done
  audio.onerror = done
  audio.currentTime = 0
  // ovozga ruxsat yo'q (TV yongach ekranga hali bosilmagan) — chalinmaydi, ruxsat kelganda to'planib chalinib ketmasin
  audio.play().catch(() => {
    waiting = 0
    done()
  })
}

/** Bitta buyurtma tayyor bo'ldi — navbatdagi ovoz. */
export function playReadySound(): void {
  waiting = Math.min(waiting + 1, MAX_WAITING)
  playNext()
}

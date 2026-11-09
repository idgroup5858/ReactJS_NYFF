import readySound from '@/assets/sounds/tv-ready.wav'

/**
 * TV: buyurtma "Tayyor" ga o'tganda — bitta "ding-dong" ovozi (2026-11-09: 5 ta mp3 o'rniga bitta, sintez qilingan WAV).
 * Bir vaqtda bir nechta buyurtma tayyor bo'lsa — ovoz ketma-ket (ustma-ust emas). Fayl (`src/assets/sounds`) web bilan
 * birga chiqadi.
 */
/** Navbatda kutadigan ovozlar chegarasi: aloqa uzilib qaytganda birdaniga ko'p buyurtma kelsa, uzoq chalinmasin. */
const MAX_WAITING = 3

let player: HTMLAudioElement | null = null
let waiting = 0
let playing = false

/** Fayl TV ochilganda oldindan yuklanadi — birinchi buyurtmada kechikmasin. */
export function preloadReadySounds(): void {
  if (player) return
  player = new Audio(readySound)
  player.preload = 'auto'
}

function playNext(): void {
  if (playing || waiting === 0) return
  preloadReadySounds()
  const audio = player!
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

/** Bitta buyurtma tayyor bo'ldi — ovoz (oldingisi tugagach). */
export function playReadySound(): void {
  waiting = Math.min(waiting + 1, MAX_WAITING)
  playNext()
}

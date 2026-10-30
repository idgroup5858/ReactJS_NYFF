import { SERVER_URL } from '@/api/http'

/** Taom va kategoriya rasmlari — backendning `uploads` papkasida (admin yuklaganlari ham), server manzilidan olinadi. */
const SERVER_IMAGE = /^\/images\/(products|categories)\//

/**
 * Rasm yo'li (`/images/...`) → `<img src>`. Taom / kategoriya rasmi — backenddan (`VITE_API_URL`, bo'sh bo'lsa shu
 * sayt); qolgani (ikonkalar) — `public/` dan, sayt sub-papkada ochilganda ham ishlashi uchun `base` qo'shiladi.
 */
export function assetUrl(src: string): string {
  if (SERVER_IMAGE.test(src)) return SERVER_URL + src
  return src.startsWith('/') ? import.meta.env.BASE_URL + src.slice(1) : src
}

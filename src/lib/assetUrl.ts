/** `public/` dagi fayl yo'li (`/images/...`) — sayt sub-papkada (GitHub Pages) ochilganda ham ishlashi uchun `base` qo'shiladi. */
export function assetUrl(src: string): string {
  return src.startsWith('/') ? import.meta.env.BASE_URL + src.slice(1) : src
}

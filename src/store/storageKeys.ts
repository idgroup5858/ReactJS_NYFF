/**
 * Brauzer xotirasi kalitlari. Hammasi `nyff:` bilan boshlanadi — boshqa ilovalar kalitlari bilan to'qnashmaydi.
 * Ma'lumotlar serverda; brauzerda faqat qurilma sozlamalari va sessiya tokeni.
 */
export const SETTINGS_STORAGE_KEY = 'nyff:settings'
/** sessionStorage — har bir tab o'z xodimi bilan ishlaydi (bir tabda kassa, boshqasida admin) */
export const SESSION_STORAGE_KEY = 'nyff:session'
/** sessionStorage — offline kassaga kirgan kassir (offline server bergan token) */
export const OFFLINE_SESSION_STORAGE_KEY = 'nyff:offline-session'
/** localStorage — kassaning ochiq cheklari (kassir bo'yicha): sahifa yangilansa ham yo'qolmaydi */
export const ticketsStorageKey = (userId: string) => `nyff:tickets:${userId}`
/** localStorage — kassa ko'rgan bugungi eng katta buyurtma raqami (filial bo'yicha) — offline'ga o'tishda uzatiladi */
export const lastNumberStorageKey = (branchId: string) => `nyff:last-number:${branchId}`
/**
 * localStorage — TV (navbat ekrani) / kioskda bir marta kiritilgan filial kodi (admin "Filiallar" → "TV kodi" /
 * "Kiosk kodi"): `nyff:tv-code:<filial>`, `nyff:kiosk-code:<filial>`
 */
export const screenCodeStorageKey = (kind: 'tv' | 'kiosk', branchId: string) => `nyff:${kind}-code:${branchId}`

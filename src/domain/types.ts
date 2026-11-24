/**
 * Domen modellari — backend (`C:\BACKEND APPS\NestJS_NYFF`, `API.md`) javoblari bilan bir xil. Vaqtlar — ISO satr (UTC).
 *
 * Miqdorlar: ombor qoldig'i, retseptlar va harakatlar ASOSIY birlikda (g / ml / dona) butun son bo'lib saqlanadi;
 * kirim va ko'chirish hujjatlari esa odam kiritgan OMBOR birligida (kg / l / dona) — qarang `units.ts`.
 */

export type Lang = 'uz' | 'ru' | 'en'
export const LANGS: Lang[] = ['uz', 'ru', 'en']

/** Uch tildagi matn (taom, kategoriya, ombor mahsuloti nomlari). */
export type LocalizedText = Record<Lang, string>

export type ID = string
/** ISO 8601 vaqt — `new Date().toISOString()` */
export type Timestamp = string
/** Mahalliy sana `YYYY-MM-DD` */
export type DateKey = string

// ───────────────────────── Tashkilot ─────────────────────────

/** Xaritadagi nuqta (WGS84, gradusda). */
export interface LatLng {
  lat: number
  lng: number
}

export interface Branch {
  id: ID
  name: string
  address: string
  phone: string
  active: boolean
  createdAt: Timestamp
  /** xaritadagi joyi — hududdan tashqaridagi buyurtma uchun eng yaqin filial shundan topiladi */
  location: LatLng | null
  /** yetkazib berish hududi — poligon uchlari (kamida 3 ta); bo'sh — hudud chizilmagan */
  deliveryZone: LatLng[]
  /** hudud ichida yetkazib berish narxi, so'm (0 — bepul); hududdan tashqarida narxni kuryer aytadi */
  deliveryFee: number
  /** filial yopiq bo'lsa uning hududidagi online buyurtmalar shu filialga; `null` — eng yaqin ochiq filialga */
  fallbackBranchId: ID | null
  /** admin to'xtatib qo'ysa (`false`) smena ochiq bo'lsa ham online buyurtma olmaydi */
  onlineEnabled: boolean
  /** online buyurtma qabul qilish vaqti (`HH:MM`, yarim tundan o'tishi mumkin); `null` — 24/7 */
  workHours: WorkHours | null
  /** hozir online buyurtma oladimi — `GET /branches` javobida (server hisoblaydi) */
  onlineState?: BranchOnlineState
  /**
   * FaceID tekshiruvi: kassir smenani filial terminalida «Kirish» bosib ochadi, «Chiqish» bosib topshiradi (HR tizimi
   * yuboradi). Admin kartochkadan bir bosishda o'chiradi (terminal buzilsa)
   */
  faceIdRequired: boolean
  /**
   * Oshpaz yordamchisi yo'q filial: kassir ham "Tayyor" / "Qaytarish" bosadi (buyurtmalar panelida, qayta chiqarish
   * tugmalarining chapida). Oshpaz yordamchisining huquqi o'zgarmaydi. Standart — o'chiq
   */
  cashierMarksReady: boolean
  /**
   * Markaziy omborga juda yaqin filial: sotuv retsepti filial omboridan emas, markaziy ombordan ayriladi. Qoldiq
   * ko'chirilmaydi, filial omboriga tegilmaydi. Standart — o'chiq
   */
  stockFromCentral: boolean
  /** filial HR tizimi markazga oxirgi marta murojaat qilgan vaqt; `null` — hali ulanmagan */
  hrSeenAt: Timestamp | null
}

export interface WorkHours {
  open: string
  close: string
}

/**
 * open — qabul qiladi; inactive — faol emas; paused — admin to'xtatgan; off_hours — ish vaqtidan tashqari;
 * no_shift — ochiq smena yo'q; no_kassa — smena ochiq, lekin kassa ekrani ulanmagan.
 */
export type BranchOnlineState = 'open' | 'inactive' | 'paused' | 'off_hours' | 'no_shift' | 'no_kassa'

export type WarehouseKind = 'central' | 'branch'

export interface Warehouse {
  id: ID
  name: string
  kind: WarehouseKind
  /** filial ombori uchun — qaysi filialniki; markaziy omborda `null` */
  branchId: ID | null
}

/**
 * `kitchen` — oshpaz yordamchisi: ovqatni oshxonadan olib chiqib "Tayyor" bosadi. `courier` — kuryer: faqat Android
 * ilovasida ishlaydi (`Kotlin_NYFF`), vebga kirmaydi; bu yerda — admin uni qo'shadi, kassa holatini ko'radi.
 */
export type Role = 'admin' | 'cashier' | 'kitchen' | 'supplier' | 'courier'
export const ROLES: Role[] = ['admin', 'cashier', 'kitchen', 'supplier', 'courier']

export interface User {
  id: ID
  name: string
  /** familiya; 2026-11-02 dan oldingi xodimlarda bo'sh bo'lishi mumkin. Ekranda — `fullName` */
  surname: string
  role: Role
  /**
   * Kassir va oshpaz yordamchisi ishlaydigan filiallar (kamida bittasi, bir nechta bo'lishi mumkin — kirishda kassa
   * turgan filial tanlanadi); admin, ta'minotchi va kuryer — `[]`
   */
  branchIds: ID[]
  /**
   * Kassir (FaceID): filial id → tabel raqami (o'sha filial HR tizimidagi / terminaldagi `employeeNo`; HR har filialda
   * alohida — raqam ham filialga xos). Boshqa rollarda `{}`
   */
  employeeNos: Record<ID, number>
  /** admin va kuryer: kirish emaili (kichik harfda); PIN bilan kiradiganlarda `null` */
  email: string | null
  active: boolean
  createdAt: Timestamp
}

/**
 * Kassir terminaldan o'tolmadi — admindan Telegram orqali so'ralgan ruxsat (`POST /auth/faceid-request`,
 * `/shifts/current/faceid-request`). `open` — smena ochish, `resume` — smenasi ochiq kassaga kirish, `close` — topshirish.
 */
export interface FaceIdRequest {
  id: ID
  action: 'open' | 'resume' | 'close'
  /** `expired` — javob berilmadi yoki ruxsat muddati (10 daqiqa) tugadi */
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  /** `pending` — javob kutish muddati, `approved` — ruxsat tugash vaqti */
  until: Timestamp | null
}

/** Kuryer va hozirgi holati (`GET /users/couriers`) — admin "Xodimlar" va kassa "Dostavka" uchun. */
export interface CourierStatus {
  id: ID
  name: string
  surname: string
  /** bloklanmagan */
  active: boolean
  /** ilovada "Ishdaman" yoqilgan */
  onDuty: boolean
  /** qo'ldagi buyurtmalar: olgan, hali yetkazmagan va qaytarmagan */
  orders: number
  /** qo'ldagi buyurtmalar filiali (bir vaqtda bittasi); bo'sh qo'l — `null` */
  branchId: ID | null
  /** "Yo'lga chiqdim" bosgan */
  departed: boolean
}

/** Kirgan xodim (token egasi) — PIN / parol serverda tekshiriladi, brauzerga kelmaydi. */
export interface AuthUser {
  id: ID
  name: string
  surname: string
  role: Role
  /**
   * joriy filial — kassir / oshpaz yordamchisi kirganda tanlangan (tokenda); kirish ro'yxatida — so'ralgan filial;
   * admin, ta'minotchi va kuryer — `null`
   */
  branchId: ID | null
  /** admin va kuryer: kirish emaili; PIN bilan kiradiganlarda `null` */
  email: string | null
}

/** Kirish ekranidagi xodim (`GET /auth/staff`). */
export interface StaffMember extends AuthUser {
  /**
   * filial bo'yicha so'ralganda, kassirda: shu filialdagi ochiq smenasi ochilgan vaqt (yo'q — `null`). Boshqa kassir
   * shu filialga kirsa, server bu smenani yopadi (kassir topshirmay ketgan)
   */
  openShiftAt?: Timestamp | null
}

// ───────────────────────── Menyu ─────────────────────────

export interface Category {
  id: ID
  name: LocalizedText
  image: string
  /** ikonka ("Zamonaviy" mavzuda rasm o'rnida); bo'sh satr — ikonkasiz */
  icon: string
  sortOrder: number
  active: boolean
}

export interface RecipeLine {
  ingredientId: ID
  /** asosiy birlikda: g / ml / dona */
  qty: number
}

export interface Product {
  id: ID
  categoryId: ID
  name: LocalizedText
  image: string
  /** bitta taomga ketadigan mahsulotlar — sotilganda filial omboridan shu miqdorlar ayriladi */
  recipe: RecipeLine[]
  /** sotuv narxi — barcha filiallarda bir xil */
  price: number
  /** taom vaqtincha sotilmaydigan filiallar; yangi filial — hamma taomni sotadi */
  unavailableBranchIds: ID[]
  sortOrder: number
  active: boolean
  /** `false` — oshxona chekiga chiqmaydi (tayyor ichimlik: kola, suv — kassir o'zi beradi; choy, qahva — chiqadi) */
  kitchen: boolean
  /** `true` — truck chekiga chiqadi (`kitchen` dan mustaqil: ikkalasi yoqiq — ikkala chekda) */
  truck: boolean
  /** `true` — faqat zalda beriladi (choynakdagi choy, idishdagi taom): olib ketish / dostavkaga yo'q */
  dineInOnly: boolean
}

// ───────────────────────── Ombor ─────────────────────────

/** Ombor birligi: kirim, qoldiqni ko'rsatish va narx shu birlikda. Asosiy birligi: kg → g, l → ml, pcs → dona. */
export type StockUnit = 'kg' | 'l' | 'pcs'
export const STOCK_UNITS: StockUnit[] = ['kg', 'l', 'pcs']
export type BaseUnit = 'g' | 'ml' | 'pcs'

/**
 * Ombor mahsulotlari guruhi (2026-11-23 dan admin boshqaradi — `GET /ingredient-groups`; avvalgi qattiq yozilgan 8
 * tasi o'sha id lar bilan qoldi) — omborda saralash, guruh ikonkasi va kioskdagi taom tarkibi uchun (qoldiq, retsept,
 * sotuvga ta'sir qilmaydi).
 */
export interface IngredientGroup {
  id: ID
  name: LocalizedText
  /** ikonka manzili (`/images/icons/bread.png`); bo'sh satr — ikonkasiz */
  icon: string
  /** sahifalarda guruhlar shu tartibda */
  sortOrder: number
  /** `false` — guruhdagi mahsulotlar kioskdagi taom tarkibida ko'rinmaydi (qadoq, yog', ziravor) */
  inComposition: boolean
}

/** "Boshqa" — o'chirilmaydigan guruh: o'chirilgan guruhdagi mahsulotlar shunga o'tadi. */
export const OTHER_GROUP: ID = 'other'

export interface Ingredient {
  id: ID
  name: LocalizedText
  /** guruh id'si (`IngredientGroup.id`) */
  group: ID
  unit: StockUnit
  /**
   * Qadoq hajmi asosiy birlikda (g / ml / dona): 600 — 1 dona ketchup 600 g. Berilgan bo'lsa kirim, ko'chirish, narx va
   * qoldiqni ko'rsatish — donada ("9 dona + 550 g"); qoldiq, retsept va chegara baribir asosiy birlikda. `null` — qadoqsiz
   */
  packSize: number | null
  /** oxirgi tasdiqlangan kirimdagi 1 birlik (qadoq bo'lsa — 1 dona, aks holda kg / l / dona) narxi — keyingi kirimda avtomatik yoziladi */
  lastPrice: number | null
  /**
   * Sarf materiali (salfetka, yuvish vositalari): yangi partiya kelganda (kirim, ko'chirish) eski qoldiq "Sarflandi"
   * (`consume`) bo'ladi; "kam qoldi" ogohlantirishlariga kirmaydi
   */
  consumable: boolean
  /**
   * Norma (2026-11-19, faqat admin): bir marta o'lchangan namuna — 64 kg tovuqdan 34,5 kg yarim tayyor go'sht va 5 kg
   * qanot. Berilgan bo'lsa kirimda mahsulot o'zi omborga qo'shilmaydi — shu nisbatda chiqqanlari qo'shiladi, narx ularga
   * og'irligi bo'yicha bo'linadi. `null` — oddiy mahsulot
   */
  yieldNorm: YieldNorm | null
  /**
   * Pishganda chiqishi (faqat admin, kg / l da): 1000 g xomdan shuncha g pishgan — 655. Berilgan bo'lsa retseptdagi son
   * **pishgan** miqdor, sotuvda xomi ayriladi (100 g → 153 g). `null` — retseptdagi son o'zi
   */
  cookYield: number | null
  /**
   * Guruh ichidagi tartib (2026-11-24, faqat admin suradi): «Mahsulotlar», «Qoldiqlar» va tanlash ro'yxati shu
   * tartibda; teng bo'lsa — `id` bo'yicha (`compareIngredients`). Yangi mahsulot va guruhi o'zgargani — guruh oxiriga
   */
  sortOrder: number
  active: boolean
}

/** Normadagi chiqish: [qty] — namunadan chiqqani, chiqqan mahsulotning ombor birligida, qadoqsiz (kg / l / dona). */
export interface YieldOutput {
  ingredientId: ID
  qty: number
}

/** Norma namunasi: [qty] butun mahsulotdan (ombor birligida, qadoqsiz) [outputs] chiqadi, qolgani chiqindi. */
export interface YieldNorm {
  qty: number
  outputs: YieldOutput[]
}

/** Ombordagi qoldiq. Yozuv bo'lmasa qoldiq 0, ogohlantirish chegarasi yo'q. */
export interface StockItem {
  warehouseId: ID
  ingredientId: ID
  /** asosiy birlikda; sotuv qoldiqdan oshsa manfiy bo'lishi mumkin (savdo to'xtamaydi) */
  qty: number
  /** asosiy birlikda; qoldiq shundan kam bo'lsa — ogohlantirish. 0 — kuzatilmaydi */
  minQty: number
}

/** Ombor mahsuloti qayerlarda ishlatilgan (`GET /ingredients/:id/usage`, admin) — birlikni o'zgartirishdan oldin. */
export interface IngredientUsage {
  /** retseptida shu mahsulot bor taomlar; `qty` — 1 porsiyaga, asosiy birlikda */
  products: { id: ID; name: LocalizedText; qty: number }[]
  /** qoldig'i, chegarasi yoki normasi bor omborlar (asosiy birlikda) */
  stock: Omit<StockItem, 'ingredientId'>[]
  purchases: number
  /** tasdiq kutayotgan eski kirimlar — bo'lsa kg / l ↔ dona o'zgartirib bo'lmaydi (`pending_purchase`) */
  pendingPurchases: number
  transfers: number
  /** tayyorlashlar — shu mahsulot tayyorlangan yoki sarflangan */
  productions: number
}

export type PurchaseStatus = 'pending' | 'approved' | 'rejected'

export interface PurchaseItem {
  ingredientId: ID
  /** ombor birligida (kg / l / dona); [packSize] bo'lsa — donada (qadoqda) */
  qty: number
  /** 1 birlik ([packSize] bo'lsa — 1 dona) narxi — admin kiritadi; tasdiqlanmaguncha `null` bo'lishi mumkin */
  price: number | null
  /** hujjat yozilgan paytdagi qadoq hajmi (asosiy birlikda) — mahsulotniki keyin o'zgarsa ham shu bilan ko'rsatiladi */
  packSize: number | null
  /** normasi bor mahsulot (butun tovuq): omborga o'zi emas, shular qo'shilgan — **asosiy birlikda** (g / ml / dona) */
  outputs?: { ingredientId: ID; qty: number }[]
}

/** Ta'minotchi kiritgan kirim. Admin narxlarni kiritib tasdiqlamaguncha omborga qo'shilmaydi. */
export interface Purchase {
  id: ID
  number: number
  warehouseId: ID
  items: PurchaseItem[]
  note: string
  status: PurchaseStatus
  createdBy: ID
  createdAt: Timestamp
  decidedBy: ID | null
  decidedAt: Timestamp | null
}

export interface TransferItem {
  ingredientId: ID
  /** ombor birligida (kg / l / dona); [packSize] bo'lsa — donada (qadoqda) */
  qty: number
  /** hujjat yozilgan paytdagi qadoq hajmi (asosiy birlikda) */
  packSize: number | null
}

/** Omborlar orasidagi ko'chirish (markaziy → filial yoki filial → filial). */
export interface Transfer {
  id: ID
  number: number
  fromWarehouseId: ID
  toWarehouseId: ID
  items: TransferItem[]
  note: string
  createdBy: ID
  createdAt: Timestamp
}

/**
 * Tayyorlashda sarflangan mahsulot: miqdor **qadoqsiz** birlikda — kg / l / dona (qadoqli tuxum ham donada). "Chelak
 * bilan" tayyorlashda qadoqli kg / l mahsulot (Mayonez Milter) — qadoqda, [packSize] — o'sha paytdagi qadoq hajmi
 * (asosiy birlikda); qadoqsiz qatorda yo'q.
 */
export interface ProductionItem {
  ingredientId: ID
  qty: number
  packSize?: number
}

/**
 * "Tayyorlash №N" — markaziy omborda bir nechta mahsulotdan yangisi: go'sht, tuxum, yog' → katlet. Sarflanganlar
 * ayriladi, tayyor mahsulot qo'shiladi (harakat turi `production`).
 */
export interface Production {
  id: ID
  number: number
  warehouseId: ID
  /** tayyor mahsulot */
  ingredientId: ID
  /** chiqqan miqdor, qadoqsiz birlikda — kg / l / dona; "chelak bilan" ([packSize] bor) — qadoq (chelak) soni */
  qty: number
  /**
   * "Chelak (qadoq) bilan" (2026-11-24): shu safargi 1 chelak og'irligi, asosiy birlikda — sarflangan kg / l lar jami ÷
   * chelak soni; tovarning qadoq hajmi ham shunga yangilanadi. `null` — qadoqsiz (katlet)
   */
  packSize: number | null
  items: ProductionItem[]
  /** tannarx, so'm; sarflanganlardan birining narxi bo'lmasa — `null` */
  cost: number | null
  note: string
  createdBy: ID
  createdAt: Timestamp
}

/**
 * `adjust` — qoldiqni tuzatish ("Tuzatish"): 0 ga tushirish (faqat admin) yoki qo'lda yozish (admin va ta'minotchi);
 * `production` — tayyorlash: sarflangan — manfiy, tayyor mahsulot — musbat; `consume` — "Sarflandi": sarf materialiga
 * yangi partiya kelganda eski qoldiq (sabab — o'sha kirim yoki ko'chirish, `refId`)
 */
export type MovementKind = 'purchase' | 'transfer_in' | 'transfer_out' | 'sale' | 'sale_cancel' | 'adjust' | 'production' | 'consume'

/** Qoldiqning har bir o'zgarishi — tarix va hisobotlar uchun. */
export interface StockMovement {
  id: ID
  warehouseId: ID
  ingredientId: ID
  /** asosiy birlikda: musbat — kirim, manfiy — chiqim */
  qty: number
  kind: MovementKind
  /** sabab bo'lgan hujjat: buyurtma, kirim, ko'chirish yoki tuzatish id'si */
  refId: ID
  createdAt: Timestamp
  /** faqat "Sarflandi" da — hisobdan chiqqan qoldiqning o'sha paytdagi narxdagi qiymati; boshqalarida / narxsiz — `null` */
  cost?: number | null
}

/**
 * "Tuzatish №N" — qoldiqni 0 ga tushirish (bitta mahsulot yoki butun ombor) yoki qo'lda yozish (bitta mahsulot);
 * o'zgarishlar — harakatlarda (`adjust`).
 */
export interface StockAdjustment {
  id: ID
  number: number
  warehouseId: ID
  createdBy: ID
  createdAt: Timestamp
}

/** 0 ga tushirish / qo'lda yozish natijasi: o'zgarish yo'q (allaqachon shu qoldiq) bo'lsa — hujjat `null`, `count` 0. */
export interface StockReset {
  adjustment: StockAdjustment | null
  count: number
}

// ───────────────────────── Sotuv ─────────────────────────

export type OrderType = 'dine_in' | 'takeaway' | 'delivery'
export const ORDER_TYPES: OrderType[] = ['dine_in', 'takeaway', 'delivery']

export type OrderSource = 'cashier' | 'kiosk' | 'mobile'
export const ORDER_SOURCES: OrderSource[] = ['cashier', 'kiosk', 'mobile']

/** Mijoz buyurtmani qayerdan berdi: telefon ilovasi yoki Telegram mini app (`src/telegram`). */
export type MobilePlatform = 'android' | 'ios' | 'telegram'

/**
 * Mobil ilovadan kelgan buyurtma: mijoz, telefon, manzil (faqat dostavkada) va u tanlagan to'lov — `cash` (kuryerga /
 * filialda naqd), `card` (ilovada karta bilan oldindan to'langan — buyurtma faqat to'lovdan keyin keladi; bekor qilinsa
 * admin pulni qaytaradi) yoki `click` (ilovada to'langan belgisi). Kassir "Qabul qilish" bosganda shu to'lov bilan
 * oshxonaga ketadi.
 */
export interface OnlineInfo {
  platform: MobilePlatform
  name: string
  phone: string
  address: string
  payment: 'click' | 'cash' | 'card'
  /** mijoz belgilagan joy (GPS / xarita) — dostavkada majburiy, filialni server shu bo'yicha tanlaydi */
  location: LatLng | null
}

/**
 * Server o'zi bekor qilgan mobil buyurtma sababi (kassir / admin bekor qilsa — `null`): `timeout` — filial 5 daqiqada
 * qabul qilmadi; `branch_closed` — kutish paytida filial yopildi; `no_branch` — o'tkazadigan ochiq filial yo'q.
 */
export type CancelReason = 'timeout' | 'branch_closed' | 'no_branch'

/** Kuryer "Yetkazib bo'lmadi" sababi: mijoz javob bermadi, manzil topilmadi, mijoz olmadi, boshqa (izohda). */
export type ReturnReason = 'no_answer' | 'wrong_address' | 'refused' | 'other'

/**
 * pending (kioskdan — kassada to'lanmagan; mobil ilovadan — kassir qabul qilmagan) → preparing (to'langan / qabul
 * qilingan, chek oshxonada) → ready (oshpaz yordamchisi ovqatni olib chiqib "Tayyor" bosdi, TV da bir necha daqiqa
 * turadi). Kassir istalgan bosqichda bekor qila oladi.
 */
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'cancelled'

export type PaymentMethod = 'cash' | 'card' | 'click'
export const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'click']
/** Aralash to'lov: tur bo'yicha summalar (yig'indisi = buyurtma summasi), masalan yarmi naqd, yarmi karta. */
export type PaymentSplit = Partial<Record<PaymentMethod, number>>

export interface OrderItem {
  productId: ID
  /** sotilgan paytdagi nom va narx — keyin menyu o'zgarsa ham chek o'zgarmaydi */
  name: LocalizedText
  price: number
  qty: number
}

export interface Order {
  id: ID
  branchId: ID
  /** filialda har kuni 1 dan boshlanadigan raqam — TV va chekda shu ko'rinadi */
  number: number
  type: OrderType
  source: OrderSource
  items: OrderItem[]
  /** butun buyurtmaga izoh */
  note: string
  total: number
  /** to'lov turi; aralashda — eng katta qism. Kassada to'lanmagan kiosk buyurtmasida `null` */
  payment: PaymentMethod | null
  /** faqat aralash to'lovda: tur bo'yicha summalar */
  split: PaymentSplit | null
  /** faqat mobil ilovadan kelganda */
  online: OnlineInfo | null
  status: OrderStatus
  cashierId: ID | null
  shiftId: ID | null
  createdAt: Timestamp
  /** to'langan va oshxonaga ketgan vaqt */
  preparingAt: Timestamp | null
  readyAt: Timestamp | null
  cancelledAt: Timestamp | null
  cancelledBy: ID | null
  cancelReason: CancelReason | null
  /** shu filialga tushgan vaqt (mobil buyurtmaning 5 daqiqalik qabul muddati shundan) */
  routedAt: Timestamp
  /** mobil buyurtma boshqa filialga necha marta o'tkazilgan (ko'pi bilan 1) va oldingi filial */
  transferCount: number
  fromBranchId: ID | null
  /** mobil dostavka: buyurtma berilgandagi hudud narxi (summaga kirmaydi, kuryerga naqd); hududdan tashqarida — `null` */
  deliveryFee: number | null
  // ── kuryer (faqat mobil dostavka; `status` ready da qoladi) ──
  courierId: ID | null
  /** "Olaman" */
  takenAt: Timestamp | null
  /** "Yo'lga chiqdim" */
  departedAt: Timestamp | null
  /** "Yetkazildi" */
  deliveredAt: Timestamp | null
  /** "Yetkazib bo'lmadi" — filialga qaytadi; kassir kuryerdan oladi yoki bekor qiladi */
  returnedAt: Timestamp | null
  returnReason: ReturnReason | null
  returnNote: string
  /** kuryer yo'lidagi navbati (1, 2, …) — server taklif qilgan tartib */
  courierSeq: number | null
  /** oldingi nuqtadan shu manzilgacha, km (to'g'ri chiziq) */
  courierLegKm: number | null
}

/** TV navbat ekrani uchun — mijoz ma'lumotisiz. */
export type TvOrder = Pick<Order, 'id' | 'branchId' | 'number' | 'type' | 'status' | 'preparingAt' | 'readyAt'>

/** Mijoz ko'rinishi (mobil ilova, kiosk javobi) — xodim va kuryer ma'lumotisiz (faqat "yo'lda" / "yetkazildi"). */
export type CustomerOrder = Pick<
  Order,
  | 'id'
  | 'branchId'
  | 'number'
  | 'type'
  | 'items'
  | 'note'
  | 'total'
  | 'payment'
  | 'online'
  | 'status'
  | 'createdAt'
  | 'preparingAt'
  | 'readyAt'
  | 'cancelledAt'
  | 'cancelReason'
  | 'routedAt'
  | 'transferCount'
  | 'fromBranchId'
  | 'deliveryFee'
  | 'departedAt'
  | 'deliveredAt'
  | 'returnedAt'
>

/** Kassir smenasi: kirganda ochiladi (yoki davom etadi), "Smenani topshirish" bilan yopiladi. */
export interface Shift {
  id: ID
  branchId: ID
  cashierId: ID
  openedAt: Timestamp
  closedAt: Timestamp | null
}

/** Smena tushumi: to'langan (bekor qilinmagan) buyurtmalar, to'lov turlari bo'yicha; bekor qilinganlar — faqat soni. */
export interface ShiftSummary {
  orderCount: number
  cancelledCount: number
  total: number
  byPayment: Record<PaymentMethod, number>
}

export type ShiftWithSummary = Shift & { summary: ShiftSummary }

/** `ingredient` — ombor mahsulotiga to'lov (qaysi — `ingredientId`), qoldiqqa ta'sir qilmaydi */
export type ExpenseKind = 'electricity' | 'gas' | 'water' | 'internet' | 'other' | 'ingredient'
export const EXPENSE_KINDS: ExpenseKind[] = ['electricity', 'gas', 'water', 'internet', 'other', 'ingredient']

/** Chiqim — kommunal to'lovlar va ombor mahsulotiga to'lov. */
export interface Expense {
  id: ID
  branchId: ID
  kind: ExpenseKind
  /** `kind: 'ingredient'` da — qaysi mahsulot, boshqalarida `null` */
  ingredientId: ID | null
  amount: number
  date: DateKey
  note: string
  createdBy: ID
  createdAt: Timestamp
}

// ───────────────────────── Server javoblari ─────────────────────────

/** Sahifalangan ro'yxat (`?page=&limit=`). */
export interface Page<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

/** Kassa / kiosk / mobil menyusi: shu filialda sotuvdagi taom — narxi bilan, retseptsiz. */
export interface MenuProduct {
  id: ID
  categoryId: ID
  name: LocalizedText
  image: string
  sortOrder: number
  /** `null` — shu filialda sotilmaydi (faqat kassa menyusida keladi — `useMenu(id, { all: true })`) */
  price: number | null
  /** tarkibi (qadoq, yog', ziravorlarsiz) — kioskda ko'rsatiladi */
  composition: LocalizedText[]
  /** `false` — oshxona chekiga chiqmaydi. Eski offline nusxada yo'q (`undefined`) — chiqadi. */
  kitchen?: boolean
  /** `true` — truck chekiga chiqadi. Eski markaz / offline nusxada yo'q (`undefined`) — chiqmaydi. */
  truck?: boolean
  /** `true` — faqat zalda beriladi: olib ketishda kioskda ko'rinmaydi, kassada to'lov to'xtaydi. Eski nusxada yo'q — cheklanmaydi. */
  dineInOnly?: boolean
}

/** Taomni shu turdagi buyurtmaga qo'shib bo'ladimi: "faqat zalda" taom — faqat zalda. */
export const allowedForType = (product: Pick<MenuProduct, 'dineInOnly'>, type: OrderType): boolean =>
  !product.dineInOnly || type === 'dine_in'

export interface Menu {
  branchId: ID
  categories: Category[]
  products: MenuProduct[]
}

/** Admin rasm tanlaydigan papkalar (serverning `uploads/...` papkasi, yo'li — `/images/...`). */
export type ImageFolder = 'products' | 'categories'

/** Papkadagi rasm (`GET /images`) yoki yuklangani (`POST /images`). */
export interface ImageFile {
  /** taom / kategoriyaning `image` iga yoziladigan yo'l: `/images/products/cola.png` */
  path: string
  folder: ImageFolder
  name: string
  size: number
  modifiedAt: Timestamp
}

/** Yetkazib berish manzili qaysi filialga tushadi (`GET /delivery/route`). */
export interface DeliveryRoute {
  /** buyurtmani oladigan filial; `null` — hech bir filial ochiq emas */
  branchId: ID | null
  /** nuqta tushgan hudud egasi; `null` — hech bir hududga tushmadi */
  zoneBranchId: ID | null
  /** hudud narxi; `null` — hududdan tashqarida, narxni kuryer aytadi */
  fee: number | null
  /** hudud egasi yopiq — zaxira (yoki eng yaqin ochiq) filialga yo'naltirildi */
  redirected: boolean
}

export interface Tally {
  orders: number
  revenue: number
}

export interface DayPoint extends Tally {
  date: DateKey
  expenses: number
}

export interface ProductStat {
  productId: ID
  name: LocalizedText
  qty: number
  revenue: number
}

/**
 * Taom foydasi (`GET /reports/products`): sotilgan soni va tushumi, ulardan tannarxi ma'lum qismi (`costedQty`,
 * `costedRevenue`) va o'sha qismning sotuv paytidagi tannarxi (`cost`). Foyda — `costedRevenue − cost`; tannarxi
 * noma'lumi — `qty − costedQty` (tannarx yozilishidan oldingi sotuv yoki retseptida narxsiz mahsulot bo'lgan).
 */
export interface ProductProfit extends ProductStat {
  costedQty: number
  costedRevenue: number
  cost: number
}

/**
 * Xo'jalik sarfi (`GET /reports/consumption`): sarf materiali davrda qancha "Sarflandi" — miqdori asosiy birlikda,
 * qiymati ma'lum qismi (`costedQty`) va uning summasi (`cost`).
 */
export interface ConsumptionStat {
  ingredientId: ID
  name: LocalizedText
  qty: number
  costedQty: number
  cost: number
}

export interface BranchStat extends Tally {
  branchId: ID
  expenses: number
}

/** Sotuv hisoboti (`GET /reports/sales`). */
export interface SalesReport extends Tally {
  cancelled: number
  cancelledAmount: number
  avgCheck: number
  byPayment: Record<PaymentMethod, number>
  byType: Record<OrderType, Tally>
  bySource: Record<OrderSource, Tally>
  /** soat bo'yicha tushum (0–23) */
  byHour: number[]
  /** oraliqdagi har bir kun — buyurtmasiz kunlar ham (0 bilan) */
  days: DayPoint[]
  /** tushum bo'yicha kamayish tartibida */
  topProducts: ProductStat[]
  byBranch: BranchStat[]
  expenses: number
  expensesByKind: Record<ExpenseKind, number>
  /** tushum − kommunal xarajatlar */
  net: number
}

/** Admin bosh sahifasining "hozir" ko'rsatkichlari (`GET /reports/overview`). */
export interface Overview {
  liveOrders: { branchId: ID; count: number }[]
  lowStock: number
  pendingPurchases: number
  /** birinchi buyurtma kuni — undan oldingi davr bilan solishtirish ma'nosiz; `null` — buyurtma yo'q */
  firstOrderDate: DateKey | null
}

/** Admin buyurtmalar ro'yxatining jami — filtrlangan hammasi bo'yicha (sahifadan qat'i nazar). */
export interface OrdersSummary {
  count: number
  /** to'langan (tayyorlanmoqda / tayyor) — tushum */
  paid: { count: number; amount: number }
  cancelled: { count: number; amount: number }
  /** kassada to'lanmagan kiosk / qabul qilinmagan mobil */
  pending: { count: number; amount: number }
}

/** Smenalar ro'yxatining jami — filtrlangan hammasi bo'yicha. */
export interface ShiftsSummary {
  count: number
  /** hozir ochiq */
  open: number
  revenue: number
  cash: number
}

/** Harakat + sabab bo'lgan hujjat raqami; ko'chirishda — ikkinchi ombor (kirimda qayerdan, chiqimda qayerga). */
/** [refBy] — kirim / ko'chirish / tuzatishni yozgan xodim (buyurtmada — `null`) */
export type MovementWithRef = StockMovement & { refNumber: number | null; refWarehouseId: ID | null; refBy: ID | null }

// ───────────────────────── AI yordamchi va Telegram bot ─────────────────────────

/** AI suhbati xabari: savol (`user`) yoki javob (`model`, oddiy matn). */
export interface AiMessage {
  id: ID
  userId: ID
  /** `web` — admin paneldagi chat, `tg:<chatId>` — Telegram */
  chat: string
  role: 'user' | 'model'
  text: string
  createdAt: string
}

/** `POST /ai/chat` — yangi suhbat (sahifa har ochilganda): salom; `configured: false` — serverda `GEMINI_API_KEY` yo'q. */
export interface AiChatStart {
  configured: boolean
  greeting: AiMessage
}

export interface AiExchange {
  question: AiMessage
  /** shu chatda kunning birinchi savoli — javobdan oldin salom (alohida xabar), aks holda `null` */
  greeting: AiMessage | null
  answer: AiMessage
}

export interface TelegramChatInfo {
  chatId: string
  userId: ID
  /** tizimdagi admin ismi */
  userName: string
  /** Telegram `@username` */
  username: string | null
  /** Telegram'dagi ism */
  name: string
  linkedAt: string
}

/** `GET /telegram`: bot (yo'q — token kiritilmagan), server tinglayaptimi, shu adminning start linki, ulangan chatlar. */
export interface TelegramStatus {
  bot: { id: number; username: string; name: string } | null
  running: boolean
  link: string | null
  chats: TelegramChatInfo[]
}

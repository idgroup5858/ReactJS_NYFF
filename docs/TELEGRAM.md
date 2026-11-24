# Telegram mini app (mijoz buyurtmasi)

> **Holat (2026-11-20):** tayyor — `/shorva/telegram`, kod `src/telegram/`. `tsc`, `oxlint` (mini appda 0 ogohlantirish),
> `vite build` o'tdi. Lokal backend bilan headless Chromium'da (telefon o'lchami) 21 ta qadam o'tdi: menyu, savat, taom
> oynasi, olib ketish va dostavka (xarita + GPS) buyurtmasi, holat sahifasi (socket, qabul muddati sanog'i), "Buyurtmalarim",
> profil, til / tungi rejim. Karta oqimlari — bank javoblari soxta (so'rovlar ushlangan): saqlangan kartadan darhol to'lov,
> bir martalik to'lov (oyna ochiladi → natija kutiladi → buyurtma), bekor qilish → "To'lov o'tmadi", karta qo'shish,
> o'chirish. **Hali sinalmagan:** haqiqiy Telegram ilovasi ichida va `fast` serverda haqiqiy bank bilan.

Android ilovaning mijoz qismi (`Kotlin_NYFF`) — web'da, Telegram bot menyusidan ochiladi. Backend API — o'sha
(`NestJS_NYFF/API.md` 5-bo'lim), yangi endpoint yo'q.

## 1. Kelishilgan qarorlar

| Mavzu | Qaror |
|---|---|
| Joyi (2026-11-20) | Foydalanuvchi: "hozirgi React ilova ichida bo'ladi, `fast.newyork24.uz/shorva/telegram`". Xodimlar tizimi bilan bitta build, lekin **mustaqil**: hamma kod `src/telegram/` da, tashqaridan — faqat `app/router.tsx` dagi bitta qator. Mini app `@/…` (xodimlar tizimi fayllari) dan hech narsa import qilmaydi — faqat loyihada bor kutubxonalar (`react`, `react-router`, `lucide-react`, `socket.io-client`, `@vis.gl/react-google-maps`, Inter shrifti) va Tailwind (`styles/global.css` dagi `@import "tailwindcss"`). Foydalanuvchi: "xohlagan paytda butunlay bekor bo'ladigan bo'lsin" — 5-bo'lim |
| Ikki server | Bitta build ikkalasida ham: API, socket va rasmlar manzili **nisbiy** (`/api`, `/socket.io`, `/images`) — sahifa qaysi domendan ochilsa, o'sha serverga. `VITE_API_URL` mini appda ishlatilmaydi (sahifa va API bitta domenda bo'lishi shart). Qaysi server — BotFather'dagi menyu tugmasi manzili (Android'dagi `nyff.apiUrl` o'rnida, o'zgartirish — darhol, build kerak emas) |
| Bot | Yangi bot, faqat @BotFather'da sozlanadi (4-bo'lim). **Token serverga berilmaydi**, server botni tinglamaydi. Direktor botining tokeni ("AI → Telegram") bilan aralashtirilmaydi — u yerga kiritilsa direktor chatlari uziladi |
| Telegram'ga bog'liqlik | Foydalanuvchi: "telegramga umuman bog'liq bo'lmasin". Akkaunt, `initData`, bot tokeni ishlatilmaydi; sahifa oddiy brauzerda ham ishlaydi. Telegram ichida — faqat ko'rinish qulayliklari (`webapp.ts`: to'liq balandlik, pastga surib yopilmasligi, "Orqaga" tugmasi, sarlavha rangi, to'lov oynasini ochish); SDK skripti faqat Telegram ochganda yuklanadi, ochilmasa ham ilova ishlaydi |
| Kartalar | Android'dagidek **qurilma kaliti** (`X-Client-Key`, API.md 5.8): birinchi so'ralganda 32 tasodifiy bayt, `localStorage` (`nyt.clientKey`). Telegram akkauntiga bog'lanmaydi — boshqa telefonda kartalar ko'rinmaydi; Telegram keshi tozalansa karta qayta qo'shiladi |
| To'lov oynasi | (2026-11-24, foydalanuvchi: "shu oynaning o'zida ochib yuborsa bo'lmaydimi, xuddi WebView kabi") **Telegram ilovasida** (telefon, kompyuter) bank sahifasi mini appning **o'z oynasida** ochiladi (`openBankPage`: `location.assign`, Telegram'ning "Orqaga" tugmasi yashiriladi). Qaytish: mini app ketishdan oldin `sessionStorage` ga `nyt.return.<id>` = shu sahifa yo'li (`/…/telegram/payment/<id>`, karta ulashda — `/…/telegram/card?binding=<id>`) yozadi; bank to'lovdan keyin backend'ning qaytish sahifasiga yuboradi, u kalitni o'qib mijozni o'sha yo'lga o'tkazadi (API.md 5.7). Domen bitta bo'lgani uchun `localStorage` (ochilgan to'lov) va Telegram parametrlari (`sessionStorage`) saqlanadi; to'lov sahifasi `opened` bo'lgani uchun darhol natijani so'raydi, karta sahifasi `?binding=` bilan yangi sessiya ochmay natijani so'raydi. Karta bog'langach "Orqaga" — bosh sahifaga (tarix bank sahifalari bilan almashgan). **Telegram Web** (iframe — bank sahifasi ramkada ochilmasligi mumkin) va **oddiy brauzerda** — avvalgidek alohida oynada (Telegram'da `openLink`; brauzerda yangi tab, bloklansa — shu oynada). Natija har 2 s `GET /mobile/payments/:id` (muddat `expiresAt` + 1 daqiqagacha), mijoz qaytganda darhol yana. Oyna faqat tugma bosilganda ochiladi. Matnlarda "bank sahifasi" yo'q — "to'lov oynasi" (Android'da mijoz tushunmagani topilgan). Shart: backend'ning `PUBLIC_URL` i bo'sh yoki mini app ochiladigan domen bilan bir xil — boshqa domenda kalit ko'rinmaydi, mijoz "Ilovaga qayting" sahifasida qoladi |
| To'lovdan chiqish | To'lov kutilayotganda "Orqaga" (sarlavhadagi va Telegram'dagi) — tasdiq oynasi; bekor qilinsa 3 marta tekshiriladi → "To'lov o'tmadi" → "Qayta urinish" (rasmiylashtirishga, savat joyida). Ochilgan to'lov `localStorage` da (`nyt.pendingPayment`) — mini app yopilib qolsa, bosh sahifa ochilganda tekshiriladi |
| Buyurtma manbai | `online.platform: "telegram"` — backend `MOBILE_PLATFORMS` ga qo'shildi (`NestJS_NYFF/PLAN.md` 34), admin buyurtma tafsilotida "Telegram". Mini app olib tashlansa ham qiymat qoladi — eski buyurtmalarda yozilgan |
| Saqlash | `localStorage`, kalitlar `nyt.` bilan (xodimlar tizimi kalitlariga tegmaydi): til, mavzu, qoralama (tur, filial, dostavka nuqtasi), profil, to'lov tanlovi, kalit, ochilgan to'lov, buyurtmalar tarixi (eng yangi 200 tasi; Android'da Room — o'chirilmaydi). Savat — faqat xotirada (Android'dagidek) |
| Formalar | Web'da xaritaga / "Karta qo'shish"ga o'tilganda sahifa yopiladi — rasmiylashtirish va profil formalari xotiradagi omborda (`checkoutStore`, `profileDraftStore`), bosh sahifa ochilganda tozalanadi (Android'dagidek: manzil va izoh har safar bo'sh) |
| Navigatsiya | Buyurtma berilgach / to'langach "orqaga" — bosh sahifa (`nav.reset`, Android `popUpTo<HomeRoute>`); mini app qaysi yo'lga ulangani kodda yozilmagan |
| Ko'rinish | Android palitrasi (`telegram.css`, `--nyt-*`), yorug' (standart) va tungi, uz / ru / en — Android `strings.xml` dan (`i18n.ts`). Xarita — xodimlar tizimidagi kalit (`VITE_GOOGLE_MAPS_API_KEY`), alohida bo'lak bo'lib faqat joy tanlanganda yuklanadi |

## 2. Tuzilma (`src/telegram/`)

| Fayl | Nima |
|---|---|
| `TelegramApp.tsx` | kirish: ildiz (mavzu, til), ichki yo'llar, "Orqaga", xato oynasi (router `lazy` uchun `Component` / `ErrorBoundary`) |
| `api.ts`, `types.ts` | mijoz endpointlari (nisbiy `/api`), xatolar (`code`), server vaqti (`Date` sarlavhasi) |
| `domain.ts` | Android `Shop` / `Cart` / `OrderProgress` / `Format` / `Phone` qoidalari |
| `store.ts`, `data.ts` | holat va `localStorage`; serverdan o'qish (filial, menyu, buyurtma, to'lov, kartalar) |
| `i18n.ts`, `labels.ts` | matnlar (3 til), holat / narx / filial matnlari |
| `ui.tsx`, `components.tsx`, `telegram.css` | komponentlar va ranglar |
| `nav.ts`, `webapp.ts` | o'tishlar; Telegram SDK (ixtiyoriy) |
| `pages/` | `HomePage`, `LocationPage`, `CheckoutPage`, `PaymentPage`, `CardBindPage`, `TrackingPage`, `OrdersPage`, `ProfilePage` |

Yo'llar (`/shorva/telegram/…`): `` (bosh), `location`, `checkout`, `payment/:id`, `card`, `order/:id`, `orders`, `profile`.

## 3. Ikki serverga o'rnatish

1. Backend (`platform: "telegram"` bilan) — **ikkala serverga ham** (`git pull`, `npm run build`, `pm2 restart`). Eski
   backend bunday buyurtmani `400 invalid_input` bilan rad etadi.
2. Web — odatdagidek (`npm run build`, `dist` → `/var/www/html`); bitta build ikkala serverda.
3. Google Maps kaliti ikkala domenga ruxsat berilgan bo'lsin (admin "Filiallar → xarita" ishlasa — bor). Lokal sinovda
   Google `BillingNotEnabledMapError` dedi: kalit loyihasida to'lov (billing) yoqilmagan bo'lsa xarita xira va "For
   development purposes only" yozuvi bilan chiqadi (ishlaydi, lekin ko'rinishi yomon) — Google Cloud'da billing yoqiladi.

## 4. BotFather

1. `/newbot` — nom va username (mijozlar uchun; sinov serveri uchun alohida bot qulay — bitta botning menyu tugmasi
   bitta manzilga qaraydi).
2. `/mybots` → bot → **Bot Settings → Menu Button** → URL: `https://fast.newyork24.uz/shorva/telegram` (sinov) yoki
   `https://newyork24.uz/shorva/telegram` (asosiy), tugma matni (masalan "Menyu").
3. Ixtiyoriy: `/setdescription`, `/setuserpic`.

Server botni tinglamaydi: mijoz `/start` yoki xabar yozsa, bot javob bermaydi (menyu tugmasi va tavsif ko'rinadi). Salom
xabari yoki buyurtma holati botdan kelsin desak — token serverga beriladi, admin panelda alohida "Mijoz boti" (direktor
botiga tegmasdan) — kelishilmagan.

## 5. Olib tashlash

1. `src/app/router.tsx` — `telegram/*` qatori (va izohdagi `/telegram/*` qatori).
2. `src/telegram/` papkasi va shu fayl (`docs/TELEGRAM.md`).
3. BotFather'da menyu tugmasini o'chirish (yoki botni).

Qolganiga tegilmaydi: kutubxonalar xodimlar tizimida ham ishlatiladi; backend'dagi `telegram` qiymati, admin
tafsilotidagi "Telegram" yozuvi (`domain/types.ts` `MobilePlatform`, `i18n` `mobilePlatform`) — eski buyurtmalar uchun
qoladi. Backend'da mini app uchun alohida kod yo'q.

## 6. Cheklovlar

- Telegram ichida GPS ba'zi telefonlarda ruxsat so'ramasligi mumkin — unda joy xaritada pin bilan belgilanadi.
- Mini app yopiq bo'lsa holat xabari kelmaydi (push yo'q); qayta ochilganda REST'dan yangilanadi.
- Filialga qo'ng'iroq — `tel:` havolasi; Telegram ichida ochilmasa, raqam tugmada ko'rinib turadi.
- Kartalar va tarix qurilmadagi brauzer xotirasida — boshqa qurilmada yoki kesh tozalangach ko'rinmaydi.

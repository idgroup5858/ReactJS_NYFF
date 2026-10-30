# Rejalar

Kelishilgan, lekin hali qilinmagan ishlar. Yangi g'oya kelishilsa shu yerga qo'shiladi; bajarilgani README dagi
"Bosqichlar" bo'limiga o'tadi.

## 0. Backend (NestJS) — boshlash uchun

**Holat (2026-10-27):** bajarildi — backend `C:\BACKEND APPS\NestJS_NYFF` (`PLAN.md`, `API.md`) yozildi, quyidagi
qarorlar va 2-bo'limdagi online qabul qoidalari unda qilingan; web ilova unga ulandi (localStorage va demo ma'lumot
olib tashlandi). Qolganlari — 1–4 bo'limlar.

**Kelishilgan (2026-10-27):**

- **Loyiha** — `C:\BACKEND APPS\NestJS_NYFF` (qo'shni papka: `ReactJS_X` ↔ `NestJS_X`), port **3000**, lokal
  PostgreSQL 18 (`localhost:5432`, baza `nyff`; ulanish sozlamalari — NestJS_HR_System `.env` dagidek), vaqt zonasi
  `Asia/Tashkent` (kunlik raqam va soatlik hisobot shunga bog'liq). Uslub — NestJS_HR_System: TypeORM 0.3 + `pg`, sxema
  faqat migratsiyalar orqali, global AuthGuard + `@Public()`, xato javobi `{ statusCode, code, message }` (`code` —
  `src/domain/errors.ts` dagi kodlar, matni frontend'da). Loyihada `PLAN.md` + `CLAUDE.md`; ish faqat "boshla"dan keyin.
- **ID** — hozirgi ko'rinish qoladi: prefiks + tasodifiy qism (`ord_3f2a9c1b7e4d8a05`), demo id'lari (`br_chilonzor`,
  `burger-classic`) saqlanadi — frontend o'zgarishsiz ulanadi. Tartib raqami (1, 2, 3…) ishlatilmaydi — taxmin qilinadi.
- **PIN** — faqat serverda tekshiriladi, bazada PIN emas, uning bcrypt xeshi; 5 marta xato — 5 daqiqa blok (4 xonali
  PIN'da atigi 10 000 variant). Brauzerda faqat sessiya tokeni (JWT) qoladi — baza ham, PIN ham brauzerga tushmaydi
  (hozirgi demoda F12 → Local Storage da hammaning PIN'i ko'rinadi).
- **Xodim tokendan olinadi** — `cashierId`, `createdBy`, `adminId`, `userId` so'rov tanasidan o'qilmaydi.
- **Huquqlar:** "Tayyor" / "Qaytarish" — filialning oshpaz yordamchisi; kiosk / online buyurtmani qabul qilish —
  filial kassiri (ochiq smenasi bilan); bekor qilish — filial kassiri yoki admin; kirim — ta'minotchi, tasdiqlash — admin.
- **TV va kiosk PINsiz va kodsiz** (qaror o'zgardi — qurilma kaliti, 6 xonali ulash kodi va Admin → Qurilmalar olib
  tashlandi): kirish ekranida filial tanlanadi → `/tv/<filial>`, `/kiosk/<filial>`. TV navbati va kiosk buyurtmasi —
  ochiq endpoint'lar, filial so'rovda (`branchId`); noma'lum yoki faol bo'lmagan filial — `not_found`.
- **Mobil buyurtma** — dostavkada koordinata majburiy (GPS), filialni server `routeDelivery` bilan tanlaydi. Buyurtma
  yaratilganda server `orderToken` qaytaradi — ilova holatni va `order:<id>` xonasini faqat shu bilan oladi (birovning
  buyurtmasini id bo'yicha ko'rib bo'lmasin).

Veb ilova backend'ga tayyorlab yozilgan; backend shu loyihadagi tayyor qismlarga tayanadi:

- **Ma'lumotlar modeli** — `src/domain/types.ts` (`Db` dagi har bir ro'yxat — jadval / entity). Boshlang'ich va demo
  ma'lumot — `src/data/seed.ts`, `src/data/history.ts`.
- **Biznes mantiq** — `src/domain/logic/*`: toza TypeScript funksiyalar (`db` → yangi `db` + natija), React'ga
  bog'liq emas — NestJS servislariga deyarli o'zgarishsiz ko'chadi. Tekshiruvi — `scripts/logic-smoke.ts`
  (`npm run test:logic`); backend'da ham shu holatlar test bo'lsin.
- **API ro'yxati** — `src/api/index.ts`: komponentlar faqat shu buyruqlarni chaqiradi (Promise qaytaradi). Backend
  tayyor bo'lganda shu fayl HTTP so'rovlarga almashtiriladi, sahifalar o'zgarmaydi. O'qish hozir `useDb()` orqali
  (butun baza) — backend'da ro'yxat / filtr endpoint'lari kerak bo'ladi.
- **Jonli yangilanish — WebSocket (kelishilgan).** Hozir ekranlar tablar orasida localStorage orqali sinxronlanadi
  (`src/api/db.ts`); backend'da uning o'rnini Socket.IO egallaydi (`@nestjs/websockets` + `@nestjs/platform-socket.io`).
  - **Qayerda:** kassa (kiosk / online'dan yangi buyurtma, "Tayyor" holati), oshxona (yangi to'langan buyurtma), TV
    (raqam darhol "Tayyor"ga o'tishi), mobil ilova — ochiq bo'lsa WebSocket, yopiq bo'lsa push xabar (Expo / FCM).
    Kiosk, admin va omborga shart emas — sahifa ochilganda yuklanadi (kiosk menyusi — bosh ekranga qaytganda).
  - **Buyruqlar — REST** (masalan `POST /orders/:id/ready`); socket faqat serverdan ekranlarga "o'zgardi" xabari,
    socket orqali buyruq yuborilmaydi.
  - **Xonalar (rooms) filial bo'yicha:** `branch:<id>` — kassa va oshxona, `tv:<id>` — TV, mobil ilova — o'z
    buyurtmasiniki. Bir filial voqeasi boshqasiga bormaydi.
  - **TV va kiosk PINsiz** — ularga mijoz ma'lumoti (ism, telefon, manzil) yuborilmaydi. TV kanaliga faqat raqam, tur
    va holat, faqat `showsOnTv` dan o'tgan buyurtmalar — filtr serverda.
  - **Qayta ulanganda** ro'yxat REST'dan qaytadan olinadi (uzilish paytidagi xabarlar yo'qolgan bo'lishi mumkin).
  - Ulanishda tekshiruv: xodim — kirish tokeni bilan; TV — faqat filial (`{ tvBranchId }`, kalitsiz — kanalda mijoz
    ma'lumoti yo'q).
  - Hozircha bitta server yetadi; bir nechta server bo'lsa — Redis adapter.
  - SSE va polling tanlanmadi: React Native'da SSE o'zi yo'q (alohida kutubxona kerak), polling — kechikish va ortiqcha
    yuklama (kassaga yangi buyurtma darhol kelishi kerak).
- **Kirish** — ish joyi → filial → xodim → PIN (`src/api/session.ts`); rollar: admin, cashier, kitchen (oshpaz
  yordamchisi), supplier. TV, kiosk va mobil ilova — PINsiz (kiosk va TV filialga bog'langan). Buyruqlarda rol
  tekshiruvi serverda ham bo'lsin: masalan "Tayyor" / "Qaytarish" — faqat shu filialning oshpaz yordamchisi (`forbidden`).
- **Tranzaksiya kerak joylar** — buyurtma raqami (har filialda har kuni 1 dan, `counters`), buyurtmada ombordan
  ayirish va bekor qilinganda qaytarish, kirimni tasdiqlash, ko'chirish.
- **Yetkazib berish** — filialni server o'zi hisoblaydi (`routeDelivery`), mobil ilova yuborgan filialga ishonilmaydi.
- Mobil ilova (Android / iOS) ham shu backend'ga ulanadi.

## 1. Mobil ilova (Android / iOS)

**Texnologiya — kelishilgan (2026-10-27):** Android — **Kotlin + Jetpack Compose** (alohida sessiyada boshlanadi).
iOS — keyin hal qilinadi. `src/domain` dagi mantiq Kotlin'ga o'tmaydi — hamma hisob (filialni tanlash, narx, hudud
narxi, ochiq / yopiq) serverda, ilova faqat natijani ko'rsatadi. Jonli holat — Socket.IO (`io.socket:socket.io-client`),
ilova yopiq bo'lsa — FCM push. API tavsifi — `NestJS_NYFF/API.md`.

**Holat (2026-10-27):** Android ilova yozildi — `C:\BACKEND APPS\Kotlin_NYFF` (`PLAN.md`): quyidagi oqim (xarita + GPS,
filialni server tanlaydi, jonli holat, filialga o'tkazish, tarix), 3 til, yorug' / tungi mavzu; emulyatorda lokal
backend bilan tekshirilgan. Qolgani: haqiqiy API manzili, FCM push, Click, iOS.

- **Taomga izoh olib tashlandi (2026-10-27, veb + server).** Izoh faqat butun buyurtmaga. Android'da savat qatoridagi
  izoh maydoni (`Cart.kt`, `CheckoutScreen` / `CheckoutViewModel`, `OrderLineRequest.note`) hali bor — server uni jimgina
  tashlaydi, mijozning yozgani yo'qoladi. Android sessiyasida olib tashlash kerak (kerak bo'lsa — buyurtma izohiga).

- **Backend** — ilovadagi buyurtma kassaga tushishi uchun shart; avval backend qilinadi (0-bo'lim).
- **Kuryer ilovasi — yozildi, keyin mijoz ilovasiga birlashtirildi (2026-10-27).** Kuryer qismi `Kotlin_NYFF` ichida
  (`courier/` paketi): bosh sahifadagi "NY" belgisiga 10 marta bosib ochiladi, **login va parol** bilan kiriladi (admin
  "Xodimlar" da ochadi, ismlar ro'yxati yo'q); kuryer kirgan bo'lsa ilova har safar kuryer ekranida ochiladi. Eski
  alohida loyiha `Kotlin_NYFF_Courier` hozircha papkada turadi (yangi backend bilan kira olmaydi). Funksiyalar: "Ishdaman", "Yangi" / "Meniki" /
  "Bugun", kartochka (mijoz, qo'ng'iroq, manzil, Google Maps / Yandex, taomlar, olinadigan pul), "Olaman" →
  "Yo'lga chiqdim" → "Yetkazildi" / "Yetkazib bo'lmadi", ilova ichidagi xarita, bildirishnoma (ilova tirik paytda).
  Kelishilgan qarorlar:
  - kuryer bir nechta filialda ishlaydi, lekin **bir vaqtda faqat bitta filialdan** oladi; soni cheklanmagan;
    "Yangi" ro'yxatida avval filialni tanlaydi (tayyorlanayotgan va tayyor dostavkalar);
  - dostavka **faqat online** (mobil ilova) — kassada ochilgan "Dostavka" kuryerga tushmaydi;
  - yetkazish **tartibini server taklif qiladi** (mijozlar o'rtacha eng kam kutadigani), masofa to'g'ri chiziq (bepul);
    kuryer tartibni o'zgartira olmaydi;
  - mijozga faqat holat — "Kuryer yo'lda", "Yetkazildi" (kuryer kimligi, navbati yo'q);
  - naqd: kuryer kassaga o'zidan to'laydi, keyin mijozdan oladi;
  - "Yetkazib bo'lmadi" — filialga qaytadi yoki telefonda admin bilan gaplashadi; kassada "Dostavka" ro'yxatida
    "Kuryerdan olish" (yana kuryerlarga) yoki bekor qilish;
  - kuryer haqi va jonli joylashuvi — hozircha yo'q.
  Backend — `/courier/*`, `GET /orders/delivery`, `release-courier` (`API.md` 12); web — Xodimlar'da "Kuryer" roli,
  kassada "Dostavka" tugmasi va paneli, adminda buyurtma tafsilotida kuryer bosqichlari; mijoz ilovasi — 4 bosqichli
  dostavka. Keyin: FCM push (ilova yopiq bo'lsa ham yangi buyurtma).

**Kelishilgan oqim:**

- **Yetkazib berish:** mijoz joylashuvini GPS yoki xaritada pin bilan belgilaydi, filialni tizim o'zi tanlaydi
  (`routeDelivery`, `src/domain/logic/delivery.ts`) — mijoz filial tanlamaydi. Uy, xonadon, mo'ljal — matn bilan.
  - hudud ichida — o'sha filial, filial hududining narxi bilan;
  - hudud egasi yopiq (smena yopiq yoki admin to'xtatgan) — zaxira filial, u ham yopiq bo'lsa eng yaqin ochiq filial;
  - hech qaysi hududda emas — eng yaqin ochiq filial, yetkazish narxini kuryer aytadi (tizimga yozilmaydi);
  - hech bir filial ochiq emas — "Hozir buyurtma qabul qilmayapmiz".
- **Olib ketish:** filialni mijoz tanlaydi; yopiq filialni tanlab bo'lmaydi.
- Filialni **server ham qayta hisoblaydi** — ilova yuborgan filialga ishonilmaydi.
- **Buyurtma holati — faqat ilovada.** Online buyurtmalar TV ga chiqmaydi (`showsOnTv`). Oshpaz yordamchisi "Tayyor"
  bosganda (`ready`) ilovada: dostavkada — "Tayyor · Kuryer olib ketadi" (keyin kuryer bosqichlari: "Kuryer yo'lda",
  "Yetkazildi"), olib ketishda — "Tayyor! Filialdan oling".
  Holat o'zgarishi ilovaga darhol yetib borsin (push yoki WebSocket). Webdagi telefon ramkali prototip
  (`/mobile/android`, `/mobile/ios`) 2026-10-27 da olib tashlandi — ilova alohida yoziladi.

## 2. Buyurtma, kassa, kuryer

- Mobil buyurtmada mijoz koordinatasi saqlanadi (`OnlineInfo.location`).
- Hudud narxi buyurtma summasiga, chekka va hisobotga qo'shiladi; hududdan tashqaridagi kuryer summasi yozilmaydi.
- Kassa va admin buyurtma kartochkasida — **"Google Maps'da ochish"** va **"Yandex"** havolalari. Ikkalasi kalitsiz,
  bepul, limitga kirmaydi; marshrutni kuryer telefonidagi ilova o'zi chizadi:
  - `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>`
  - `https://yandex.uz/maps/?rtext=~<lat>,<lng>&rtt=auto`
- **80 mm chekda joylashuv QR kodi** — kuryer telefon bilan skanerlaydi, Google Maps marshrut bilan ochiladi.
- **Filial online buyurtma oladimi (kelishilgan 2026-10-27).** Hozir faqat smenaga qaraladi (`branchOnlineState`):
  kassir smenani yopmay ketsa ("Smenani topshirasizmi?" → "Yo'q", brauzer yopildi, kompyuter o'chdi) filial tun bo'yi
  "ochiq" ko'rinadi va buyurtmani hech kim qabul qilmaydi. Endi filial ochiq — hammasi bajarilsa:
  - faol va admin to'xtatmagan, kamida bitta kassir smenasi ochiq (hozirgidek);
  - **kamida bitta kassa ekrani hozir ulangan** (Socket.IO — faqat backend'da). Kassa uzilsa ~1 daqiqa kutiladi
    (Wi-Fi bir lahza uzilishi hisobga olinmasin), keyin online qabul o'zi to'xtaydi;
  - **ish vaqti ichida.** Har filialda Admin → Filiallar da belgilanadi: ochilish va yopilish soati (masalan
    10:00–23:00; yarim tundan o'tishi mumkin — 18:00–03:00), `Asia/Tashkent` bo'yicha; `Branch.workHours:
    { open, close } | null`. **Belgilanmagan (`null`) — 24/7:** vaqt cheklovi yo'q, qolgan shartlar bajarilsa qabul
    qilinaveradi. Ish vaqti faqat online (mobil) buyurtmaga ta'sir qiladi — kassa va kiosk smena ochiq bo'lsa
    ishlayveradi. Mobil ilovada yopiq filial yonida — "Yopiq · 10:00 da ochiladi";
  - admin sahifalari va xaritadagi holat belgisiga yangi holatlar: "kassa ulanmagan", "ish vaqtidan tashqari".
- **Qabul muddati — 5 daqiqa (kelishilgan 2026-10-27).** Mobil buyurtma 5 daqiqada qabul qilinmasa yoki shu orada
  filial smenasi yopilsa (muddat va o'tkazish — serverda, taymer bilan; kassir yo'q bo'lsa ham ishlaydi):
  - **dostavka** — boshqa ochiq filialga o'tadi: zaxira filial, u ham yopiq bo'lsa eng yaqin ochiq (`routeDelivery`,
    shu filialni hisobga olmasdan), o'sha filialda yangi raqam bilan; mijozga ilovada xabar;
  - **olib ketish** — filialni mijoz o'zi tanlagan, boshqa joyga yuborilmaydi: buyurtma bekor qilinadi, ilovada
    "Filial javob bermadi — boshqa filialni tanlang";
  - o'tkaziladigan ochiq filial yo'q — bekor, "Hozir buyurtma qabul qilmayapmiz";
  - buyurtma bir martadan ko'p o'tkazilmaydi (filiallar orasida aylanib yurmasin): ikkinchi filial ham 5 daqiqada
    qabul qilmasa — bekor;
  - Click bilan oldindan to'langan buyurtma bekor bo'lsa — pul qaytarilishi kerak (Click ulanganda hal qilinadi).

## 3. Google Maps: xarajat va xavfsizlik

- **Billing yoqiladi** (busiz xaritada "For development purposes only" pardasi turadi), har bir API ga **kunlik limit**
  (Quotas) va **Budget alert** qo'yiladi — limitga yetsa xizmat to'xtaydi, pul yechilmaydi.
- **Bepul:** ilovadagi xarita (Maps SDK for Android / iOS — cheksiz), GPS, filialni tanlash (o'z hisobimiz),
  Google Maps / Yandex havolalari. Admin paneldagi xarita (Maps JavaScript API) — oyiga ~10 000 ochilishgacha bepul.
- **Pullik — hozircha ishlatilmaydi:** Routes (marshrut), Places (manzilni yozib qidirish), Geocoding (pindan manzil
  matni). Kerak bo'lsa keyin qo'shiladi (har biri oyiga ~10 000 so'rovgacha bepul).
- **Kalit — bitta (qaror qabul qilingan):** hozirgi cheklovsiz (None) kalit veb, Android va iOS da ishlatiladi; API
  ro'yxatida Maps JavaScript API, Maps SDK for Android va Maps SDK for iOS (qo'shib qo'yilgan). Himoya — kunlik limit va
  Budget alert. Kalit begona joyda ishlatilayotgani sezilsa — Android / iOS uchun alohida, ilova nomi bilan cheklangan
  kalitlarga o'tiladi.
- Bepul limitni bir nechta hisob / loyiha bilan aylanib o'tish — Google shartlariga zid, qilinmaydi.
- Karta ulanmasa — admin xaritasini OpenStreetMap (Leaflet) ga o'tkazish mumkin; hududlar koordinata bo'lib
  saqlanadi, o'zgarmaydi.

## 4. Taklif qilingan, hali kelishilmagan

- Ishlatilmagan ombor mahsulotini o'chirish (hozir faqat "faol emas" qilinadi).
- Filial yarim tundan keyin ham ishlasa — buyurtma raqami "ish kuni" boshlanish soatidan qayta boshlansin.
- Admin → Buyurtmalar: oyna o'rniga ichma-ich sahifa (Smenalardagidek).
- Kassadagi ochiq tiketlar sahifa yangilanganda saqlansin.
- "Kechikkan" buyurtma chegarasi (hozir 15 daqiqa) sozlanadigan bo'lsin.

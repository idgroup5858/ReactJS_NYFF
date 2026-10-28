# New York Fast Food — ReactJS_NYFF

Ko'p filialli fast-food tizimining UI qismi: kassa, oshxona (oshpaz yordamchisi), TV navbat ekrani, kiosk, ombor
(ta'minotchi) va admin panel. Ma'lumotlar va hamma qoidalar — backend'da: `C:\BACKEND APPS\NestJS_NYFF` (NestJS +
PostgreSQL, 3000-port; API — o'sha papkadagi `API.md`). Web ilova faqat ko'rsatadi: o'qish — REST, jonli yangilanish
(kassa, oshxona, TV, mobil buyurtma holati) — Socket.IO.

Stek: React 19, Vite 8, TypeScript 6, Tailwind CSS 4, react-router 8, lucide-react, SweetAlert2, socket.io-client,
@vis.gl/react-google-maps (yetkazib berish xaritasi).
Til: o'zbek, rus, ingliz (taom va mahsulot nomlari ham uch tilda). Ranglar — sariq + qora (New York taksisi).

## Ishga tushirish

Avval backend (`C:\BACKEND APPS\NestJS_NYFF` → `npm run start:dev`, 3000-port), keyin:

```bash
npm install
npm run dev          # http://localhost:5173 — /api va /socket.io backend'ga (3000) uzatiladi
npm run build        # dist/ — tayyor ilovani backend o'zi beradi (http://localhost:3000)
npm run lint
```

Backend boshqa serverda bo'lsa — `.env` da `VITE_API_URL=http://<server>:3000`.

### Google Maps kaliti

Admin → Filiallar → **Yetkazib berish xaritasi** Google Maps'da ishlaydi. Loyiha ildizidagi `.env` fayliga (git'ga
tushmaydi) kalit yoziladi va `npm run dev` qayta ishga tushiriladi:

```
VITE_GOOGLE_MAPS_API_KEY=...
```

Kalitga Google Cloud'da **Maps JavaScript API** yoqilgan va Billing ulangan bo'lishi kerak. GitHub Pages uchun — repo →
Settings → Secrets and variables → Actions → `GOOGLE_MAPS_API_KEY`. Kalit bo'lmasa xarita o'rnida izoh chiqadi, qolgani
ishlayveradi.

## Demo kirish

| Ish joyi | Filial | Xodim | PIN |
| --- | --- | --- | --- |
| Kassa | Chilonzor | Dilnoza / Sardor | 1234 / 4321 |
| Kassa | Yunusobod | Malika / Jasur | 1234 / 4321 |
| Oshxona | Chilonzor / Yunusobod | Aziz / Kamola | 1111 |
| Ombor | — | Bekzod | 5555 |
| Admin panel | — | Admin | 0000 |
| Navbat ekrani, Kiosk | istalgan faol filial | — | PINsiz va kodsiz |

Mijozning mobil ilovasi (Android — Kotlin + Jetpack Compose, iOS) webda yo'q — alohida loyiha, backend'ning `/mobile`
API'si bilan (`NestJS_NYFF/API.md`). Uning buyurtmalari kassadagi **«Online»** ro'yxatiga tushadi.

PIN serverda tekshiriladi (5 marta xato — 5 daqiqa blok); brauzerda faqat sessiya tokeni qoladi — har bir tabda alohida
(sessionStorage): bir tabda kassa, boshqasida kiosk, uchinchisida TV ochib, buyurtma oqimini jonli ko'rish mumkin.
**TV va kiosk PINsiz va kodsiz**: kirish ekranida Navbat ekrani / Kiosk → filial tanlanadi → ekran shu filial uchun
ochiladi (`/tv/<filial>`, `/kiosk/<filial>` — manzilni TV / kiosk brauzerida saqlab qo'yish mumkin). Admin → Filiallar
kartochkasida ham shu ikki havola bor.
Demo ma'lumot serverda (backend `npm run seed`): o'tgan 30 kunlik savdo tarixi, bugungi faol buyurtmalar, kirim /
ko'chirish hujjatlari va kommunal to'lovlar. Admin → Hisobotlar → **"Demo ma'lumotlarni tiklash"** server bazasini
boshlang'ich holatga qaytaradi (faqat backend `DEMO=1` bo'lsa).

## Bosqichlar

1. ✅ Karkas: modellar, soxta api, boshlang'ich ma'lumotlar, kirish ekrani
2. ✅ Kassa — rasmli kategoriyalar (chapda / tepada), ixcham savat (soni, buyurtmaga izoh; taomga alohida izoh yo'q),
   buyurtma turi (zalda / olib ketish — dostavka faqat mobil ilovadan), jami summa "To'lash" tugmasida, to'lov
   (naqd — qaytim bilan / karta / Click), buyurtma raqami, 80 mm chek (oshxona shu qog'ozdan tayyorlaydi), buyurtmalar
   paneli (kioskdan kelgan to'lanmaganlar — pulini olib tasdiqlash; tayyorlanayotganlar va tayyor bo'lganlar — faqat
   kuzatish; bekor qilish, chekni qayta chiqarish, smena tushumi), PIN almashtirish, 5 daqiqa harakatsizlikda blok,
   smenani topshirish va hisobot
3. ✅ Oshxona chekdan ishlaydi. **Oshpaz yordamchisi** (`/oshxona`, filialga bog'langan, PIN bilan) ovqatni olib chiqib
   "Tayyor" bosadi, adashganini "Qaytarish" — buni faqat u qila oladi, kassir holatni kuzatadi. Ekrani TV tuzilishida:
   chapda tayyorlanayotganlar — kartochkalar to'ri butun kenglik bo'ylab, o'ngda tayyorlar bitta ustunda; yangisi
   navbat oxiriga qo'shiladi.
   **TV navbat** — "Tayyorlanmoqda" (ekranning 60 %) va "Tayyor" (40 %) ustunlari, zaldan ko'rinadigan katta raqam + buyurtma
   turi; faqat kassa va kioskdagi zalda / olib ketish buyurtmalari (dostavka va mobil ilovadagilar chiqmaydi), yangi tayyor raqam miltillaydi, to'liq ekran; nechta raqam sig'ishi ekran o'lchamidan hisoblanadi, sig'maganlari —
   "yana N ta"; tayyor raqam 5 daqiqadan keyin o'zi tushadi
4. ✅ Kiosk — bosh ekran (til, "Shu yerda / Olib ketaman"), menyu (qidiruv, kategoriyalar, tarkibi), taom oynasi
   (soni), savat, to'lov (karta / Click — demo, yoki "kassada to'layman" — buyurtma kassirni kutadi), katta raqam; 90 soniya harakatsizlikda "Hali shu yerdamisiz?"
   Mobil ilova buyurtmasi filial kassasidagi **«Online»** ro'yxatiga tushadi, kassir "Qabul qilish" bosgach oshxonaga
   ketadi (ilovaning o'zi — alohida loyiha; webdagi telefon ramkali prototip olib tashlandi).
5. ✅ Ombor — qoldiqlar (guruhlar bo'yicha kartochkalar to'ri; ombor tanlash, qidiruv, ogohlantirish chegarasini tahrirlash,
   harakatlar tarixi, "To'ldirish"), kirim (admin tasdiqlaguncha omborga qo'shilmaydi), ko'chirish (qoldiqdan ko'p
   bo'lmaydi), ombor mahsulotlari (kartochkalar to'ri)

Admin panel va omborda bo'limlar — chapda yig'iladigan menyuda (yig'ilganda faqat ikonkalar); admin ikkala guruhni
(boshqaruv + ombor) doim ko'radi.
6. ✅ Admin panel — hisobotlar (bugun / kecha / 7 / 30 kun / tanlangan davr, filial; tushum, buyurtmalar, o'rtacha chek,
   kommunal, natija; kunlik / soatlik diagramma; to'lov, tur, manba, filial, top taomlar), kirimlarni tasdiqlash (oxirgi narx
   avtomatik), menyu (kategoriya, taom, narx, retsept, tartib, filialda vaqtincha sotuvdan olish), filiallar, xodimlar,
   chiqimlar.
   **Yetkazib berish hududlari** (Filiallar → xarita): har bir filialning joyi va hududi (poligon) chiziladi, hudud narxi,
   zaxira filial, «Online qabul qilish» tugmasi; «Tekshirish» — xaritani bosib, buyurtma qaysi filialga tushishini ko'rish
7. ✅ Backend — `C:\BACKEND APPS\NestJS_NYFF`: shu loyihadagi model, mantiq va demo ma'lumot PostgreSQL'ga ko'chirildi
   (xato kodlari bir xil), REST + Socket.IO, PIN bilan kirish (bcrypt, urinishlar chegarasi), PINsiz TV / kiosk,
   mobil buyurtma (filialni server GPS bo'yicha tanlaydi), online qabul qoidasi (smena + kassa ulangan + ish vaqti) va
   5 daqiqalik qabul muddati. Reja va holat — o'sha papkadagi `PLAN.md`, API — `API.md`.
8. ✅ Web ilova backend'ga ulandi — localStorage bazasi, demo ma'lumot va brauzerdagi mantiq olib tashlandi; o'qish —
   REST (kesh, saqlashdan keyin yangilanadi), kassa / oshxona / TV / mobil holati — Socket.IO. TV va kiosk — PINsiz va
   kodsiz (kirish ekranida filial tanlanadi), filiallarda ish vaqti, mobil prototipda GPS / xarita bilan dostavka va
   jonli kuzatish, admin buyurtma va smenalarini server filtrlaydi.

Keyinga qoldirilgan: mijoz mobil ilovasi, kuryer, AI skladchi, kamera bilan stol nazorati, chek printer, TV ovozi.
Kelishilgan keyingi ishlar (mobil ilova, backend, kuryer havolalari, Google Maps xarajati) — [docs/ROADMAP.md](docs/ROADMAP.md).

## Ko'rinish

"Yumshoq" uslub (mobil ilova andozalaridan): qora header, och fon, chegarasiz oq kartochkalar (radius 12px, rasm atrofida
4px), yengil soya, kassada chap oq panelda kategoriyalar ro'yxati (kichik rasm + nom + taomlar soni), sariq kvadrat "+"
tugmalar; ranglar — sariq + qora. Shakllar `src/styles/global.css` dagi tokenlarda (`rounded`, `rounded-card`,
`rounded-media`, `rounded-chip`, `surface`, `shadow-card`, `title-section`) — ko'rinishni o'zgartirish uchun shu qiymatlar
o'zgartiriladi.

Ikkinchi mavzu — **GoMeal** (themeforest "GoMeal" andozasidan): Poppins shrifti (ruscha matn — Montserrat), och kulrang fon,
soyasiz oq kartochkalar, kattaroq yumaloqlik, oltin-sariq aksent, sariq valyuta ("32 000 **so'm**"), nuqtasiz sarlavhalar,
ichi bo'sh holat belgilari, tanlangan kategoriya / bo'lim — sariq to'ldirilgan. Header qora qoladi.

Uchinchi mavzu — **Zamonaviy**: sovuq kulrang fon, kategoriyalar 3D ikonkali "chip"lar (tepada — to'r bo'lib), taom rasmi
kulrang qutida, savatdagi taom — to'q sariq chegara va chap burchakda soni, pastda "Qo'shish" tugmasi. Kategoriya ikonkasi
Admin → Menyu → kategoriya oynasida tanlanadi (`public/images/icons` — Microsoft Fluent Emoji 3D, MIT).

Standart (yangi qurilmada, TV va kioskda ham): **GoMeal** + rangli 3D ikonkalar.

**Taom rasmlari** (mavzudan alohida): «Butunligicha» (standart — rasm to'liq ko'rinadi, shishalar va fonsiz PNG uchun)
yoki «To'ldirish» (ramkani to'ldiradi, chetlari qirqiladi). Kioskning dumaloq bezak rasmlari doim to'ldiriladi.

Almashtirish: header'dagi palitra tugmasi yoki Kassa → Sozlamalar → Ko'rinish (shu qurilmada saqlanadi). Tokenlar —
`global.css` dagi `:root[data-theme="…"]`, komponentlardagi farqlar — `gomeal:` / `modern:` variantlari.

## Ma'lumotlar modeli (`src/domain/types.ts` — backend javoblari bilan bir xil)

Qoidalarning o'zi backend'da (`NestJS_NYFF/src/domain`, `src/*/…service.ts`); bu yerda — qisqacha mazmuni.

- **Filial → ombor**: har bir filialning o'z ombori + bitta markaziy ombor. Yangi filialga ombor avtomatik ochiladi.
- **Yetkazib berish**: filial online buyurtma oladi, agar faol bo'lsa, admin to'xtatmagan bo'lsa, ish vaqti ichida
  bo'lsa (belgilanmagan — 24/7), smena ochiq va kassa ekrani ulangan bo'lsa. Manzil ochiq filial hududida → o'sha
  filial, hudud narxi bilan; hudud egasi yopiq → zaxira filial (u ham yopiq bo'lsa — eng yaqin ochiq); hech qaysi
  hududda emas → eng yaqin ochiq filial, narxni kuryer aytadi (tizimga yozilmaydi); hech kim ochiq emas → buyurtma
  qabul qilinmaydi. Mobil buyurtma 5 daqiqada qabul qilinmasa — dostavka boshqa filialga o'tadi, olib ketish bekor.
- **Taom → retsept**: taom sotilganda retseptdagi mahsulotlar (g / ml / dona) filial omboridan avtomatik ayriladi;
  buyurtma bekor qilinsa aynan o'sha miqdor qaytadi.
- **Buyurtma**: filialda har kuni 1 dan boshlanadigan raqam; turi (zalda / olib ketish / dostavka), manbasi (kassa / kiosk),
  holati `pending` (kioskdan, kassada to'lanmagan) `→ preparing` (to'langan, chek oshxonada) `→ ready` (oshpaz
  yordamchisi "Tayyor" bosdi) yoki `cancelled` (kassir); `ready → preparing` ni ham faqat oshpaz yordamchisi qaytaradi.
  To'lanmagan kiosk buyurtmasi ombor va hisobotga tegmaydi.
- **Kirim**: ta'minotchi kiritadi → admin narxni kiritib tasdiqlamaguncha omborga qo'shilmaydi; oxirgi narx keyingi kirimda
  avtomatik yoziladi. Ombor mahsulotining narxini admin mahsulot oynasida ham kiritadi / to'g'rilaydi (yangi mahsulotda
  ham); ta'minotchi narxni faqat ko'radi.
- **Taom narxi**: barcha filiallarda bir xil — taom oynasida kiritiladi. Filial bo'yicha faqat "vaqtincha sotilmaydi"
  (masalan, mahsuloti tugasa): Menyu sahifasida har taom ostidagi filial tugmachasi yoki taom oynasida. Yangi filial
  hamma taomni o'sha narxda sotadi.
- **Qoldiq** asosiy birlikda butun son (g / ml / dona); kirim va ko'chirish hujjatlari odam kiritgan birlikda (kg / l / dona).
- **Chiqim**: hozircha faqat kommunal (svet, gaz, suv, internet, boshqa) — hisobotda tushumdan ayriladi.

## Tuzilma

```
src/
  domain/        modellar (backend javoblari), birliklar, sanalar, geometriya, xato kodlari, ekran qoidalari (rules.ts)
  api/           backend bilan: http (xatolar, token), query (kesh), queries (o'qish hook'lari), index (buyruqlar),
                 session (PIN bilan kirish, token), realtime (Socket.IO)
  i18n/          uz / ru / en lug'atlari
  store/         qurilma sozlamalari (til, kassa kategoriyalari joyi, oxirgi filial)
  components/    layout (header), ui, menu (kategoriya va taom kartochkalari), order
  pages/         login, kassa, kitchen, tv, kiosk, warehouse, admin
public/images/   taom va kategoriya rasmlari — manbalari va litsenziyalari CREDITS.json da (backend ham shu yerdan beradi)
```

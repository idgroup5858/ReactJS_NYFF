# New York Fast Food — ReactJS_NYFF

Ko'p filialli fast-food tizimining UI qismi: kassa, TV navbat ekrani, kiosk, ombor (ta'minotchi) va admin panel.
Hozircha **backend yo'q** — ma'lumotlar brauzer xotirasida (localStorage) saqlanadi, barcha o'zgarishlar bitta "api"
qatlami orqali o'tadi; NestJS tayyor bo'lganda faqat shu qatlam almashtiriladi.

Stek: React 19, Vite 8, TypeScript 6, Tailwind CSS 4, react-router 8, lucide-react, SweetAlert2.
Til: o'zbek, rus, ingliz (taom va mahsulot nomlari ham uch tilda). Ranglar — sariq + qora (New York taksisi).

## Ishga tushirish

```bash
npm install
npm run dev          # http://localhost:5173 (port band bo'lsa xato beradi — boshqa portga o'tib ketmaydi)
npm run build
npm run lint
npm run test:logic   # biznes mantiq testi (brauzersiz, Node 24)
```

## Demo kirish

| Ish joyi | Filial | Xodim | PIN |
| --- | --- | --- | --- |
| Kassa | Chilonzor | Dilnoza / Sardor | 1234 / 4321 |
| Kassa | Yunusobod | Malika / Jasur | 1234 / 4321 |
| Ombor | — | Bekzod | 5555 |
| Admin panel | — | Admin | 0000 |
| Navbat ekrani, Kiosk | filial tanlanadi | — | PINsiz |

Sessiya har bir tabda alohida (sessionStorage): bir tabda kassa, boshqasida kiosk, uchinchisida TV ochib, buyurtma oqimini
jonli ko'rish mumkin — baza (localStorage) tablar orasida darhol sinxronlanadi.
Demo bazada o'tgan 30 kunlik savdo tarixi, bugungi faol buyurtmalar (kassa va TV bo'sh turmaydi), kirim / ko'chirish
hujjatlari va kommunal to'lovlar bor. Admin → Hisobotlar → **"Demo ma'lumotlarni tiklash"** bazani boshlang'ich holatga qaytaradi.

## Bosqichlar

1. ✅ Karkas: modellar, soxta api, boshlang'ich ma'lumotlar, kirish ekrani
2. ✅ Kassa — rasmli kategoriyalar (chapda / tepada), savat (soni, taomga izoh, buyurtmaga izoh), buyurtma turi, to'lov
   (naqd — qaytim bilan / karta / Click), buyurtma raqami, 80 mm chek (oshxona shu qog'ozdan tayyorlaydi), buyurtmalar
   paneli (kioskdan kelgan to'lanmaganlar — pulini olib tasdiqlash; tayyorlanayotganlar — ovqat kelganda "Tayyor", adashganini
   qaytarish; bekor qilish, chekni qayta chiqarish, smena tushumi), PIN almashtirish, 5 daqiqa harakatsizlikda blok,
   smenani topshirish va hisobot
3. ✅ Alohida oshxona ekrani yo'q — oshxona chekdan ishlaydi, tayyor ovqatni kassaga olib keladi.
   **TV navbat** — "Tayyorlanmoqda" (ekranning 60 %) va "Tayyor" (40 %) ustunlari, zaldan ko'rinadigan katta raqam + buyurtma
   turi, yangi tayyor raqam miltillaydi, to'liq ekran; nechta raqam sig'ishi ekran o'lchamidan hisoblanadi, sig'maganlari —
   "yana N ta"; tayyor raqam 5 daqiqadan keyin o'zi tushadi
4. ✅ Kiosk — bosh ekran (til, "Shu yerda / Olib ketaman"), menyu (qidiruv, kategoriyalar, tarkibi), taom oynasi (soni,
   izoh), savat, to'lov (karta / Click — demo, yoki "kassada to'layman" — buyurtma kassirni kutadi), katta raqam; 90 soniya harakatsizlikda "Hali shu yerdamisiz?"
5. ✅ Ombor — qoldiqlar (guruhlar bo'yicha kartochkalar to'ri; ombor tanlash, qidiruv, ogohlantirish chegarasini tahrirlash,
   harakatlar tarixi, "To'ldirish"), kirim (admin tasdiqlaguncha omborga qo'shilmaydi), ko'chirish (qoldiqdan ko'p
   bo'lmaydi), ombor mahsulotlari (kartochkalar to'ri)

Admin panel va omborda bo'limlar — chapda yig'iladigan menyuda (yig'ilganda faqat ikonkalar); admin ikkala guruhni
(boshqaruv + ombor) doim ko'radi.
6. ✅ Admin panel — hisobotlar (bugun / kecha / 7 / 30 kun / tanlangan davr, filial; tushum, buyurtmalar, o'rtacha chek,
   kommunal, natija; kunlik / soatlik diagramma; to'lov, tur, manba, filial, top taomlar), kirimlarni tasdiqlash (oxirgi narx
   avtomatik), menyu (kategoriya, taom, retsept, tartib), filial narxlari, filiallar, xodimlar, rasxodlar

Keyinga qoldirilgan: mijoz mobil ilovasi, kuryer, AI skladchi, kamera bilan stol nazorati, chek printer, TV ovozi.

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

Almashtirish: header'dagi palitra tugmasi yoki Kassa → Sozlamalar → Ko'rinish (shu qurilmada saqlanadi). Tokenlar —
`global.css` dagi `:root[data-theme="…"]`, komponentlardagi farqlar — `gomeal:` / `modern:` variantlari.

## Ma'lumotlar modeli (`src/domain/types.ts`)

- **Filial → ombor**: har bir filialning o'z ombori + bitta markaziy ombor. Yangi filialga ombor avtomatik ochiladi.
- **Taom → retsept**: taom sotilganda retseptdagi mahsulotlar (g / ml / dona) filial omboridan avtomatik ayriladi;
  buyurtma bekor qilinsa aynan o'sha miqdor qaytadi.
- **Narx filial bo'yicha**: har bir filialda o'z narxi va "sotuvda bor/yo'q" belgisi.
- **Buyurtma**: filialda har kuni 1 dan boshlanadigan raqam; turi (zalda / olib ketish / dostavka), manbasi (kassa / kiosk),
  holati `pending` (kioskdan, kassada to'lanmagan) `→ preparing` (to'langan, chek oshxonada) `→ ready` (kassir "Tayyor"
  bosdi) yoki `cancelled`; kassir `ready → preparing` qaytara oladi. To'lanmagan kiosk buyurtmasi ombor va hisobotga tegmaydi.
- **Kirim**: ta'minotchi kiritadi → admin narxni kiritib tasdiqlamaguncha omborga qo'shilmaydi; oxirgi narx keyingi kirimda
  avtomatik yoziladi.
- **Qoldiq** asosiy birlikda butun son (g / ml / dona); kirim va ko'chirish hujjatlari odam kiritgan birlikda (kg / l / dona).
- **Rasxod**: hozircha faqat kommunal (svet, gaz, suv, internet, boshqa) — hisobotda tushumdan ayriladi.

## Tuzilma

```
src/
  domain/        modellar, birliklar, sanalar, xatolar
  domain/logic/  biznes mantiq — toza funksiyalar (buyurtma, ombor, kirim, ko'chirish, smena, xodim, filial, menyu,
                 rasxod, hisobot)
  data/          seed.ts — ma'lumotnomalar; history.ts — 30 kunlik tarix, bugungi buyurtmalar, hujjatlar, kommunal
  api/           soxta backend: baza (localStorage + tablar sinxroni), buyruqlar, sessiya
  i18n/          uz / ru / en lug'atlari
  store/         qurilma sozlamalari (til, kassa kategoriyalari joyi, oxirgi filial)
  components/    layout (header), ui, menu (kategoriya va taom kartochkalari), order
  pages/         login, kassa, tv, kiosk, warehouse, admin
public/images/   taom va kategoriya rasmlari — manbalari va litsenziyalari CREDITS.json da
scripts/         logic-smoke.ts
```

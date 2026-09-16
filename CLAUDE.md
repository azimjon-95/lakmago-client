# ⛔ LokmaGo (client) — O'ZGARMAS QOIDALAR (MAJBURIY O'QISH)

> **Bu fayl Claude Code tomonidan repoga kirganda AVTOMATIK o'qiladi.**
> Bu yerdagi qoidalar — muhokama predmeti EMAS. Ular haqiqiy moliyaviy
> zarar keltirgan xatolardan keyin yozilgan.

---

## 1-QOIDA (ENG MUHIM) — PUL YECHILMAGUNCHA BUYURTMA RESTORANGA BORMAYDI

Bu qoidaning asosiy qismi **backend**da (`lakmago-server/CLAUDE.md`),
lekin frontend ham uni buzishi mumkin.

### Frontend tomonidagi shartlar

**1. Savat to'lov tasdiqlanmaguncha TOZALANMAYDI.**

`src/pages/Cart/CartPage.jsx`, `confirmAndSubmit()`:
- Naqd to'lov → savat darhol tozalanadi (buyurtma restoranga ketdi)
- **Karta to'lovi → savat SAQLANADI**, `orderId` esa
  `src/lib/pendingPayment.js` orqali localStorage'ga yoziladi

Mijoz Click/Payme sahifasidan to'lamasdan qaytsa: savati joyida
qoladi, buyurtma esa `awaiting_payment` holatida turadi va
restoranga ko'rinmaydi.

**2. "Buyurtma qabul qilindi" deb ko'rsatmang.**

Karta to'lovi boshlangani — buyurtma qabul qilingani EMAS. Mijozga
to'lov tasdiqlanmaguncha buyurtma faol deb ko'rsatilmasligi kerak.

**3. `lib/pendingPayment.js` ga tegmang.**

Bu fayl mijoz to'lovdan qaytganda haqiqiy holatni serverdan
tekshirish uchun. U ko'p marta, real xatolardan keyin sozlangan.

### Nima uchun bu qoida yozilgan (real hodisa)

Mijoz karta bilan buyurtma berdi → to'lov sahifasini yopdi → **pul
yechilmadi** → lekin restoranga buyurtma yetib bordi → oshpaz taom
tayyorlab jo'natdi → **restoran zarar ko'rdi.**

---

## 2-QOIDA — Guest-first: ilova ochilishida hech narsa so'ralmaydi

Ism, familiya, telefon, manzil, geolokatsiya, Telegram kanaliga obuna —
**bularning HECH BIRI** ilova ochilganda so'ralmaydi.

`App.jsx` guest foydalanuvchini HECH QACHON bloklamasligi kerak —
na Telegram ichida, na brauzerda. Main Page har doim darhol ochiladi.

Auth va obuna faqat **transactional nuqtada** so'raladi:

| Hook | Modal | Qayerda |
|---|---|---|
| `useRequireAuth()` | `AuthGateModal` | CartPage, ReservationPage |
| `useRequireSubscription()` | `SubscriptionGateModal` | CartPage, ReservationPage |

Tartib MUHIM: `ensureAuth()` → keyin `ensureSubscription()`
(obuna endpointi auth talab qiladi).

---

## 3-QOIDA — Guest manzili auth'dan keyin yo'qolmasligi kerak

Guest holatida qo'shilgan manzil `'addr' + Date.now()` ko'rinishidagi
vaqtinchalik ID oladi (`store/user.js` → `addAddress()`), chunki
`POST /addresses` auth talab qiladi va guest uchun 401 qaytaradi.

**Auth tugagach:** avval `syncGuestAddresses()` (`src/lib/syncGuestAddresses.js`)
tempId manzillarni serverga saqlaydi, **keyingina** `loadAddresses()`
chaqiriladi.

⚠️ `loadAddresses()` manzillar ro'yxatini **to'liq almashtiradi**
(merge qilmaydi). Uni sinxronlashdan OLDIN chaqirish — guest
manzilini yo'q qiladi va `selectedAddress` `undefined` bo'lib,
checkout crash bo'ladi. Bu xato bir marta yuz bergan.

---

## 4-QOIDA — `useEffect([])` ichida store qiymatini closure'dan olmang

`App.jsx` dagi `applyProfile()` bir marta bu xatoga tushgan:
bo'sh dependency array ichidagi funksiya `currentUser`ni mount
paytidagi qiymatga "muzlatib" qo'ygan va keyingi o'zgarishlarni
ko'rmagan.

**To'g'ri usul:** `useUser.getState().user` — Zustand'dan
to'g'ridan-to'g'ri, render siklidan mustaqil o'qish.

---

## 5-QOIDA — i18n: 3 til har doim muvozanatda

`src/i18n/translations.js` — `uz`, `uzc`, `ru` bloklarida kalitlar
soni **bir xil** bo'lishi kerak. Yangi kalit qo'shganda uchchalasiga
ham qo'shing va tekshiring:

```bash
node -e "const {translations}=await import('./src/i18n/translations.js');
console.log(Object.keys(translations.uz).length, Object.keys(translations.uzc).length, Object.keys(translations.ru).length)" --input-type=module
```

Bir marta anchor to'qnashuvi sababli 59 ta ruscha tarjima noto'g'ri
blokka tushib qolgan — shuning uchun kalit qo'shishda blok
chegaralarini hisobga oladigan usul ishlatiladi.

---

## Repolar

| Repo | Vazifa |
|---|---|
| `lakmago-client` | **bu repo** — mijoz ilovasi (React + Vite) |
| `lakmago-server` | Backend (Express + MongoDB) |
| `lakmago-admin` | Admin va restoran paneli |
| `lokma-courier` | Kuryer ilovasi |

Frontend Vercel'da (`lokma.uz`, `lokmago.uz`), backend VPS'da (pm2).
Telegram Mini App URL @BotFather'da sozlanadi — u **`lokma.uz`**
bo'lishi kerak (bir marta `lakma.uz` qo'yilib, ilova ishlamay
qolgan).

# 🎨 Mavsumiy ilova ikonkasi (iOS + Android)

Telefon menyusidagi **Lokma Go** logotipi fasl va bayramga qarab **o'zi almashadi** (ilova ochilganda, sana bo'yicha — Toshkent vaqti).

## Kalendar (qaysi ikonka qachon)

Ustuvorlik yuqoridan pastga (birinchi mos kelgani):

| # | Mavzu | Qachon | Rasm |
|---|---|---|---|
| 1 | qo'lda (`OVERRIDES`) | belgilangan sanalar | istalgan |
| 2 | `ramadan` | Ramazon oyi + Ro'za hayit (1–4 Shavvol) va Qurbon hayit (9–13 Zulhijja) — hijriy taqvim | yarim oy, masjid, fonus |
| 3 | `newyear` | 15-dekabr … 14-yanvar | Santa qalpoq, qor, gulxan |
| 4 | `spring` | mart – may (Navro'z shu yerda) | gullagan shoxlar |
| 4 | `summer` | iyun – avgust | quyosh, palma, tarvuz |
| 4 | `autumn` | sentabr – noyabr | kuz barglari, qovoq |
| 5 | `default` | 15-yanvar … fevral oxiri | asosiy logotip |

2026–2027 uchun: Ramazon 18-fev 2026 (Ro'za hayit 20-mart), Qurbon hayit 26–30-may 2026, Ramazon 2027 — 8-fevraldan.

**Hijriy sana** Umm al-Qura bo'yicha hisoblanadi; O'zbekistonda Ramazon/hayit 1 kunga farq qilishi mumkin. Aniq sanani qo'yish uchun
`src/lib/appIconSchedule.js` dagi `OVERRIDES` ga `{ from: '2027-02-09', to: '2027-03-12', theme: 'ramadan' }` qo'shing (ilovani qayta chiqarish kerak).

## Qanday ishlaydi

```
src/lib/appIconSchedule.js   sana → mavzu (toza mantiq, testlangan)
src/lib/appIcon.js           ilova ochilganda (+4 s) va har safar oldingi planga qaytganda: kerakli mavzu ≠ hozirgisi bo'lsa → plaginni chaqiradi
        │  registerPlugin('AppIcon')  →  getCurrent() / setIcon({ theme })
        ├─ iOS      ios/App/App/AppIconPlugin.swift   UIApplication.setAlternateIconName  (+ MainViewController, SceneDelegate)
        └─ Android  android/.../AppIconPlugin.java    activity-alias'lardan bittasini yoqadi (AndroidManifest.xml)
```

Veb/Telegram Mini App'da hech narsa qilmaydi. Xato ilovani hech qachon buzmaydi (jimgina o'tkazib yuboriladi).

## ⚠️ Platforma cheklovlari (bilib qo'ying)

- **iOS:** ikonka almashganda tizim foydalanuvchiga *"Siz 'Lokma Go' ikonkasini o'zgartirdingiz"* oynasini ko'rsatadi. Apple buni
  ochiq API'da o'chirishga ruxsat bermaydi. Shuning uchun faqat mavzu haqiqatan o'zgarganda chaqiriladi (yiliga ~7 marta). Faqat ilova ochiq paytda ishlaydi.
- **Android:** ikonka ilova ochiq paytda almashadi; ba'zi launcher'larda (Xiaomi, Samsung) yangilanish bir necha soniya oladi.
- **App Store / Google Play sahifasidagi ikonka** doim bitta (asosiy) — uni avtomatik almashtirib bo'lmaydi. Mavsumiy ikonka ilova **o'rnatilgandan va bir marta ochilgandan keyin** telefon menyusida almashadi.
- **Android, birinchi yangilanish:** ishga tushirish nuqtasi `MainActivity`dan `IconDefault` alias'iga ko'chdi. Ba'zi launcher'larda ilgari
  qo'yilgan ekrandagi yorliq yo'qolishi mumkin (foydalanuvchi ilovani menyudan qayta qo'yadi). Yangi o'rnatishlarga ta'sir qilmaydi.

## Ikonkalarni qayta yaratish

Manba rasmlar: `resources/app-icons/<mavzu>.jpg` (oq fonli logotip). O'zgartirgach:

```bash
python3 scripts/make-seasonal-icons.py      # Pillow + numpy kerak
```

Yaratadi: iOS `AppIcon.appiconset` (asosiy) + `AppIcon-<Mavzu>.appiconset` (1024×1024, shaffofliksiz) va Android `mipmap-*`
(`ic_launcher[_<mavzu>]`, `_round`, `_foreground` + `mipmap-anydpi-v26/*.xml`).

> Eski `scripts/make-app-icons.py` va `resources/lokma-go-logo-source.jpeg` **eskirgan** (eski logotip) — ishlatmang.

## Yangi mavzu qo'shish (masalan `mehrjon`)

1. `resources/app-icons/mehrjon.jpg` qo'ying; `scripts/make-seasonal-icons.py` dagi `THEMES` va `IOS_NAME` ga qo'shib, skriptni ishga tushiring.
2. `src/lib/appIconSchedule.js` — `ICON_THEMES` va qoidaga qo'shing.
3. Android: `AppIconPlugin.java` `THEMES`; `AndroidManifest.xml` ga `.IconMehrjon` alias (enabled="false").
4. iOS: `AppIconPlugin.swift` `assetNames`; `project.pbxproj` dagi **ikkala** `ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES` ga `AppIcon-Mehrjon`.
5. `npm run test:icons` — ro'yxatlar bir xil emasligini o'zi aytadi.

## Tekshirish

```bash
npm run test:icons     # sana → mavzu (hijriy sanalar bilan) + iOS/Android/JS ro'yxatlari bir xilligi
```

Qurilmada qo'lda: `OVERRIDES` ga bugungi sanani va istalgan mavzuni yozing → ilovani ishga tushiring (iOS: Xcode orqali, Android: `npx cap run android`) → 4 soniyadan keyin ikonka almashadi.
Chiqarishdan oldin: iOS — Xcode'da Archive (alternate ikonkalar avtomatik kiradi), Android — `versionCode` ni oshiring.

# LokmaGo — Play Market va App Store'ga chiqarish

Ilova Capacitor orqali tayyorlangan: `lakmago-client` (React/Vite) kodi
o'zgarishsiz, uni Android va iOS "native qobiq" ichiga o'raydi. Ya'ni
alohida ilova yozilmadi — mavjud veb-ilovaning o'zi endi App Store va
Play Market'da chiqadigan ilovaga aylandi.

**Ilova ID:** `uz.lokmago.app`
**Nomi:** LokmaGo

---

## Nega ba'zi qadamlar sizda bo'lishi kerak

Men (Claude) ishlayotgan muhitda internetga faqat cheklangan domenlar
ochiq (npm, GitHub va h.k.), Google va Apple serverlariga emas. Shuning
uchun `.apk` yoki `.ipa` faylini shu yerda yig'ib bera olmayman — bu
qadamni siz o'z kompyuteringizda bajarishingiz kerak. Loyihaning o'zi
esa to'liq tayyor, sizga faqat quyidagi qadamlarni bajarish qoladi.

---

## ANDROID — Play Market

### Kerakli narsalar
- [Android Studio](https://developer.android.com/studio) (bepul)
- [Google Play Console](https://play.google.com/console) akkaunti —
  bir martalik **$25**

### Qadamlar

1. Repodan oxirgi holatni oling:
   ```
   git pull
   ```

2. Bog'liqliklarni o'rnating va veb-qismni yig'ing:
   ```
   npm install
   npm run build
   npx cap sync android
   ```

3. Android Studio'da oching:
   ```
   npx cap open android
   ```
   (yoki Android Studio'dan to'g'ridan-to'g'ri `android/` papkasini
   oching)

4. Android Studio o'zi kerakli SDK komponentlarini yuklab oladi
   (birinchi ochilishda biroz vaqt oladi).

5. **Sinov uchun** (Play Market'siz, to'g'ridan-to'g'ri telefoningizga):
   - Yuqorida `Run` (▶) tugmasini bosing, telefoningizni USB orqali
     ulang yoki emulyator tanlang.

6. **Play Market uchun chiqarish:**
   - `Build → Generate Signed Bundle / APK`
   - **Android App Bundle (.aab)** ni tanlang (Play Market shuni talab
     qiladi, oddiy .apk emas)
   - Yangi kalit (keystore) yarating — **BU FAYLNI YO'QOTMANG**, u
     bo'lmasa keyingi yangilanishlarni chiqara olmaysiz. Xavfsiz joyda
     (parol menejeri, tashqi disk) zaxira nusxa saqlang.
   - Yig'ilgan `.aab` faylini Play Console'ga yuklaysiz

7. Play Console'da: ilova nomi, tavsif, skrinshotlar, maxfiylik
   siyosati havolasi (`lokma.uz` da bitta sahifa yetarli) so'raladi.

### Ilova ikonkasi va splash screen

Hozircha standart Capacitor ikonkasi turibdi. Buni almashtirish uchun:
```
npm install -D @capacitor/assets
```
`resources/icon.png` (1024×1024) va `resources/splash.png` (2732×2732)
qo'yib, keyin:
```
npx capacitor-assets generate
```

---

## iOS — App Store

### Kerakli narsalar
- **Mac kompyuter** (Xcode faqat macOS'da ishlaydi)
- [Apple Developer akkaunti](https://developer.apple.com/programs/) —
  yillik **$99**
- Xcode (Mac App Store'dan bepul)

### Mac yo'q bo'lsa

Ikkita yo'l bor:
1. **Bulutli Mac xizmati** — [Codemagic](https://codemagic.io) yoki
   shunga o'xshash xizmatlar Capacitor loyihalarini Mac'siz, bulutda
   yig'ib beradi (bepul tarif ham bor). Apple Developer akkaunti
   baribir kerak.
2. Do'st/hamkasbning Mac'idan bir martalik foydalanish — sozlash
   bir necha soat vaqt oladi, keyin qayta kerak bo'lmaydi.

### Qadamlar (Mac'da)

1. Repodan oling, o'rnating, yig'ing:
   ```
   git pull
   npm install
   npm run build
   npx cap sync ios
   ```

2. Xcode'da oching:
   ```
   npx cap open ios
   ```

3. Xcode'da: loyiha sozlamalarida **Signing & Capabilities** bo'limida
   Apple Developer akkauntingizni bog'lang.

4. `Product → Archive` — bu `.ipa` faylini yaratadi.

5. Archive oynasidan **Distribute App → App Store Connect** orqali
   yuklaysiz.

6. [App Store Connect](https://appstoreconnect.apple.com) da: ilova
   nomi, tavsif, skrinshotlar (turli o'lchamdagi iPhone'lar uchun
   kerak bo'ladi), maxfiylik siyosati.

---

## Muhim eslatma — Telegram bilan bog'liqlik

Ilova hozir ham Telegram Mini App, ham mustaqil ilova sifatida
ishlaydi — kodda buni tekshiruvchi qism allaqachon bor
(`isTelegramEnv()`, `authMode: 'web'`). Mustaqil ilovada ochilganda
kirish ekrani **brauzer** rejimida ishlaydi (Telegram Login Widget) —
buni oldingi ishlarda sozlagan edik.

Ya'ni qo'shimcha ishlash shart emas — bitta kod bazasi ikkala muhitda
ham to'g'ri ishlaydi.

---

## Keyingi safar yangilash

Har safar kod o'zgargach, native ilovani yangilash uchun faqat shu
uchta buyruq kifoya:
```
npm run build
npx cap sync
```
Keyin Android Studio/Xcode'da qayta yig'ib, do'konlarga yuklaysiz.
`android/` va `ios/` papkalarini qayta yaratish shart emas.

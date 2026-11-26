# Taom takliflari push'i (Lokma Go ilovasi)

Kuniga ko'pi bilan 2 ta bildirishnoma — tushlik va kechki ovqat paytida — mijozga mos taom bilan.
Bosilganda ilova o'sha taom sahifasini (`/food/:id`) ochadi.

| Qism | Fayl |
|---|---|
| Rozilik oynasi, ko'prik | `src/components/PromoPush/PromoPush.jsx` |
| Profil tugmasi | `src/components/PromoPush/PushToggle.jsx` |
| Plagin, token, bosilganda o'tish | `src/lib/promoPush.js` |
| Server: rejalashtiruvchi, yuborish | `lakmago-server/src/services/promoPush.js` |
| Server: matnlar bazasi (80 ta, uz + ru; kirill avtomatik) | `lakmago-server/src/lib/promoPushTemplates.js` |
| Server: tanlash (takrorlanmaslik) | `lakmago-server/src/lib/promoPushPick.js` |
| Admin: yoqish, vaqt, statistika, namuna, sinov | lakmago-admin → «Mijoz ilovasi» |

## Bir martalik sozlash

### Android (Firebase)
1. Firebase Console → restoran ilovasi turgan **o'sha loyiha** → *Add app* → Android, paket: `lokma.uz`.
   (O'sha loyiha bo'lsa, serverdagi `FCM_SERVICE_ACCOUNT_BASE64` mijoz ilovasiga ham ishlaydi — yangi kalit kerak emas.)
2. `google-services.json` ni yuklab, `android/app/google-services.json` ga qo'ying (repo'ga commit qilinmaydi).
3. Android Studio'da yangi versiyani yig'ing va Google Play'ga chiqaring.

### iOS (Apple)
1. developer.apple.com → Identifiers → `uz.lokma.go` → **Push Notifications** ✓ → Save.
2. Serverdagi APNs kaliti (`APNS_KEY_BASE64`, `APNS_KEY_ID`, `APNS_TEAM_ID`) shu jamoaniki bo'lsa — mijoz ilovasiga ham ishlaydi.
   Mavzu: `CUSTOMER_APNS_BUNDLE_ID` (standart `uz.lokma.go`).
3. GitHub Actions → *iOS release* ni ishga tushiring. Push yoqilgach eski provisioning profil yaroqsiz bo'ladi,
   fastlane uni o'zi qayta yaratadi.

### Yoqish
Admin → «Mijoz ilovasi» → «Taom takliflari»: avval «Sinov push» bilan o'z telefoningizga yuborib ko'ring, keyin yoqing.
Standart holatda **o'chiq**.

## Kafolatlar
- Bir qurilmaga kuniga ko'pi bilan 2 ta (bazada `(qurilma, kun, slot)` unique).
- Bir matn 14 kun, bir taom 7 kun ichida bir qurilmaga takrorlanmaydi; bir mijozning ikki telefoniga bir xil kelmaydi.
- Faqat hozir ochiq (va 45 daqiqadan keyin ham ochiq), yetkazadigan restoran; mijozning tumani; spirtli ichimlik yo'q.
- Har qurilmaga oyna ichida o'z daqiqasi — hammaga bir paytda ketmaydi.
- Kech qolgan xabar yuborilmaydi (oyna yopilgach yo'q; FCM/APNs muddati 1 soat).
- Rozilik bermagan, profilda o'chirgan yoki tizimda rad etgan qurilmaga hech narsa ketmaydi.

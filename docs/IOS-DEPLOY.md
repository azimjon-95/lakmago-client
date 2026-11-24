# iOS avtomatik deploy — TestFlight va App Store

Lokma Go iOS ilovasi (`uz.lokma.go`, jamoa `8A38QL5HR2`) GitHub Actions'da macOS mashinada
yig'iladi, imzolanadi va **TestFlight**'ga yuklanadi. Xohlansa App Store'ga **"Submit for Review"**
ham yuboriladi. Ilovani **chiqarish (Release) har doim qo'lda** qilinadi: Apple tasdiqlagach,
App Store Connect'da tugma bosiladi.

| Fayl | Vazifasi |
|---|---|
| `.github/workflows/ios-release.yml` | Qachon ishga tushishi, veb-qism build, `cap sync`, fastlane |
| `ios/App/fastlane/Fastfile` | Imzolash, build raqami, TestFlight / review |
| `ios/App/Gemfile` | fastlane versiyasi |

---

## 1. Bir martalik sozlash

### 1.1 App Store Connect API kaliti
1. [App Store Connect](https://appstoreconnect.apple.com) → **Users and Access** → **Integrations** →
   **App Store Connect API** → **Team Keys** → **+**.
2. Nomi: `GitHub CI`. Ruxsat: **Admin**. Bu ruxsat kerak, chunki provisioning profile eskirsa yoki
   yo'q bo'lsa, CI uni o'zi yaratadi.
3. `AuthKey_XXXXXXXXXX.p8` faylini yuklab oling. **Faqat bir marta beriladi**, yo'qolsa yangi kalit
   yaratiladi. **Key ID** va sahifa tepasidagi **Issuer ID**ni yozib oling.

### 1.2 Tarqatish sertifikati (.p12)
**Mac'da:** Xcode → Settings → Accounts → jamoa → **Manage Certificates** → **+** → **Apple Distribution**.
Keyin Keychain Access'da sertifikatni (kaliti bilan birga) tanlab **Export → .p12** qiling va kuchli parol qo'ying.

**Mac bo'lmasa:**
```bash
openssl req -new -newkey rsa:2048 -nodes -keyout dist.key -out dist.csr -subj "/CN=Lokma Go Distribution"
# developer.apple.com → Certificates → + → Apple Distribution → dist.csr ni yuklang → distribution.cer ni oling
openssl x509 -inform der -in distribution.cer -out dist.pem
openssl pkcs12 -export -legacy -inkey dist.key -in dist.pem -out dist.p12   # parol so'raydi
```
Jamoada Apple Distribution sertifikatlari soni cheklangan. Mavjudi bo'lsa, yangisini yaratmasdan
o'shani eksport qiling.

### 1.3 GitHub: Environment va Secrets
Repo `lakmago-client` → **Settings** → **Environments** → **New environment**: `app-store`.
Bu yerda **Required reviewers**ni yoqish tavsiya etiladi: har bir yuklash siz tasdiqlagandan keyingina boshlanadi.

`app-store` muhitiga **Secrets** qo'shing:

| Secret | Qiymati |
|---|---|
| `ASC_KEY_ID` | API kalit Key ID |
| `ASC_ISSUER_ID` | Issuer ID |
| `ASC_KEY_P8_BASE64` | `base64 -i AuthKey_XXXX.p8` natijasi |
| `IOS_DIST_CERT_P12_BASE64` | `base64 -i dist.p12` natijasi |
| `IOS_DIST_CERT_PASSWORD` | .p12 paroli |

macOS'da `base64 -i fayl | pbcopy` natijani nusxalaydi. Linux'da `base64 -w0 fayl` ishlating.

### 1.4 GitHub: Variables (veb-qism sozlamalari)
Veb-qism ilova **ichiga** joylanadi, shuning uchun server manzili **to'liq** bo'lishi shart:
`capacitor://localhost` ichida `/api` ishlamaydi. Qiymatlarni **Vercel → lakmago-client →
Settings → Environment Variables (Production)** dan aynan ko'chiring.

| Variable | Majburiy |
|---|---|
| `VITE_API_URL` | **ha**, `https://...` (bo'lmasa build boshlanmaydi) |
| `VITE_SOCKET_URL` | ha |
| `VITE_WEBAPP_NAME`, `VITE_SHARE_BASE` | Vercel'dagidek |
| `VITE_DISTRICT_SELECTOR_ENABLED`, `VITE_DISTRICT_AUTO_DETECT_ENABLED` | Vercel'dagidek |
| `VITE_BOT_USERNAME`, `VITE_WEDDING_URL` | ixtiyoriy |
| `IOS_AUTO_ON_MAIN` | ixtiyoriy: `true` bo'lsa main'ga har push TestFlight'ga ketadi (6-bo'lim) |

Bular sir emas, chunki ilova kodiga ochiq joylanadi. Shuning uchun Secret emas, **Variable**.

---

## 2. Ishlatish

**Yangi versiya (asosiy yo'l):**
```bash
git checkout main && git pull
git tag ios-v1.1.0 && git push origin ios-v1.1.0
```
Natijada `1.1.0` versiya yig'iladi va TestFlight'ga yuklanadi. Build raqami avtomatik oshiriladi.

**Qo'lda:** GitHub → **Actions** → **iOS release** → **Run workflow**:
- `beta`: faqat TestFlight.
- `release`: TestFlight, keyin processing kutiladi, keyin App Store'ga **Submit for Review**.
  App Store Connect'da shu versiyaning ma'lumotlari (tavsif, skrinshotlar) oldindan to'ldirilgan bo'lishi kerak.

Natija ish sahifasining **Summary** bo'limida ko'rinadi: versiya, build raqami va xato bo'lsa sababi.
IPA va dSYM 14 kun **Artifacts**da saqlanadi.

---

## 3. Qoidalar

- **Build raqami** = TestFlight'dagi eng kattasi (yoki loyihadagi) + 1. Repoga yozilmaydi.
  Takroriy raqam xatosi bo'lmaydi.
- **Versiya**: App Store'da chiqarilgan versiya raqamiga yangi build qo'shib bo'lmaydi (Apple
  "train" yopiladi). Har chiqarishdan keyin keyingi tegni oshiring: `ios-v1.1.1`, `ios-v1.2.0` ...
- **Imzolash** repoda `Automatic` bo'lib qoladi, Mac'da Xcode bilan ishlash o'zgarmaydi.
  CI faqat o'z nusxasida `Manual` + App Store profiliga o'tkazadi.
- **Shifrlash deklaratsiyasi**: `Info.plist` → `ITSAppUsesNonExemptEncryption = NO`. Ilova faqat
  standart HTTPS ishlatadi, shuning uchun TestFlight'da "Missing Compliance" so'ralmaydi. Agar ilovaga
  o'ziga xos shifrlash qo'shilsa, bu qiymatni qayta ko'rib chiqing.
- `CFBundleVersion` endi `$(CURRENT_PROJECT_VERSION)`. Ilgari `5` qattiq yozilgan edi va loyihadagi
  raqam bilan mos emas edi.
- Veb-o'zgarishlar (Vercel) iPhone ilovasiga **faqat yangi iOS build bilan** yetadi, chunki veb-qism
  ilova ichida. Muhim tuzatishdan keyin `ios-v...` teg qo'yishni unutmang.

---

## 4. Xavfsizlik

- `.p8`, `.p12`, `.mobileprovision` repoga **hech qachon** qo'shilmaydi (`ios/.gitignore`).
- Sirlar faqat fastlane qadamiga beriladi. `.p12` vaqtinchalik keychain'ga o'rnatiladi va diskdan
  o'chiriladi. GitHub runner har ishdan keyin yo'q qilinadi.
- Kalit sizib chiqsa: App Store Connect → Integrations → kalitni **Revoke**, yangisini yarating,
  Secret'ni almashtiring. Sertifikat sizib chiqsa: developer.apple.com → **Revoke**, yangisini oling.

---

## 5. Xatolar

| Xabar | Sabab / yechim |
|---|---|
| `VITE_API_URL to'liq https manzil bo'lishi shart` | 1.4-bo'limdagi Variable qo'shilmagan |
| `App Store Connect API kaliti yo'q` | Secret nomi xato yoki `app-store` muhitiga qo'shilmagan |
| `No signing certificate "iOS Distribution" found` / `Could not find a matching code signing identity` | .p12 paroli xato yoki sertifikat jamoaga tegishli emas |
| `Bundle version must be higher...` | Bo'lmasligi kerak; bo'lsa versiyani oshiring (`ios-v...`) |
| `The train version ... is closed` | Bu versiya chiqarilgan, keyingi teg bilan versiyani oshiring |
| `Invalid Provisioning Profile` (Sign in with Apple) | developer.apple.com → Identifiers → `uz.lokma.go` → **Sign In with Apple** yoqilganini tekshiring |

---

## 6. Xarajat (macOS daqiqalari)

Yopiq (private) repoda GitHub macOS daqiqasini **10 barobar** hisoblaydi. Bitta build taxminan
15–25 daqiqa davom etadi, bu limitdan 150–250 daqiqa sarflaydi. Shuning uchun standart holatda
faqat **teg** yoki **qo'lda** ishga tushadi. `IOS_AUTO_ON_MAIN=true` qilinsa, `main`ga har push
(ilova kodi o'zgarganda) TestFlight'ga ketadi. Bu qulay, lekin limitni tez yeydi.

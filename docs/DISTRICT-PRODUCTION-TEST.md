# District — mijoz (Vercel) tomoni: cheklangan haqiqiy test

Branch: `feature/district-production-test`. `main` o'zgarmagan. Server bosqichlari: `lakmago-server/docs/DISTRICT-PRODUCTION-TEST.md`.

## Vercel holati (tekshirilgan, faqat o'qish)

Loyiha `lakmago-client`, domenlar: `lokma.uz`, `lokmago.uz`. Hozirgi ENV'lar (hammasi "sensitive" — qiymatlari ko'rinmaydi, shuning uchun qiymatlarni TEKSHIRA OLMADIM):

| ENV | Muhit | District bilan bog'liq? |
|---|---|---|
| `VITE_API_URL` | Production + Preview | yo'q |
| `VITE_SOCKET_URL` | Production + Preview | yo'q |
| `VITE_WEBAPP_NAME` | Production + Preview | yo'q |
| `VITE_SHARE_BASE` | Production + Preview | yo'q |

`VITE_DISTRICT_*` hozir **mavjud emas** → production'da barcha district funksiyalari O'CHIQ (kod standarti `false`).
Muhim: `VITE_API_URL` Preview'ga ham qo'yilgan → Preview deploy **production API'ga** ulanadi (CORS `*.vercel.app` ni ruxsat beradi). Ya'ni Preview'dagi buyurtma/yozuvlar HAQIQIY.

## Qaysi flag, qayerda, qanday qiymat

| ENV | Production | Preview (faqat `feature/district-production-test` branch) |
|---|---|---|
| `VITE_DISTRICT_SELECTOR_ENABLED` | **QO'YMANG** (yo'q = o'chiq) | `true` |
| `VITE_DISTRICT_AUTO_DETECT_ENABLED` | **QO'YMANG** | `true` (server 6.3 bosqichidan KEYIN; boshida `false`) |

Qiymat aynan `true` bo'lishi kerak (kod `=== 'true'` tekshiradi). Server tomoni yoqilmaguncha (`/api/districts` da `boundaries` yo'q) chip ko'rinmaydi — ikki qulf.

## Vercel'da qo'yish (Dashboard — siz qilasiz)

Project `lakmago-client` → Settings → Environment Variables → Add:
1. Name `VITE_DISTRICT_SELECTOR_ENABLED`, Value `true`, **Environments: faqat Preview**, **Git Branch: `feature/district-production-test`**.
2. (server 6.3 dan keyin) `VITE_DISTRICT_AUTO_DETECT_ENABLED` = `true`, xuddi shunday (Preview + shu branch).
3. Production belgisini QO'YMANG.
4. VITE_ o'zgaruvchilar build vaqtida kiradi → o'zgartirgach branch'ni **Redeploy** qiling.

Preview URL: `https://lakmago-client-git-feature-district-production-test-azimjons-projects-0b0977ac.vercel.app` (Vercel Deployments sahifasida aniq URL ko'rinadi). Loyihada SSO himoya yoqilgan (`all_except_custom_domains`) — Preview'ni ochish uchun telefonda ham Vercel akkauntiga kirish kerak.

## Rollback (mijoz)

Preview env'larni o'chiring yoki `false` qiling → Redeploy. Production'ga tegilmagan, qaytarish kerak emas.

## Cheklovlar

- Telegram Mini App URL @BotFather'da `lokma.uz` — Preview'ni Mini App sifatida sinab bo'lmaydi (faqat telefon brauzerida/Telegram ichki brauzerida havola orqali; Mini App GPS API'si farq qilishi mumkin).
- iOS/Android (Capacitor) ilovasi production bundle'ni ishlatadi — branch'ni sinab bo'lmaydi.

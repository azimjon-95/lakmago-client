# LokmaGo — Frontend (MVP)

Telegram WebApp restoran platformasi. React + JavaScript + Vite + Tailwind + TanStack Query + Zustand.

## Ishga tushirish

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ ga production build
```

## Struktura

```
src/
├── api/          # API qatlami (hozircha mock, real backendga tayyor)
├── components/   # Qayta ishlatiluvchi UI
│   ├── Icon.jsx
│   ├── BannerSlider.jsx     # aylanuvchi banner
│   ├── RestaurantCard.jsx
│   ├── DishScrollCard.jsx   # trend/chegirma kartochka
│   ├── DishRow.jsx          # menyu qatori + hisoblagich
│   ├── DishModal.jsx        # taom detali, qo'shimchalar
│   ├── CartBar.jsx          # yopishgan savatcha paneli
│   └── BottomNav.jsx
├── data/mock.js  # demo ma'lumotlar
├── hooks/queries.js  # TanStack Query hook'lari
├── lib/utils.js  # narx formatlash, Telegram integratsiyasi
├── pages/
│   ├── HomePage.jsx         # bosh sahifa (Yandex Eda uslubi)
│   ├── RestaurantPage.jsx   # to'liq menyu
│   ├── CartPage.jsx         # savatcha + rasmiylashtirish
│   ├── OrderTrackPage.jsx   # real-time status
│   └── StubPages.jsx
├── store/cart.js # Zustand savatcha
└── types/index.js
```

## Brend

Logodan olingan palitra (`tailwind.config.js`):
- `brand-400` `#EF9F27` — asosiy amber aksent
- `brand-ink` `#411E00` — to'q fon (savatcha, sarlavhalar)
- `brand-50` `#FAEEDA` — iliq fon tint

## Backendga ulash

`src/api/index.js` ichida `VITE_API_URL` env orqali real backend (Express + MongoDB) ga
ulanadi. Har bir funksiya avval real API'ni sinaydi, ishlamasa mock'ga qaytadi —
shu tufayli frontend backend tayyor bo'lishini kutmasdan ishlaydi.

`.env`:
```
VITE_API_URL=https://api.lokmago.uz/api
```

## Keyingi qadamlar

- Backend: Express + MongoDB + Socket.IO (real-time buyurtma)
- Telegram Bot integratsiyasi (login, push)
- To'lov: Payme / Click / Uzum
- Stol bron tizimi
- Restoran va admin panellari

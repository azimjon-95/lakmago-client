# LokmaGo — Frontend (MVP)

Telegram WebApp restoran platformasi. React + TypeScript + Vite + Tailwind + TanStack Query + Zustand.

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
│   ├── Icon.tsx
│   ├── BannerSlider.tsx     # aylanuvchi banner
│   ├── RestaurantCard.tsx
│   ├── DishScrollCard.tsx   # trend/chegirma kartochka
│   ├── DishRow.tsx          # menyu qatori + hisoblagich
│   ├── DishModal.tsx        # taom detali, qo'shimchalar
│   ├── CartBar.tsx          # yopishgan savatcha paneli
│   └── BottomNav.tsx
├── data/mock.ts  # demo ma'lumotlar
├── hooks/queries.ts  # TanStack Query hook'lari
├── lib/utils.ts  # narx formatlash, Telegram integratsiyasi
├── pages/
│   ├── HomePage.tsx         # bosh sahifa (Yandex Eda uslubi)
│   ├── RestaurantPage.tsx   # to'liq menyu
│   ├── CartPage.tsx         # savatcha + rasmiylashtirish
│   ├── OrderTrackPage.tsx   # real-time status
│   └── StubPages.tsx
├── store/cart.ts # Zustand savatcha
└── types/index.ts
```

## Brend

Logodan olingan palitra (`tailwind.config.js`):
- `brand-400` `#EF9F27` — asosiy amber aksent
- `brand-ink` `#411E00` — to'q fon (savatcha, sarlavhalar)
- `brand-50` `#FAEEDA` — iliq fon tint

## Backendga ulash

`src/api/index.ts` ichida `VITE_API_URL` env orqali real backend (Express + MongoDB) ga
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

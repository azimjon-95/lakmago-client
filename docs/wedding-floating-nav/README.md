# Lokma To'yxonalar — suzuvchi pastki menyu (Lokma Go / Market bilan bir xil)

To'yxonalar `wedding.lokma.uz` da **alohida sayt** bo'lib, Lokma ilovasida iframe ichida ochiladi — shu sababli uning pastki menyusi
Lokma mijoz ilovasi kodida emas, **sayt repozitoriysida** o'zgartiriladi. Bu papkadagi fayllar tayyor paket: nusxalab qo'ysangiz bo'ldi.

| Fayl | Vazifasi |
|---|---|
| `floating-nav.css` | Menyu dizayni (kapsula, shisha effekti, silliq suriluvchi "pill"). **Lokma Go va Market'dagi fayl bilan bir xil nusxa.** |
| `theme-wedding.css` | To'yxonalar rangi: `#A61E4D` (to'q qizil), nishon — oltin `#D1A65E` |
| `FloatingNav.jsx` | Tayyor React komponent (bog'liqliksiz) |

## Ulash (4 qadam)

1. `floating-nav.css` va `theme-wedding.css` ni saytga qo'shing (global CSS), `FloatingNav.jsx` ni komponentlar papkasiga.
2. Eski pastki menyuni (To'yxonalar · Xarita · Saralangan · Profil) olib tashlab, o'rniga qo'ying:
   ```jsx
   <FloatingNav active={tab} onSelect={goTo} tabs={[
     { id: 'venues',    label: "To'yxonalar", icon: <HomeIcon /> },
     { id: 'map',       label: 'Xarita',      icon: <MapIcon /> },
     { id: 'favorites', label: 'Saralangan',  icon: <HeartIcon />, badge: favoritesCount },
     { id: 'profile',   label: 'Profil',      icon: <UserIcon />, photoUrl: telegramPhotoUrl },
   ]} />
   ```
   Ikonkalar: 26×26, `stroke="currentColor"`, chiziq qalinligi faolda 2.3, faolsizda 1.9 (Lokma ilovasidagidek).
3. Menyu o'rab turuvchi elementiga (sahifa pastida, sticky) shu uslubni bering — Lokma ilovasidagi bilan bir xil:
   ```css
   .lokma-bottom-nav {
     position: sticky; bottom: 0; z-index: 20; margin-top: auto;
     /* pastdan: Instagramdagidek — iPhone'da home-chiziqdan ~12 px yuqorida (ekran chetidan ≈22 px); xavfsiz zona yo'q bo'lsa 10 px */
     padding: 6px 20px max(10px, calc(env(safe-area-inset-bottom, 0px) - 12px));
     pointer-events: none;           /* atrofi bosilmaydi */
   }
   .lokma-bottom-nav .fnav { pointer-events: auto; }
   ```
4. Sahifa kontentining pastiga menyu balandligicha bo'sh joy qoldiring: **6 + 58 + pastki oraliq** (pastki oraliq kamida 10 px), aks holda oxirgi kartalar menyu ostida qoladi.

## Dizayn qoidalari (uch bo'limda bir xil)

- Kapsula: balandligi **58 px**, yon chetlardan **20 px**, kengligi ≤ **420 px**, burchak to'liq yumaloq; pastdan **max(10 px, xavfsiz zona − 12 px)** (Lokma ichida: host bergan zona + 2 px).
- Fon: oq 72% shaffoflik + `backdrop-filter: blur(22px) saturate(1.8)` (shisha); soya yumshoq; ichki yuqori yorug' chiziq.
- Faqat ikonkalar (matn yo'q). Faol tab: faol rangdagi ikonka + ortida **yumshoq rangli "pill"**, u tablar orasida 360 ms silliq suriladi.
- Bosilganda tab `scale(.88)`. "Harakatni kamaytirish" yoqilgan qurilmada animatsiyasiz.
- Nishon (savat soni / saralanganlar): doira, faol rangda (To'yxonalarda oltin).

| Bo'lim | `--fn-accent` | `--fn-soft` |
|---|---|---|
| Lokma Go | `#FF5C00` | `rgba(255,92,0,.13)` |
| Lokma Market | `#148A43` | `rgba(20,138,67,.14)` |
| Lokma To'yxonalar | `#A61E4D` | `rgba(166,30,77,.12)` |

## Iframe ichida (`?embed=lokma`)
Lokma ilovasi saytni iframe'da ochadi; iPhone'ning pastki "home" chizig'i ilova tomonidan hisobga olinmaydi, shuning uchun
`env(safe-area-inset-bottom)` saytning o'zida ishlaydi. Menyu dizayni embed va oddiy rejimda bir xil.

# Kategoriya rasmlarini qo'shish

Hozir kategoriyalar chizma (SVG) bilan ko'rsatiladi. Uzum'dagi kabi
**haqiqiy taom fotolari** qo'yish uchun quyidagi qadamlarni bajaring.

---

## 1. Rasmlarni tayyorlash

Har kategoriya uchun bitta foto kerak. Talablar:

- **Oq fon** (Uzum'dagi kabi) — PNG shaffof fon ham bo'ladi
- Kamida **200×200 px** (400×400 yaxshiroq)
- Taom markazda, chetlarida biroz bo'shliq

Fayl nomlari **aynan** shunday bo'lsin:

```
milliy.png        choyxona.png     fastfood.png
lavash.png        burger.png       pitsa.png
sushi.png         shashlik.png     tovuq.png
shirinlik.png     salqin.png       magazin_oziq.png
```

**Rasm qayerdan olish:**
- Restoranlaringizdan haqiqiy taom fotolari (eng yaxshisi — o'z brendingiz)
- Yoki bepul stok: unsplash.com, pexels.com (tijorat uchun ruxsat berilgan)

---

## 2. Cloudinary'ga yuklash

Serverda (rasmlar papkasi bilan birga):

```bash
cd ~/projects/lakmago-server
node scripts/upload-categories.js ./rasmlar
```

Skript har rasmni yuklab, oxirida tayyor kod chiqaradi:

```
milliy: 'https://res.cloudinary.com/dnq8oy7l8/image/upload/v1/lokmago/categories/milliy.png',
choyxona: 'https://res.cloudinary.com/.../choyxona.png',
...
```

---

## 3. Havolalarni qo'yish

`src/data/categories.js` faylini oching va `img` maydonlarini to'ldiring:

```js
export const CATEGORIES = [
  {
    id: 'milliy',
    label: 'Milliy taom',
    art: 'milliy',
    img: 'https://res.cloudinary.com/dnq8oy7l8/image/upload/v1/lokmago/categories/milliy.png',
  },
  ...
];
```

Keyin Vercel'ga deploy qiling (`git push`).

---

## Muhim jihatlar

**Zaxira (fallback)** — agar `img` bo'sh bo'lsa yoki rasm yuklanmasa,
avtomatik chizma ko'rsatiladi. Ilova hech qachon bo'sh kvadrat ko'rsatmaydi.

**Optimizatsiya** — rasmlar Cloudinary orqali avtomatik WebP/AVIF formatiga
o'giriladi va kerakli o'lchamda beriladi (`f_auto,q_auto,c_fit`). Trafik tejaladi.

**Bir joyda boshqariladi** — `categories.js` faylini o'zgartirsangiz,
bosh sahifa ham, qidiruv filtri ham avtomatik yangilanadi.

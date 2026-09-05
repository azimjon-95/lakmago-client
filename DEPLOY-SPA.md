# SPA yo'naltirish (sahifa yangilanganda 404 bo'lmasligi uchun)

React Router ichki yo'llarni brauzerda boshqaradi. Sahifa
yangilanganda server `/menu` degan faylni qidiradi va topolmaydi —
shuning uchun 404 chiqadi.

Yechim: barcha so'rovlarni `index.html` ga yo'naltirish.

## Vercel
`vercel.json` fayli loyiha ildizida — avtomatik ishlaydi.

## Netlify
`public/_redirects` fayli — avtomatik ishlaydi.

## Nginx (o'z VPS'ingizda)

```nginx
server {
    server_name lokma.uz;
    root /var/www/lokmago-client/dist;
    index index.html;

    # MUHIM: index.html HECH QACHON keshlanmasin — u har deploy'da
    # yangi hash'langan JS/CSS fayllarga ishora qiladi. Agar bu
    # sozlama bo'lmasa, ba'zi WebView'lar (ayniqsa Telegram ichidagi
    # iOS WKWebView) index.html'ni UZOQ MUDDAT keshlab qo'yishi
    # mumkin — natijada QANCHA DEPLOY QILINSA HAM foydalanuvchi
    # ESKI JS bilan qolaveradi (yangi kod HECH QACHON yetib bormaydi).
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        expires off;
        try_files $uri /index.html;
    }

    # Hash'langan assetlar (masalan /assets/index-b0dff25.js) —
    # aksincha, CHEKSIZ uzoq muddat keshlanishi MUMKIN va KERAK,
    # chunki mazmun o'zgarsa fayl nomi (hash) ham o'zgaradi —
    # eski nom bilan eski fayl hech qachon "eskirmaydi".
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Deploy qilingandan keyin nginx qayta yuklanishi kerak:**
```bash
sudo nginx -t && sudo systemctl reload nginx
```

**Agar bu sozlama YO'Q bo'lsa va sizda Telegram ilovasi ESKI JS bilan
"qotib qolgan" bo'lsa** (masalan kod deploy qilingan, lekin ilova
xatti-harakati o'zgarmayapti) — buni tekshirish uchun:
```bash
curl -I https://lokma.uz/
# Cache-Control qatorini qidiring — agar YO'Q bo'lsa yoki
# "max-age" katta raqam bo'lsa, shu sozlama yetishmayapti.
```
Serverda sozlama to'g'rilangandan keyin ham, Telegram ilovasining
o'zidagi ESKI keshni tozalash kerak bo'lishi mumkin: Telegram →
Sozlamalar → Ma'lumot va xotira → Xotiradan foydalanish → Keshni
tozalash (yoki Mini App'ni to'liq yopib — ilovalar almashtirgichdan
yuqoriga surib — qayta oching).

Muhim qator: `try_files $uri $uri/ /index.html;`

## Apache
`public/.htaccess`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

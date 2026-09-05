#!/bin/bash
# ============================================================
# fix-nginx-cache.sh — index.html cache-busting muammosini
# AVTOMATIK tuzatadi (qo'lda nginx sozlamasini o'zgartirish
# shart emas).
#
# NIMA QILADI:
#   1. lokma.uz/lakma.uz uchun nginx config faylini topadi
#   2. Uni backup qiladi (.bak-TARIX bilan)
#   3. index.html HECH QACHON keshlanmasligi, /assets/ esa
#      CHEKSIZ keshlanishi uchun kerakli bloklarni qo'shadi
#      (agar ALLAQACHON qo'shilgan bo'lsa — qayta qo'shmaydi,
#      xavfsiz qayta ishga tushirish mumkin)
#   4. `nginx -t` bilan tekshiradi
#   5. Muvaffaqiyatli bo'lsa — nginx'ni reload qiladi
#   6. Muvaffaqiyatsiz bo'lsa — AVTOMATIK backup'ga qaytaradi,
#      hech narsa buzilmaydi
#
# ISHLATISH (VPS'da, SSH orqali kirib):
#   sudo bash fix-nginx-cache.sh
# ============================================================
set -euo pipefail

if [ "$EUID" -ne 0 ]; then
  echo "✗ Bu skript sudo bilan ishga tushirilishi kerak: sudo bash fix-nginx-cache.sh"
  exit 1
fi

echo "1) Nginx config faylini qidirmoqda (lokma.uz / lakma.uz)..."

CONFIG_FILE=""
for dir in /etc/nginx/sites-enabled /etc/nginx/sites-available /etc/nginx/conf.d; do
  if [ -d "$dir" ]; then
    found=$(grep -rlE "server_name[^;]*(lokma\.uz|lakma\.uz)" "$dir" 2>/dev/null | head -1 || true)
    if [ -n "$found" ]; then
      CONFIG_FILE="$found"
      break
    fi
  fi
done

if [ -z "$CONFIG_FILE" ]; then
  echo "✗ lokma.uz/lakma.uz uchun nginx config fayli avtomatik topilmadi."
  echo "  Qo'lda qidiring: grep -rl 'server_name' /etc/nginx/"
  echo "  Topgandan keyin: sudo bash fix-nginx-cache.sh /yo'l/config-fayli"
  exit 1
fi

echo "   Topildi: $CONFIG_FILE"

if grep -q "MUHIM: index.html HECH QACHON keshlanmasin" "$CONFIG_FILE"; then
  echo "2) Sozlama ALLAQACHON qo'shilgan — o'zgartirish shart emas."
else
  echo "2) Backup olinmoqda..."
  BACKUP_FILE="${CONFIG_FILE}.bak-$(date +%Y%m%d-%H%M%S)"
  cp "$CONFIG_FILE" "$BACKUP_FILE"
  echo "   Backup: $BACKUP_FILE"

  echo "3) Cache-Control bloklari qo'shilmoqda..."

  # Python orqali — sed'dan ko'ra ANIQROQ matn joylashtirish uchun.
  # `location / {` qatoridan OLDIN ikkita yangi location blokini
  # kiritadi (agar birinchi `location / {` topilmasa, hech narsa
  # o'zgartirmaydi va xato bilan chiqadi — xavfsizlik uchun).
  python3 - "$CONFIG_FILE" <<'PYEOF'
import sys, re

path = sys.argv[1]
text = open(path, encoding='utf-8').read()

INJECT = '''    # MUHIM: index.html HECH QACHON keshlanmasin — u har deploy'da
    # yangi hash'langan JS/CSS fayllarga ishora qiladi. Bo'lmasa
    # ba'zi WebView'lar (Telegram ichidagi iOS WKWebView) uni uzoq
    # muddat keshlab, yangi deploy hech qachon yetib bormay qoladi.
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        expires off;
        try_files $uri /index.html;
    }

    # Hash'langan assetlar — aksincha, CHEKSIZ keshlanishi MUMKIN va
    # KERAK (mazmun o'zgarsa fayl nomi/hash ham o'zgaradi).
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

'''

# Birinchi "location / {" (aniq shu ko'rinishda, boshqa location bloklari emas)ni topamiz
pattern = re.compile(r'^(\s*)location\s*/\s*\{', re.MULTILINE)
match = pattern.search(text)
if not match:
    print("XATO: 'location / {' qatori topilmadi — qo'lda qo'shish kerak bo'ladi.", file=sys.stderr)
    sys.exit(1)

insert_at = match.start()
new_text = text[:insert_at] + INJECT + text[insert_at:]

open(path, 'w', encoding='utf-8').write(new_text)
print("OK — bloklar 'location / {' dan oldin joylashtirildi.")
PYEOF

  if [ $? -ne 0 ]; then
    echo "✗ Avtomatik joylashtirish muvaffaqiyatsiz. Backup'dan tiklanmoqda..."
    cp "$BACKUP_FILE" "$CONFIG_FILE"
    echo "  Hech narsa o'zgarmadi. Qo'lda DEPLOY-SPA.md dagi namunani qo'shing."
    exit 1
  fi
fi

echo "4) nginx -t bilan tekshirilmoqda..."
if nginx -t 2>&1; then
  echo "5) Sozlama to'g'ri — nginx reload qilinmoqda..."
  systemctl reload nginx
  echo ""
  echo "✓ TAYYOR. Endi Telegram ilovasida Mini App keshini tozalang:"
  echo "  Telegram → Sozlamalar → Ma'lumot va xotira → Xotiradan foydalanish → Keshni tozalash"
  echo "  (yoki Mini App'ni ilovalar almashtirgichidan yuqoriga surib to'liq yoping va qayta oching)"
else
  echo "✗ nginx -t XATO berdi — o'zgarish qo'llanilmadi, avtomatik ortga qaytarilmoqda..."
  if [ -n "${BACKUP_FILE:-}" ]; then
    cp "$BACKUP_FILE" "$CONFIG_FILE"
    echo "  $CONFIG_FILE asl holatiga qaytarildi. Hech narsa buzilmadi."
  fi
  exit 1
fi

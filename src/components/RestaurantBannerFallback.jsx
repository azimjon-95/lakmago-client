import './cards/RestaurantBannerFallback.css';

/*
 * ═══════════════════════════════════════════════════════════
 * RESTORAN BANNERI — RASM YO'Q / HALI YUKLANMAGAN HOLAT
 * ═══════════════════════════════════════════════════════════
 *
 * Ishlatiladigan ikki joy:
 *   • RestaurantCard.jsx  — bosh sahifadagi restoran kartasi
 *   • DishPhoto.jsx (RestaurantBanner) — restoran sahifasi hero
 *
 * BITTA KOMPONENT, IKKI JOY. Ilgari har biri o'zicha (bittasi
 * shunchaki nom, ikkinchisi shunchaki xira ikonka) ko'rsatardi.
 * Endi ikkalasi ham bir xil, brendga mos ko'rinishni ko'rsatadi —
 * qog'oz fon, diagonal takrorlanuvchi nom, uchib yuruvchi
 * yulduzchalar.
 *
 * TO'LIQ IZOLYATSIYA: bu yerdagi barcha CSS klasslari `rbfb`
 * prefiksi bilan boshlanadi (RestaurantBannerFallback) va faqat
 * shu komponentda ishlatiladi. Boshqa fayllarga tegilmagan.
 */

// Har birining joyi, o'lchami va vaqti qo'lda tanlangan —
// tasodifiy emas, "tarqoq, lekin tartibli" ko'rinish uchun.
const SPARKLES = [
  { top: '12%', left: '14%', size: 7, delay: '0s', duration: '3.2s' },
  { top: '68%', left: '9%', size: 5, delay: '0.7s', duration: '2.6s' },
  { top: '22%', left: '80%', size: 9, delay: '1.3s', duration: '3.6s' },
  { top: '76%', left: '72%', size: 6, delay: '1.9s', duration: '2.9s' },
  { top: '46%', left: '46%', size: 5, delay: '0.3s', duration: '3.1s' },
  { top: '86%', left: '32%', size: 7, delay: '2.3s', duration: '2.8s' },
];

/*
 * Bitta qatorlik matnni banner eniga yetarlicha to'ldirish uchun
 * necha marta takrorlash kerakligini hisoblaydi. Nom uzun bo'lsa
 * kamroq, qisqa bo'lsa ko'proq marta takrorlanadi — natijada har
 * doim qator to'la ko'rinadi, na bo'sh joy qoladi, na ortiqcha
 * uzun matn hisoblanadi.
 */
function buildWatermarkLine(name) {
  const safe = (name || 'LokmaGo').trim().toUpperCase();
  const repeatCount = Math.max(4, Math.ceil(40 / Math.max(safe.length, 4)));
  return `${Array.from({ length: repeatCount }, () => safe).join('  •  ')}  •  `;
}

export function RestaurantBannerFallback({ name }) {
  const line = buildWatermarkLine(name);

  return (
    <div className="rbfb" aria-hidden="true">
      <div className="rbfb__watermark">
        {[0, 1, 2, 3, 4].map((row) => (
          // Toq qatorlar biroz chapga siljitilgan — tekis "to'r"
          // emas, qo'lda yozilgandek tabiiy ko'rinish uchun
          <div key={row} className="rbfb__row" style={row % 2 ? { marginLeft: '-6%' } : undefined}>
            {line}
          </div>
        ))}
      </div>

      <div className="rbfb__sparkles">
        {SPARKLES.map((s, i) => (
          <span
            key={i}
            className="rbfb__spark"
            style={{
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              animationDelay: s.delay,
              animationDuration: s.duration,
            }}
          />
        ))}
      </div>
    </div>
  );
}

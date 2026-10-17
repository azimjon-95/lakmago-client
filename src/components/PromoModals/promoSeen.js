/*
 * Mijoz qaysi reklama oynasini qachon ko'rganini eslab qoladi (shu qurilmada).
 *   daily — Toshkent sanasi bo'yicha kuniga bir marta;
 *   once  — umuman bir marta.
 * Kalit `id:versiya`: admin "Qayta ko'rsatish" desa versiya oshadi va oyna yana chiqadi.
 */
const KEY = 'lokma_promo_seen_v1';
export const todayTashkent = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; }
}
function write(map) {
  try {
    // 60 kundan eski yozuvlar tozalanadi — xotira o'smasin
    const cutoff = todayTashkent(new Date(Date.now() - 60 * 86400_000));
    const clean = Object.fromEntries(Object.entries(map).filter(([, v]) => v >= cutoff).slice(-200));
    localStorage.setItem(KEY, JSON.stringify(clean));
  } catch { /* xotira yopiq (maxfiy rejim) — har safar ko'rsatilishi mumkin */ }
}

export function shouldShow(p, now = new Date()) {
  const v = read()[p.key];
  if (!v) return true;
  if (p.frequency === 'once') return false;
  return v !== todayTashkent(now);
}
export function markSeen(p, now = new Date()) {
  const map = read();
  map[p.key] = todayTashkent(now);
  write(map);
}

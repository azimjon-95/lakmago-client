import { isDishOpen } from '@/hooks/useOpenStatus';

/*
 * ═══════════════════════════════════════════════════════════
 * TAOMLARNI RESTORANLAR BO'YICHA ARALASHTIRISH
 * ═══════════════════════════════════════════════════════════
 *
 * Server taomlarni yaratilgan vaqti bo'yicha beradi. Restoran
 * menyusini bir martada import qilgan bo'lsa, uning 60 ta taomi
 * ketma-ket keladi — bitta sahifa deyarli butunlay bitta restoran.
 * Faqat sahifa ICHIDA aralashtirish buni tuzatmaydi: qatorda baribir
 * 20-30 ta bir xil restoran taomi ketma-ket chiqardi.
 *
 * YECHIM — KUTISH HAVZASI (pool) + TEKIS TAQSIMLASH:
 * Kelgan taomlar havzaga tushadi. Qatorga restoranlar mutanosib
 * aralashgan qism chiqariladi (bitta restoran ketma-ket 2 tadan
 * oshmaydi). Katta restoranning ortiqchasi havzada KUTADI va
 * keyingi sahifadagi boshqa restoranlar bilan aralashadi. Ma'lumot tugaganda
 * (final) havza to'liq bo'shatiladi — hech bir taom yo'qolmaydi.
 *
 * OCHIQ restoranlar taomlari oldin, YOPIQLARI — tasmaning eng
 * oxirida (bosh sahifadagi eski qator qoidasi bilan bir xil).
 *
 * Aralashtirish urug'li (seed) — sessiya davomida barqaror.
 * Bosh sahifadagi pickMixed'dan mustaqil: eski kodga tegilmaydi.
 */

/** Urug'li tasodifiy son generatori (mulberry32). */
function rng(seed) {
  let a = Math.floor((Number(seed) || 0.5) * 2 ** 31) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, seed) {
  const out = [...list];
  const rand = rng(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const restKey = (d) => String(d.restaurantId || d.restaurant?._id || d.restaurant?.id || '');

/**
 * Havzadan qatorga chiqadigan qismni tanlaydi.
 *
 * KAFOLATLANGAN ARALASHTIRISH (ochko'z algoritm): har qadamda ENG
 * KO'P taomi qolgan restoran tanlanadi, lekin u oxirgi IKKI kartani
 * bergan bo'lsa — navbat boshqasiga o'tadi. Natija:
 *   • bitta restoran ketma-ket 2 tadan HECH QACHON oshmaydi;
 *   • katta menyuli restoran imkon qadar erta va tekis tarqaladi —
 *     oxirida bir to'da bo'lib qolmaydi;
 *   • teng sonlilar o'zaro A, B, C, A, B, C... navbatlashadi.
 * Qat'iy navbat (har raundda 1 tadan) buni qila olmasdi: 30% ulushli
 * restoran 1/7 ulush olib, ortiqchasi oxirida to'da bo'lib chiqardi.
 *
 * Faqat bitta restoran qolsa va davomi kutilayotgan bo'lsa (final
 * emas) — qolgani havzada KUTADI va keyingi sahifa bilan aralashadi.
 *
 * `tail` — oldingi to'plamning oxirgi 2 kartasining restorani:
 * cheklov to'plamlar CHEGARASIDA ham ishlaydi.
 *
 * @param {Array} pool
 * @param {number} seed
 * @param {boolean} final — ma'lumot tugadi: hammasini chiqar
 * @param {string[]} [tail]
 * @returns {{ out: Array, rest: Array, tail: string[] }}
 */
export function takeBalanced(pool, seed, final, tail = []) {
  const byRest = new Map();
  for (const d of pool) {
    const k = restKey(d);
    if (!byRest.has(k)) byRest.set(k, []);
    byRest.get(k).push(d);
  }
  const queues = shuffle([...byRest.entries()], seed + 0.37)
    .map(([key, items], i) => ({ key, items: shuffle(items, seed + (i + 1) * 0.013) }));

  const out = [];
  let t = tail.slice(-2);
  for (;;) {
    const live = queues.filter((q) => q.items.length);
    if (!live.length) break;
    const blocked = t.length === 2 && t[0] === t[1] ? t[1] : null;
    const cand = live.filter((q) => q.key !== blocked);
    let pick;
    if (cand.length) {
      pick = cand.reduce((best, q) => (q.items.length > best.items.length ? q : best));
    } else if (final) {
      pick = live[0]; // boshqa hech narsa qolmadi — majburan
    } else {
      break; // kutadi — keyingi sahifa bilan aralashadi
    }
    out.push(pick.items.shift());
    t = [...t, pick.key].slice(-2);
  }
  return { out, rest: queues.flatMap((q) => q.items), tail: t };
}

/** Ro'yxat oxirgi 2 kartasining restorani (to'plamlar chegarasi uchun). */
export function tailOf(list) {
  return list.slice(-2).map(restKey);
}

/** Bitta ro'yxatni to'liq, aralashtirib qaytaradi. */
export function interleaveByRestaurant(list, seed) {
  return takeBalanced(list, seed, true).out;
}

/**
 * Havzaga yangi taomlarni qo'shib, qatorga chiqadigan qismini qaytaradi.
 * `pool` — { open: [], closed: [], tail: [] }, joyida yangilanadi.
 */
export function drainPool(pool, fresh, seed, final) {
  for (const d of fresh) (isDishOpen(d) ? pool.open : pool.closed).push(d);

  const open = takeBalanced(pool.open, seed, final, pool.tail);
  pool.open = open.rest;
  pool.tail = open.tail;
  let out = open.out;

  // Yopiqlar — faqat oxirida, ochiqlarning hammasi chiqqandan keyin
  if (final && pool.closed.length) {
    const closed = takeBalanced(pool.closed, seed + 0.5, true, pool.tail);
    out = out.concat(closed.out);
    pool.closed = [];
    pool.tail = closed.tail;
  }
  return out;
}

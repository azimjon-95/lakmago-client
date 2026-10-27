/*
 * ═══ GPS ↔ SAQLANGAN MANZIL: YUMSHOQ VA ISHONCHLI TEKSHIRUV ═══
 *
 * MAQSAD: mijozni asossiz bezovta QILMASLIK. GPS bir joyda turganda ham 20–50 m "tebranadi", birinchi o'lchov
 * esa ko'pincha eski yoki past aniqlikda bo'ladi. Shuning uchun:
 *
 *  1. Xulosa BITTA o'lchovga tayanmaydi — takroriy (yangi) o'lchovlar yig'iladi (oxirgi WINDOW tasi).
 *  2. Joylashuv xatosi (U) hisobga olinadi: mijoz saqlangan manzildan faqat xatoni ayirgandan KEYIN ham
 *     FAR_BASE_M (100 m) dan uzoq bo'lsa "uzoq" hisoblanadi.  U = max(eng yaxshi aniqlik, TUSHUNTIRILMAGAN og'ish),
 *     og'ish = o'lchovning o'rtacha nuqtadan masofasi MINUS shu o'lchovning O'Z aniqligi (±100 m li nuqta aniq nuqtadan
 *     80 m chetda bo'lsa — bu normal, noaniqlik oshmaydi; ikkita aniq nuqta 200 m farq qilsa — oshadi).
 *     Misol: 50 m farq, ±20 m xato → ogohlantirish YO'Q; 850 m farq, ±25 m → ogohlantirish.
 *  3. Aniqlik past bo'lsa — darhol xulosa chiqarilmaydi, koordinatalar BARQARORLASHISHI kutiladi (BUDGET_MS gacha).
 *  4. Ogohlantirish uchun kamida 2 ta o'lchov ALOHIDA-ALOHIDA "uzoq" ko'rsatishi kerak (bitta sakrash yetmaydi).
 *  5. Barqarorlashmasa — "aniqlik past" (ogohlantirish emas) — mijoz baribir davom etishi mumkin.
 *
 * Bu fayl HECH NARSANI import qilmaydi (toza mantiq) — Node'da vaqtni sun'iy boshqarib sinaladi
 * (tests/gpsCheck.test.mjs). Haqiqiy GPS manbai: lib/gpsSource.js.
 */
export const GPS = {
  FAR_BASE_M: 100,     // xato ayirilgach shuncha uzoq bo'lsagina "uzoq"
  GOOD_ACC_M: 50,      // shundan aniq bo'lsa o'lchov barqaror deb olinadi
  USABLE_ACC_M: 100,   // shundan yomon bo'lsa xulosa chiqarilmaydi (faqat aniq uzoq bo'lsa)
  DEFAULT_ACC_M: 60,   // aniqlik berilmasa (ba'zi Telegram javoblari) — o'rtacha taxmin
  WINDOW: 3,           // oxirgi 3 ta o'lchov: bitta sakrash ("eskirgan") keyingi o'lchovlar bilan chiqib ketadi
  MAX_SAMPLES: 8,
  BUDGET_MS: 15000,    // birinchi o'lchovdan keyin barqarorlashishni kutish chegarasi
  NEXT_WAIT_MS: 4000,  // keyingi yangi o'lchovni bir martalik kutish
  STALL_MS: 6000,      // shuncha vaqt YANGI o'lchov kelmasa (turg'un tarmoq joylashuvi) — kutmasdan yakunlaymiz
  SINGLE_FAR_M: 300,   // faqat BITTA o'lchov olinganda (GPS sekin) — xatodan keyin ham shuncha uzoq bo'lsa
};

const rad = (d) => (d * Math.PI) / 180;

/** Ikki nuqta orasidagi geodezik masofa, metr. */
export function distanceM(a, b) {
  const R = 6371000;
  const dLat = rad(b.lat - a.lat); const dLng = rad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const valid = (f) => f && Number.isFinite(f.lat) && Number.isFinite(f.lng) && !(f.lat === 0 && f.lng === 0);
const accOf = (f, cfg) => (Number.isFinite(f.accuracy) && f.accuracy > 0 ? Math.max(f.accuracy, 3) : cfg.DEFAULT_ACC_M);

/**
 * O'lchovlar (oxirgi WINDOW tasi) → bitta baho: vaznli o'rtacha nuqta (aniqroq o'lchov og'irroq),
 * xato U = max(eng yaxshi aniqlik, tushuntirilmagan og'ish): o'lchovning o'rtachadan masofasi O'Z aniqligidan
 * ortiq qismi. Past aniqlikdagi nuqta o'z xatosi ichida og'sa — bu noaniqlikni oshirmaydi.
 */
export function estimate(samples, cfg = GPS) {
  const s = samples.filter(valid);
  if (!s.length) return null;
  const w = s.map((f) => 1 / accOf(f, cfg) ** 2);
  const sw = w.reduce((a, b) => a + b, 0);
  const mean = {
    lat: s.reduce((a, f, i) => a + f.lat * w[i], 0) / sw,
    lng: s.reduce((a, f, i) => a + f.lng * w[i], 0) / sw,
  };
  const best = Math.min(...s.map((f) => accOf(f, cfg)));
  const spread = Math.max(...s.map((f) => Math.max(0, distanceM(f, mean) - accOf(f, cfg))));
  return { pos: mean, U: Math.max(best, spread), best, spread, n: s.length };
}

/**
 * Baho → holat.  far — xato ayirilgach ham ≥ FAR_BASE_M uzoq;  lowacc — xato juda katta, xulosa yo'q;
 * ok — manzilda (≤ FAR_BASE_M va aniqlik yaxshi);  near — xato hisobga olinganda ham ogohlantirishga yetmaydi.
 */
export function decide(d, U, cfg = GPS) {
  if (d - U >= cfg.FAR_BASE_M) return 'far';
  if (U > cfg.USABLE_ACC_M) return 'lowacc';
  return d <= cfg.FAR_BASE_M && U <= cfg.GOOD_ACC_M ? 'ok' : 'near';
}

/** Ogohlantirish tasdig'i: oxirgi ikki o'lchovning HAR BIRI alohida (o'z xatosi bilan) uzoq ko'rsatishi kerak. */
export function farConfirmed(samples, target, cfg = GPS) {
  const last = samples.filter(valid).slice(-2);
  return last.length >= 2 && last.every((f) => distanceM(f, target) - accOf(f, cfg) >= cfg.FAR_BASE_M);
}

/**
 * Tekshiruv.  source: { first(): Promise<fix>, next(ms): Promise<fix|null> }  (fix = { lat, lng, accuracy, ts? }).
 * first() xato otsa (ruxsat yo'q, signal yo'q ...) — shu xato yuqoriga chiqadi.
 * onUpdate(partial) — jarayon davomida (xarita markeri va "barqarorlashmoqda" yozuvi uchun).
 * Qaytaradi: { state, d, U, pos, n } yoki null (bekor qilingan).
 */
export async function runGpsCheck({ target, source, onUpdate, isCancelled = () => false, now = Date.now, cfg = GPS }) {
  const all = [];
  let lastAdd = now();
  const add = (f) => {
    if (!valid(f)) return false;
    // Aynan bir xil qiymat (kesh / birinchi va oqimning birinchi javobi / qayta so'ralgan eski nuqta) — YANGI o'lchov
    // EMAS: soxta "takroriy tasdiq" bo'lmasligi uchun vaqt belgisidan qat'i nazar hisobga olinmaydi.
    if (all.slice(-3).some((p) => p.lat === f.lat && p.lng === f.lng && p.accuracy === f.accuracy)) return false;
    all.push(f);
    lastAdd = now();
    return true;
  };
  const evaluate = () => {
    const win = all.slice(-cfg.WINDOW);
    const est = estimate(win, cfg);
    const d = distanceM(est.pos, target);
    return { ...est, d, state: decide(d, est.U, cfg), confirmed: farConfirmed(win, target, cfg), total: all.length };
  };

  const f0 = await source.first();
  if (isCancelled()) return null;
  if (!add(f0)) throw Object.assign(new Error('Qurilma noto‘g‘ri koordinata qaytardi'), { code: 'unavailable' });
  const t0 = now();

  for (;;) {
    const e = evaluate();
    const out = (state) => ({ state, d: e.d, U: e.U, pos: e.pos, n: e.total });

    // Erta chiqish: manzilda / barqaror / tasdiqlangan uzoq
    if (e.state === 'ok') return out('ok');
    if (e.state === 'far' && e.confirmed) return out('far');
    if (e.n >= 2 && e.U <= cfg.GOOD_ACC_M && e.state !== 'far' && e.state !== 'lowacc') return out(e.state);   // barqaror

    const elapsed = now() - t0;
    const stalled = now() - lastAdd >= cfg.STALL_MS;
    if (all.length >= cfg.MAX_SAMPLES || elapsed >= cfg.BUDGET_MS || stalled) {
      // Vaqt tugadi: tasdiqlanmagan "uzoq" → ogohlantirmaymiz (yumshoq). Faqat bitta o'lchov bo'lib, u juda uzoq bo'lsa — uzoq.
      if (e.state === 'far') return out(e.total === 1 && e.d - e.U >= cfg.SINGLE_FAR_M ? 'far' : (e.U > cfg.USABLE_ACC_M ? 'lowacc' : 'near'));
      return out(e.state);
    }

    onUpdate?.({ state: 'checking', d: e.d, U: e.U, pos: e.pos, n: e.total, elapsed });
    const fix = await source.next(Math.min(cfg.NEXT_WAIT_MS, cfg.BUDGET_MS - elapsed, Math.max(500, cfg.STALL_MS - (now() - lastAdd))));
    if (isCancelled()) return null;
    if (fix) add(fix);
  }
}

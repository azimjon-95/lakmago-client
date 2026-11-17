/*
 * ═══ TEZ JOYLASHUV: BIR NECHA MANBADAN ENG YAXSHI NUQTA (toza mantiq, platformaga bog'liq emas) ═══
 *
 * MUAMMO (mijozlar shikoyati): «Joylashuvni avtomatik aniqlash» 15–25 s «Aniqlanmoqda...» bo'lib turardi.
 *   • Brauzer kuzatuvi aniqlik ≤ 20 m bo'lguncha TO'LIQ 15 s kutardi. Bino ichida GPS hech qachon 20 m ga yetmaydi —
 *     demak bino ichida HAR DOIM 15 s.
 *   • Faqat aniq GPS so'ralardi (enableHighAccuracy). Bino ichida u umuman javob bermasa — xato, garchi telefon
 *     Wi-Fi/uyali tarmoq bo'yicha joyni 1–2 s da bera olsa ham.
 *   • Telegram'da avval Telegram (8 s gacha), keyin brauzer (15 s) — KETMA-KET.
 *
 * YECHIM: manbalar PARALLEL ishlaydi (aniq GPS kuzatuvi + tarmoq bo'yicha tezkor joy [+ ruxsat berilgan Telegram]),
 * eng aniq nuqta saqlanadi va yetarli bo'lishi bilan TO'XTAYMIZ:
 *   aniqlik ≤ EXCELLENT_M (30 m)  → darhol;
 *   aniqlik ≤ PRECISE_M (80 m)    → yana SETTLE_PRECISE_MS kutib (GPS aniqlashtirsa — yaxshiroq), keyin;
 *   har qanday birinchi nuqta     → SETTLE_ANY_MS ichida yaxshilanmasa ham shu (bino ichi: tarmoq bo'yicha joy) —
 *                                   chaqiruvchi aniq bo'lmagan joyni XARITADA tasdiqlatadi (noto'g'ri manzil ketmaydi);
 *   hech nuqta yo'q               → TOTAL_MS (sovuq GPS ochiq havoda) → xato.
 * Ruxsat rad etilsa — darhol 'denied'. Barcha manbalar xato bersa — darhol (kutib o'tirmaymiz).
 *
 * Bu fayl hech narsa import qilmaydi — Node'da sun'iy vaqt bilan sinaladi (tests/fixCollector.test.mjs).
 * Koordinatalar log qilinmaydi va diskka yozilmaydi (faqat xotirada, ilova yopilsa yo'qoladi).
 */
export const FIX = {
  EXCELLENT_M: 30,
  PRECISE_M: 80,
  SETTLE_PRECISE_MS: 1500,
  SETTLE_ANY_MS: 4000,
  TOTAL_MS: 15000,
};

export class FixError extends Error {
  constructor(code, message = code) { super(message); this.name = 'FixError'; this.code = code; }
}

const validFix = (f) => f && Number.isFinite(f.lat) && Number.isFinite(f.lng)
  && Math.abs(f.lat) <= 90 && Math.abs(f.lng) <= 180 && !(f.lat === 0 && f.lng === 0);
const accOf = (f) => (Number.isFinite(f?.accuracy) ? f.accuracy : Infinity);

/**
 * @param {Array<(onFix:(f)=>void, onErr:(kind:'denied'|'other')=>void) => (()=>void)|void>} sources
 *        Har biri ishga tushadi va to'xtatish funksiyasini qaytaradi.
 * @param {{ initial?: object, signal?: AbortSignal, cfg?: typeof FIX, timers?: {set,clear,now} }} opts
 * @returns {Promise<{lat,lng,accuracy}>}  rad: FixError code 'denied' | 'timeout' | 'unavailable'
 */
export function collectFix(sources, { initial = null, signal, cfg = FIX, timers } = {}) {
  const T = timers || { set: (fn, ms) => setTimeout(fn, ms), clear: (id) => clearTimeout(id), now: () => Date.now() };
  return new Promise((resolve, reject) => {
    let best = null;
    let done = false;
    let deadline = Infinity;
    let timer = null;
    let denied = false;
    const failed = new Set();
    const stops = [];

    const finish = (err) => {
      if (done) return;
      done = true;
      if (timer !== null) T.clear(timer);
      for (const s of stops) { try { s?.(); } catch { /* */ } }
      if (best) {
        const out = { lat: best.lat, lng: best.lng, accuracy: Number.isFinite(best.accuracy) ? best.accuracy : null };
        if (best.source) out.source = best.source;
        resolve(out);
      } else reject(err || new FixError(denied ? 'denied' : 'timeout'));
    };
    const arm = (ms) => {
      const at = T.now() + ms;
      if (at >= deadline) return;
      deadline = at;
      if (timer !== null) T.clear(timer);
      timer = T.set(() => finish(), Math.max(0, ms));
    };
    const consider = (f) => {
      if (done || !validFix(f)) return;
      const first = !best;
      if (!best || accOf(f) < accOf(best)) best = f;
      const a = accOf(best);
      if (a <= cfg.EXCELLENT_M) { finish(); return; }
      if (a <= cfg.PRECISE_M) arm(cfg.SETTLE_PRECISE_MS);
      if (first) arm(cfg.SETTLE_ANY_MS);
    };

    if (signal) {
      if (signal.aborted) { finish(new FixError('timeout', 'aborted')); return; }
      signal.addEventListener('abort', () => finish(new FixError('timeout', 'aborted')), { once: true });
    }

    sources.forEach((start, i) => {
      if (done) return;
      const onErr = (kind) => {
        if (done || failed.has(i)) return;
        failed.add(i);
        if (kind === 'denied') denied = true;
        if (denied && !best) { finish(new FixError('denied')); return; }
        if (failed.size >= sources.length) finish(new FixError(denied ? 'denied' : 'unavailable'));
      };
      try { stops.push(start(consider, onErr)); } catch { onErr('other'); }
    });

    if (!done) {
      consider(initial);   // masalan Telegram'dan kelgan taxminiy nuqta — manbalar uni faqat yaxshilashi mumkin
      if (!done) arm(cfg.TOTAL_MS);
    }
    if (sources.length === 0 && !done) finish(new FixError('unsupported'));
  });
}

/* ═══ Oxirgi nuqta (faqat XOTIRADA) — qayta-qayta kutmaslik uchun ═══ */
let last = null;
/** Har qanday muvaffaqiyatli o'lchovni eslab qoladi (tuman aniqlash, manzil, kuzatuv — hammasi). */
export function rememberFix(f, now = Date.now()) {
  if (!validFix(f)) return;
  const acc = accOf(f);
  // Yangiroq yoki aniqroq bo'lsa almashtiramiz (2 daqiqadan eski aniq nuqta yangi noaniqdan ustun emas)
  if (!last || acc <= accOf(last) || now - last.at > 120_000) {
    last = { lat: f.lat, lng: f.lng, accuracy: Number.isFinite(f.accuracy) ? f.accuracy : null, at: now };
  }
}
/** maxAgeMs ichida va aniqligi ≤ maxAccM bo'lgan oxirgi nuqta yoki null. */
export function recentFix(maxAgeMs, maxAccM = Infinity, now = Date.now()) {
  if (!last || now - last.at > maxAgeMs || accOf(last) > maxAccM) return null;
  return { lat: last.lat, lng: last.lng, accuracy: last.accuracy, at: last.at };
}
export function _resetFixMemory() { last = null; }

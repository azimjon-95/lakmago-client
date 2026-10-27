import { getCurrentPosition, watchFixes, withTimeout } from './location';

/*
 * ═══ GPS MANBASI (lib/gpsCheck.js uchun) ═══
 *
 *   first() — BIRINCHI o'lchov: GPS oqimi (har bir yangi nuqta) VA mavjud getCurrentPosition() (Telegram/native
 *             ruxsat oqimlari) PARALLEL ishga tushadi, qaysi biri avval javob bersa — shu. Oqim yaxshi, chunki
 *             sovuq GPS'da getCurrentPosition() 15 s gacha "yaxshi aniqlik"ni kutib, hech narsa ko'rsatmaydi.
 *             getCurrentPosition() xatosi (ruxsat yo'q, qo'llanmaydi ...) — yuqoriga chiqadi.
 *   next(ms) — KEYINGI yangi o'lchov (oqimdan), `ms` ichida kelmasa null.
 *              Oqim yo'q (Telegram brauzer GPS'ini bermasa) — bitta yangi so'rov (getCurrentPosition).
 *   close() — oqimni to'xtatadi (batareya!). Tekshiruv tugagach/bekor bo'lganda DOIM chaqiriladi.
 */
export function createFixSource({ getFirst = getCurrentPosition, watch = watchFixes } = {}) {
  const queue = [];
  let wake = null;      // next() kutayotgan
  let onFirst = null;   // first() kutayotgan
  let stop = null;
  let live = false;
  let closed = false;
  const ctl = new AbortController();   // getFirst()ning ichki GPS kuzatuvini to'xtatish uchun

  const stamp = (f) => ({ ...f, ts: f.ts ?? Date.now() });
  const push = (f) => {
    if (closed) return;
    const fix = stamp(f);
    // Oqim birinchi o'lchovni berdi — demak ruxsat bor; ikkinchi (getCurrentPosition) kuzatuvi keraksiz: batareya
    if (onFirst) { const r = onFirst; onFirst = null; ctl.abort(); r(fix); return; }
    queue.push(fix);
    if (queue.length > 20) queue.shift();
    if (wake) { const w = wake; wake = null; w(); }
  };
  const start = () => {
    if (stop || closed) return;
    try { stop = watch(push, () => { live = false; }); } catch { stop = null; }
    live = Boolean(stop);
  };

  return {
    first() {
      start();
      return new Promise((resolve, reject) => {
        onFirst = resolve;
        getFirst({ signal: ctl.signal }).then(
          (f) => { if (onFirst === resolve) { onFirst = null; resolve(stamp(f)); } },
          (e) => { if (onFirst === resolve) { onFirst = null; reject(e); } },
        );
      });
    },
    next(ms) {
      if (queue.length) return Promise.resolve(queue.shift());
      if (!live) return withTimeout(getFirst({ signal: ctl.signal }).then(stamp), ms, null).catch(() => null);
      return new Promise((resolve) => {
        const t = setTimeout(() => { wake = null; resolve(null); }, ms);
        wake = () => { clearTimeout(t); resolve(queue.shift() ?? null); };
      });
    },
    close() {
      closed = true; wake = null; onFirst = null;
      ctl.abort();
      try { stop?.(); } catch { /* */ }
      stop = null;
    },
  };
}

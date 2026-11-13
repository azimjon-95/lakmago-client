/*
 * UMUMIY SCROLL HOLATI — pastki menyu, savat paneli va operator tugmasi shu bitta manbadan harakatlanadi (Instagram kabi).
 * Pastga scroll → <html class="is-compact">: menyu kichrayib pastda turadi; yuqoriga scroll (yoki sahifa tepasi) → qaytadi.
 *
 * Avvalgi xatolar (videoda menyu "o'ynardi"):
 *   • gorizontal karusel surilganda ham `scroll` hodisasi tutilardi (scrollTop = 0 → "tepada" deb hisoblanib menyu kengayardi);
 *   • iOS'da sahifa oxirida/boshida "bounce" yo'nalishni teskari ko'rsatardi → menyu pirpirardi;
 *   • har hodisada qaror qilinardi (rAF yo'q).
 * Endi: faqat HUJJAT scrolli (yoki haqiqiy vertikal skroll konteyneri); bounce chegaradan tashqarida e'tiborsiz;
 * qaror kadrda bir marta; to'plangan masofa bo'yicha (gisterezis) — mayda siljishlar holatni o'zgartirmaydi.
 */
export const COMPACT_AFTER = 64;   // px: shundan pastroqda ixchamlashadi
export const DOWN_DIST = 18;       // px: shuncha PASTGA harakat — ixcham
export const UP_DIST = 26;         // px: shuncha YUQORIGA harakat — qaytadi (sal qaytarish menyuni ochmasin)
export const TOP_EPS = 8;          // px: sahifa tepasi — har doim to'liq
export const MIN_SCROLLABLE = 140; // px: sahifa shundan qisqa bo'lsa ixchamlashmaydi (surish deyarli yo'q)

/** Toza holat mashinasi: step(y, max) → ixchammi. y — joriy scroll, max — eng katta scroll (scrollHeight − ko'rinish). */
export function createCompactTracker() {
  let compact = false;
  let last = null;
  let dir = 0;
  let acc = 0;
  return function step(y, max) {
    const m = Math.max(0, max);
    const c = Math.min(Math.max(y, 0), m);   // bounce (manfiy / oxiridan oshgan) chegaraga qisqartiriladi
    if (last === null) { last = c; return compact; }
    const dy = c - last;
    last = c;
    if (m < MIN_SCROLLABLE || c <= TOP_EPS) { compact = false; dir = 0; acc = 0; return compact; }
    if (Math.abs(dy) < 1) return compact;
    const d = Math.sign(dy);
    if (d !== dir) { dir = d; acc = 0; }   // yo'nalish o'zgarsa — hisob qayta boshlanadi
    acc += dy;
    if (dir > 0 && acc >= DOWN_DIST && c > COMPACT_AFTER) compact = true;
    else if (dir < 0 && -acc >= UP_DIST) compact = false;
    return compact;
  };
}

const isDoc = (t) => t === document || t === window || t === document.documentElement || t === document.body;
// Haqiqiy vertikal skroll konteyneri (gorizontal karusel emas): ko'rinish yetarlicha baland va ichida vertikal oshiq kontent bor
const isVerticalScroller = (el) => el && el.clientHeight >= 200 && el.scrollHeight - el.clientHeight > 40;

let installed = false;

export function installScrollCompact() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const root = document.documentElement;
  const trackers = new WeakMap();
  let pending = null;
  let raf = 0;

  const read = (t) => {
    if (isDoc(t)) {
      const y = window.scrollY || root.scrollTop || 0;
      return { key: document, y, max: root.scrollHeight - window.innerHeight };
    }
    if (!isVerticalScroller(t)) return null;
    return { key: t, y: t.scrollTop || 0, max: t.scrollHeight - t.clientHeight };
  };

  const flush = () => {
    raf = 0;
    const p = pending; pending = null;
    if (!p) return;
    let step = trackers.get(p.key);
    if (!step) { step = createCompactTracker(); trackers.set(p.key, step); }
    const want = step(p.y, p.max);
    if (want !== root.classList.contains('is-compact')) root.classList.toggle('is-compact', want);
  };

  document.addEventListener('scroll', (e) => {
    const r = read(e.target);
    if (!r) return;
    pending = r;
    if (!raf) raf = requestAnimationFrame(flush);
  }, { capture: true, passive: true });
}

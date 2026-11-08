/*
 * UMUMIY SCROLL HOLATI — pastki menyu, savat paneli va operator tugmasi shu bitta manbadan harakatlanadi.
 * Pastga scroll → <html class="is-compact">: kapsulalar 58 → 46 px ga kichrayadi (CSS: --cap-h).
 * Yuqoriga / tepaga → o'z holiga qaytadi. Kichik siljishlar (3 px dan kam) e'tiborga olinmaydi.
 */
const COMPACT_AFTER = 72;   // px: shundan pastroqda ixchamlashadi
const MIN_DELTA = 3;        // px: titrashni oldini oladi
const EXPAND_AFTER = 64;    // px: yuqoriga shuncha harakat bo'lmaguncha ixchamlik saqlanadi (sal scroll qaytarmaydi)

let installed = false;
const isDoc = (t) => t === document || t === window || t === document.documentElement || t === document.body;

export function installScrollCompact() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const last = new WeakMap();
  last.set(document, window.scrollY || document.documentElement.scrollTop || 0);
  let compact = false;
  let dir = 0;   // oxirgi harakat yo'nalishi (+1 pastga, -1 yuqoriga)
  let acc = 0;   // shu yo'nalishdagi to'plangan masofa
  const onScroll = (e) => {
    const t = e.target;
    const y = isDoc(t) ? (window.scrollY || document.documentElement.scrollTop || 0) : (t.scrollTop || 0);
    const key = isDoc(t) ? document : t;
    const prev = last.has(key) ? last.get(key) : y;
    last.set(key, y);
    const dy = y - prev;
    if (Math.abs(dy) < MIN_DELTA && y > 8) return;
    const d = Math.sign(dy);
    if (d !== dir) { dir = d; acc = 0; }   // yo'nalish o'zgarsa — hisob qayta boshlanadi
    acc += dy;
    let want = null;
    if (y <= 8) want = false;
    else if (dy > 0 && y > COMPACT_AFTER) want = true;
    else if (dy < 0 && acc <= -EXPAND_AFTER) want = false;   // faqat yetarli yuqoriga harakatdan keyin kengayadi
    if (want === null || want === compact) return;
    compact = want;
    document.documentElement.classList.toggle('is-compact', compact);
  };
  document.addEventListener('scroll', onScroll, { capture: true, passive: true });
}

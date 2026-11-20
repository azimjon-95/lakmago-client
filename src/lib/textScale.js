/*
 * ═══ MATN MASSHTABI (Android "Shrift o'lchami") ═══
 *
 * Android WebView tizim shrift masshtabini (Samsung: Sozlamalar → Displey → Shrift o'lchami) har bir px shriftga ko'paytiradi.
 * Natija: kartalar, tugmalar, "Buyurtma turi" kabi bo'limlar matn sig'may buziladi (Samsung Note/S Ultra).
 * Biz uni o'lchaymiz va --tz o'zgaruvchisiga yozamiz; build/postcssFontScale.mjs har bir font-size ni --tz ga bo'ladi,
 * shunda ekranda matn dizayndagi o'lchamda chiqadi (iPhone 13 Pro'dagi kabi). Chrome/Safari/iOS'da --tz = 1 (o'zgarish yo'q).
 */
export const TZ_MIN = 1.04;   // shundan kichik og'ish o'lchov xatosi
export const TZ_MAX = 2;

/** Skrinridersiz toza hisob: o'lchangan balandlik / kutilgan balandlik → masshtab. */
export function zoomFromProbe(measured, expected) {
  if (!Number.isFinite(measured) || !Number.isFinite(expected) || expected <= 0) return 1;
  const r = measured / expected;
  if (r < TZ_MIN || r > TZ_MAX) return 1;
  return Math.round(r * 100) / 100;
}

export function measureTextZoom(doc = document) {
  const SIZE = 100;
  const el = doc.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  // calc(var(--tz)) ishlatilmaydi — xom px o'lchanadi
  el.style.cssText = `position:absolute;left:-9999px;top:0;visibility:hidden;pointer-events:none;font:${SIZE}px/1 sans-serif;font-size:${SIZE}px;line-height:1;white-space:nowrap;-webkit-text-size-adjust:100%;text-size-adjust:100%;`;
  el.textContent = 'Hg';
  doc.body.appendChild(el);
  const h = el.getBoundingClientRect().height;
  doc.body.removeChild(el);
  return zoomFromProbe(h, SIZE);
}

let last = 1;
export function applyTextZoom(doc = document, z = measureTextZoom(doc)) {
  const root = doc.documentElement;
  if (z === last && root.style.getPropertyValue('--tz')) return z;
  last = z;
  root.style.setProperty('--tz', String(z));
  if (z > 1) root.setAttribute('data-tz', String(z)); else root.removeAttribute('data-tz');
  return z;
}

export function startTextScale() {
  if (typeof document === 'undefined') return;
  const run = () => { try { applyTextZoom(); } catch { /* */ } };
  const boot = () => {
    run();
    // Mijoz shriftni sozlamalarda o'zgartirib qaytsa (ilova fonda edi) — qayta o'lchaymiz
    document.addEventListener('visibilitychange', () => { if (!document.hidden) run(); });
    window.addEventListener('resize', run);
    window.addEventListener('focus', run);
  };
  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot, { once: true });
}

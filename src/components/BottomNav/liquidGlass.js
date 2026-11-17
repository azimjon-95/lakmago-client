/*
 * ═══ LIQUID GLASS: haqiqiy sinish (refraction) + sprinq harakati ═══
 * 1) attachRefraction(nav): menyu o'lchamiga mos "siljitish xaritasi" (displacement map) chizadi va SVG filtr (feDisplacementMap)
 *    yaratadi. Filtr `backdrop-filter: url(#…)` orqali shisha ortidagi kontentni kapsula chetida egadi/cho'zadi (lupa linzasi).
 *    Xarita: chetdan ichkariga qarab kuchsizlashuvchi (qavariq linza profili) siljish, markazda — nol.
 *    Faqat Chromium (Chrome, Android WebView, Telegram Android) `backdrop-filter: url()` ni qo'llaydi; iOS/Safari WebKit — yo'q,
 *    u yerda toza CSS shisha (blur + qirra) qoladi (class `fnav--refract` qo'yilmaydi).
 * 2) springKeyframes(): prujinali (spring) siljish kadrlari — Framer Motion o'rnatilmagan, shuning uchun Web Animations API.
 */
const NS = 'http://www.w3.org/2000/svg';
let uid = 0;

/** iOS/iPadOS (har qanday brauzer, Telegram, Capacitor ilova — hammasi WebKit). iPadOS 13+ "Macintosh" deb tanishtiradi. */
export function isIOSDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1);
}

/** Prujina holati t soniyada (0 → 1): stiffness 300, damping 28 — kapsula va linza uchun bir xil. */
export function springPos(t, stiffness = 300, damping = 28) {
  const w0 = Math.sqrt(stiffness); const zeta = damping / (2 * w0); const wd = w0 * Math.sqrt(Math.max(1 - zeta * zeta, 0.0001));
  return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + (zeta * w0 / wd) * Math.sin(wd * t));
}

export function supportsRefraction() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua)) return false;           // iOS'dagi barcha brauzerlar/WebView = WebKit
  if (!/Chrom(e|ium)\/\d+/.test(ua)) return false;
  try { return CSS.supports('backdrop-filter', 'blur(1px)') && typeof ResizeObserver !== 'undefined'; } catch { return false; }
}

// Siljish xaritasi: R = x, G = y (128 = siljishsiz). Kapsula (stadium) shakli, chetdan `bezel` px ichkarida kuchsizlashadi.
function buildMap(w, h, bezel) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const r = h / 2; const cy = h / 2;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      const qx = Math.min(Math.max(x + 0.5, r), w - r);
      const vx = x + 0.5 - qx; const vy = y + 0.5 - cy;
      const len = Math.hypot(vx, vy);
      const d = r - len;                                    // chetgacha masofa (ichkarida musbat)
      let dx = 0; let dy = 0;
      if (len > 0.001 && d < bezel) {
        const t = Math.max(0, d) / bezel;                   // 0 = chet, 1 = bezel oxiri
        const m = (1 - t) * (1 - t) * (1 - t * 0.2);        // chetda kuchli, ichkarida silliq so'nadi
        dx = (vx / len) * m; dy = (vy / len) * m;           // tashqariga qarab: chetdagi piksel ichkaridan "tortiladi" → lupa
      }
      img.data[i] = Math.round(128 + dx * 127);
      img.data[i + 1] = Math.round(128 + dy * 127);
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

export function attachRefraction(nav, { scale = 84, bezel = 26 } = {}) {
  if (!nav || !supportsRefraction()) return { pulse() {}, dispose() {} };
  const id = `fnav-r-${(uid += 1)}`;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
  svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
  const filter = document.createElementNS(NS, 'filter');
  filter.setAttribute('id', id); filter.setAttribute('filterUnits', 'userSpaceOnUse');
  filter.setAttribute('color-interpolation-filters', 'sRGB');
  const feImage = document.createElementNS(NS, 'feImage');
  feImage.setAttribute('x', '0'); feImage.setAttribute('y', '0'); feImage.setAttribute('result', 'map');
  feImage.setAttribute('preserveAspectRatio', 'none');
  const disp = document.createElementNS(NS, 'feDisplacementMap');
  disp.setAttribute('in', 'SourceGraphic'); disp.setAttribute('in2', 'map');
  disp.setAttribute('xChannelSelector', 'R'); disp.setAttribute('yChannelSelector', 'G');
  disp.setAttribute('scale', String(scale));
  filter.append(feImage, disp); svg.append(filter);
  nav.append(svg);

  let lastW = 0; let lastH = 0; let timer = 0; let raf = 0; let dead = false;
  const rebuild = () => {
    if (dead) return;
    const w = Math.round(nav.offsetWidth); const h = Math.round(nav.offsetHeight);
    if (!w || !h || (w === lastW && h === lastH)) return;
    lastW = w; lastH = h;
    const href = buildMap(w, h, bezel);
    feImage.setAttribute('href', href); feImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', href);
    feImage.setAttribute('width', String(w)); feImage.setAttribute('height', String(h));
    filter.setAttribute('x', '0'); filter.setAttribute('y', '0'); filter.setAttribute('width', String(w)); filter.setAttribute('height', String(h));
    nav.style.setProperty('--fn-refract', `url(#${id})`);
    nav.classList.add('fnav--refract');
  };
  rebuild();
  const ro = new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(rebuild, 120); });
  ro.observe(nav);

  // Tab almashganda shisha "suyuq" egiladi: sinish kuchi vaqtincha oshadi va qaytadi
  const pulse = (ms = 560, peak = 1.5) => {
    cancelAnimationFrame(raf);
    const t0 = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      const bump = Math.sin(Math.PI * k);
      disp.setAttribute('scale', String(scale * (1 + (peak - 1) * bump)));
      if (k < 1 && !dead) raf = requestAnimationFrame(tick); else disp.setAttribute('scale', String(scale));
    };
    raf = requestAnimationFrame(tick);
  };
  return {
    pulse,
    dispose() { dead = true; clearTimeout(timer); cancelAnimationFrame(raf); ro.disconnect(); svg.remove(); nav.classList.remove('fnav--refract'); nav.style.removeProperty('--fn-refract'); },
  };
}

/**
 * Prujinali siljish: from → to (tab raqamlari). Qaytaradi { move, stretch, ms } — Web Animations kadrlari.
 * move: pill'ning translateX(%) kadrlari; stretch: tezlikka mutanosib suyuq cho'zilish (scaleX↑, scaleY↓).
 * Sal-pal oshib ketadi (≈2%), keyin o'rnashadi — "haddan tashqari sakrash" yo'q.
 */
export function springKeyframes(from, to, { stiffness = 300, damping = 28, steps = 44, maxMs = 620 } = {}) {
  const dist = to - from;
  const pos = (t) => springPos(t, stiffness, damping);
  const T = maxMs / 1000;
  const move = []; const stretch = [];
  const vmax = 1.8;                                        // normalizatsiya (≈ eng yuqori tezlik, tab/soniya)
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * T;
    const p = pos(t);
    const v = Math.abs((pos(t + 0.004) - pos(Math.max(0, t - 0.004))) / 0.008) * Math.abs(dist);
    const f = Math.min(1, v / (vmax * Math.max(Math.abs(dist), 1)) ) * Math.min(1, 0.55 + Math.abs(dist) * 0.2);
    move.push({ transform: `translateX(${(from + dist * p) * 100}%)`, offset: i / steps });
    stretch.push({ transform: `scale(${1 + 0.2 * f}, ${1 - 0.08 * f})`, offset: i / steps });
  }
  return { move, stretch, ms: maxMs };
}

/*
 * ═══ LINZA — iOS 26 Liquid Glass tab bar (FAQAT iOS; Android'da avvalgi kapsula) ═══
 * Menyu ilovada BITTA va doimiy (NavHost) — sahifa almashganda qayta yaratilmaydi, shuning uchun linza uzilmaydi.
 *   • Tab almashganda (bosish yoki orqaga) — slide(from, to): tanlov TINIQ SHISHA TOMCHISIGA aylanib, prujina bilan
 *     yangi tabga suriladi; yo'lidagi ikonkalar kattalashib o'tadi (lensScales), keyin oddiy rangli kapsulaga o'tiradi.
 *     Ekranda bir vaqtda faqat BITTA shakl harakatlanadi (eski prujinali kapsula iOS'da ishlatilmaydi).
 *   • Menyu bo'ylab barmoq surish — tomchi barmoqqa ergashadi, har yangi tabda yengil tebranish, qo'yib yuborilganda
 *     eng yaqin tab ochiladi.
 * Hammasi transform/opacity bilan (WebKit `backdrop-filter: url()` ni qo'llamaydi). Harakat kamaytirilgan bo'lsa — o'chiq.
 */
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

/** Linza markazi x da bo'lsa har tabning kattalashishi: 1 … 1+peak (radius tashqarisida 1). */
export function lensScales(x, centers, radius, peak = 0.24) {
  return centers.map((c) => {
    const t = clamp(1 - Math.abs(x - c) / radius, 0, 1);
    return 1 + peak * t * t * (3 - 2 * t);
  });
}

/** x ga eng yaqin tab raqami. */
export function nearestIndex(x, centers) {
  let best = 0;
  centers.forEach((c, i) => { if (Math.abs(x - c) < Math.abs(x - centers[best])) best = i; });
  return best;
}

export function attachLens(nav, { onSelect, haptic, getActive, dragThreshold = 8, slideMs = 240 } = {}) {
  const noop = { slide() { return false; }, dispose() {} };
  if (!nav || typeof window === 'undefined' || typeof nav.addEventListener !== 'function') return noop;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return noop;
  const lens = document.createElement('span');
  lens.className = 'fnav__lens';
  lens.setAttribute('aria-hidden', 'true');
  lens.innerHTML = '<span class="fnav__lens-gl"></span>';
  nav.append(lens);

  let st = null; let suppressClick = false; let settle = 0; let anim = 0; let skipSlideTo = -1;
  const tabsOf = () => Array.from(nav.querySelectorAll('.fnav__tab'));
  const geo = () => {
    const r = nav.getBoundingClientRect();
    const ts = tabsOf();
    const cs = ts.map((t) => { const b = t.getBoundingClientRect(); return b.left - r.left + b.width / 2; });
    const w = ts[0] ? ts[0].getBoundingClientRect().width : r.width / 4;
    return { r, ts, cs, w };
  };
  const place = (x, g) => {
    lens.style.width = `${g.w}px`;
    lens.style.setProperty('--fn-lx', `${(x - g.w / 2).toFixed(1)}px`);
    const s = lensScales(x, g.cs, g.w * 0.95);
    g.ts.forEach((t, i) => t.style.setProperty('--fn-mag', s[i].toFixed(3)));
  };
  // Telegram/iOS 26 ritmi: bosilganda tomchi darhol paydo bo'lib kattalashadi (is-press), suriladi, sal kattaroq
  // qo'nadi (is-land) va ~140 ms da rangli kapsulaga aylanadi. Butun yo'l ≈ 0,5 s (avval ~0,8 s).
  const show = () => { clearTimeout(settle); nav.classList.remove('is-land'); nav.classList.add('is-lens', 'is-press'); };
  const release = (land = true) => {
    cancelAnimationFrame(anim);
    clearTimeout(settle);
    nav.classList.remove('is-dragging', 'is-press');
    if (land) nav.classList.add('is-land');
    settle = setTimeout(() => {
      nav.classList.remove('is-lens', 'is-land');
      tabsOf().forEach((t) => t.style.removeProperty('--fn-mag'));
    }, land ? 90 : 60);
  };
  /** Tanlovni from → to tabga tomchi bilan suradi. true — linza ko'rsatildi (kapsula yashirin turishi kerak). */
  const slide = (from, to) => {
    if (skipSlideTo === to) { skipSlideTo = -1; return false; }  // surib tanlangan — tomchi allaqachon o'sha yerda
    if (from < 0 || to < 0 || from === to || st) return false;
    const g = geo();
    if (!g.cs[from] && g.cs[from] !== 0) return false;
    cancelAnimationFrame(anim);
    show();
    nav.classList.add('is-dragging');
    const x0 = g.cs[from]; const x1 = g.cs[to];
    place(x0, g);
    const t0 = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / slideMs);
      place(x0 + (x1 - x0) * springPos((k * slideMs) / 1000, 520, 36), g);
      if (k < 1) anim = requestAnimationFrame(tick); else { place(x1, g); release(); }
    };
    anim = requestAnimationFrame(tick);
    return true;
  };

  const onDown = (e) => {
    if (e.button > 0 || e.isPrimary === false) return;
    const tab = e.target.closest?.('.fnav__tab');
    if (!tab) return;
    const g = geo();
    const i = g.ts.indexOf(tab);
    if (i < 0) return;
    st = { id: e.pointerId, x0: e.clientX, dragging: false, idx: i, g };
    // Barmoq tekkan zahoti: tomchi joriy tanlov ustida paydo bo'lib kattalashadi (sahifa yuklanishini kutmaydi)
    const cur = typeof getActive === 'function' ? getActive() : -1;
    if (cur >= 0 && g.cs[cur] !== undefined) { cancelAnimationFrame(anim); place(g.cs[cur], g); show(); }
  };
  const onMove = (e) => {
    if (!st || e.pointerId !== st.id) return;
    if (!st.dragging) {
      if (Math.abs(e.clientX - st.x0) < dragThreshold) return;
      st.dragging = true;
      cancelAnimationFrame(anim);
      show();
      nav.classList.add('is-dragging');
      try { nav.setPointerCapture(e.pointerId); } catch { /* */ }
    }
    const g = st.g;
    const x = clamp(e.clientX - g.r.left, g.cs[0], g.cs[g.cs.length - 1]);
    place(x, g);
    const i = nearestIndex(x, g.cs);
    if (i !== st.idx) { st.idx = i; try { haptic?.(); } catch { /* */ } }
  };
  const onUp = (e) => {
    if (!st || e.pointerId !== st.id) return;
    const s = st; st = null;
    if (!s.dragging) {
      // Oddiy bosish: click tanlovni o'zgartiradi → slide() tomchini suradi. O'sha tabning o'zi bo'lsa — joyida qo'nadi.
      const cur = typeof getActive === 'function' ? getActive() : -1;
      if (s.idx === cur) release();
      else settle = setTimeout(() => { if (!nav.classList.contains('is-dragging')) release(); }, 250);
      return;
    }
    place(s.g.cs[s.idx], s.g);
    release();
    suppressClick = true;                    // surishdan keyingi "click" ikkinchi marta ochmasin
    setTimeout(() => { suppressClick = false; }, 400);
    skipSlideTo = s.idx;
    setTimeout(() => { if (skipSlideTo === s.idx) skipSlideTo = -1; }, 1500);
    onSelect?.(s.idx);
  };
  const onCancel = (e) => { if (st && e.pointerId === st.id) { st = null; release(false); } };
  const onClick = (e) => { if (suppressClick) { suppressClick = false; e.preventDefault(); e.stopPropagation(); } };

  nav.addEventListener('pointerdown', onDown);
  nav.addEventListener('pointermove', onMove);
  nav.addEventListener('pointerup', onUp);
  nav.addEventListener('pointercancel', onCancel);
  nav.addEventListener('click', onClick, true);
  return {
    slide,
    dispose() {
      clearTimeout(settle); cancelAnimationFrame(anim);
      nav.removeEventListener('pointerdown', onDown);
      nav.removeEventListener('pointermove', onMove);
      nav.removeEventListener('pointerup', onUp);
      nav.removeEventListener('pointercancel', onCancel);
      nav.removeEventListener('click', onClick, true);
      lens.remove();
      nav.classList.remove('is-lens', 'is-dragging');
    },
  };
}

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
  const w0 = Math.sqrt(stiffness); const zeta = damping / (2 * w0); const wd = w0 * Math.sqrt(Math.max(1 - zeta * zeta, 0.0001));
  const pos = (t) => 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + (zeta * w0 / wd) * Math.sin(wd * t));
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

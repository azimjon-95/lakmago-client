import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { api } from '@/api';
import { loadGoogleMaps, googleKeyFrom, createMap, htmlMarkerClass, fitPoints, routeLine, disposeMap, ll } from '@/lib/googleMaps';
import { Icon } from '@/components/Icon';
import { ICONS } from '@/components/icons-data';

/*
 * ═══ KUZATUV XARITASI ═══
 * • Haqiqiy Google xaritasi (brauzer kaliti sozlangan bo'lsa) — ma'lumot kelishini kutmasdan yaratiladi
 *   (avval nuqtalar hali kelmagan paytda xato bilan sxematik rejimga o'tib qolardi).
 * • Yo'l chizig'i — HAQIQIY KO'CHALAR bo'ylab: server GET /orders/:id/route
 *   (Google Routes → OSRM → to'g'ri chiziq). Kuryer bo'lsa kuryerdan, aks holda restorandan mijozgacha.
 * • Markerlar: restoran (to'q sariq), kuryer (skuter, pulsatsiya, "Kuryer yo'lda · N daqiqa"),
 *   mijoz (ko'k nuqta, aniqlik doirasi, "Sizning joylashuvingiz").
 * • Google xaritasi yo'q/ruxsatsiz bo'lsa — xuddi shu ma'lumot va xuddi shu yo'l nuqtalaridan sxematik xarita.
 */
const DEFAULT_CENTER = [41.311081, 69.240562];
const ORANGE = '#FF6A13';
const pt = (p) => (p && Number.isFinite(p.lat) && Number.isFinite(p.lng) ? [p.lat, p.lng] : null);
const meters = (a, b) => {
  const R = 6371000; const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]); const dLng = rad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Icon ma'lumotidan SVG satr (xarita marker shablonlari uchun) */
function svg(name, size, color, sw = 2) {
  const parts = (ICONS[name] || []).map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${parts}</svg>`;
}

const markup = {
  restaurant: (label) => `<div class="tm-pin"><span class="tm-rest"><span class="tm-rest__halo"></span><span class="tm-rest__core">${svg('cake', 18, '#fff', 2.2)}</span><span class="tm-rest__stem"></span></span>${label ? `<span class="tm-chip tm-chip--rest">${esc(label)}</span>` : ''}</div>`,
  customer: (text) => `<div class="tm-pin"><span class="tm-me__halo"></span><span class="tm-me__dot"></span><span class="tm-chip tm-chip--me">${svg('pin', 14, '#2563EB', 2.4)}<span>${esc(text)}</span></span></div>`,
  courier: (title, sub) => `<div class="tm-pin"><span class="tm-cour__halo"></span><span class="tm-cour__core">${svg('scooter', 22, ORANGE, 2.2)}</span><span class="tm-chip tm-chip--cour"><span class="tm-chip__shield">${svg('shieldCheck', 14, '#fff', 2.4)}</span><span class="tm-chip__txt"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></span></div>`,
};

/*
 * Yo'l chizig'i — HAQIQIY AVTOMOBIL YO'LLARI bo'ylab: server GET /orders/:id/route (Google Routes → OSRM; tirbandlik bilan).
 * Hech biri bo'lmasa — to'g'ri nuqtali chiziq (source 'straight'). Kuryer 40 m dan ko'p siljigandagina qayta so'raladi (kvota).
 */
function useRoute(orderId, from, to, status) {
  const [route, setRoute] = useState(null);
  const lastFrom = useRef(null);
  const fromKey = from ? from.map((n) => n.toFixed(5)).join(',') : '';
  const toKey = to ? to.map((n) => n.toFixed(5)).join(',') : '';
  useEffect(() => {
    if (!orderId || !from || !to || ['delivered', 'cancelled'].includes(status)) { setRoute(null); lastFrom.current = null; return undefined; }
    // Qayta so'rash shart emas: nuqta 40 m dan kam siljigan VA serverning haqiqiy yo'li allaqachon bor
    const best = route && route.source !== 'straight';
    if (lastFrom.current && best && meters(lastFrom.current, from) < 40) return undefined;
    let dead = false;
    lastFrom.current = from;
    (async () => {
      let r = null;
      try { const s = await api.getOrderRoute(orderId); if (s?.points?.length > 1) r = s; } catch { r = null; }
      if (!dead) setRoute(r || { points: [from, to], source: 'straight' });
    })();
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, fromKey, toKey, status]);
  return route;
}

/*
 * insets — xaritani yopib turgan qatlamlar (px): top — yuqoridagi kartalar, bottom — pastki varaq.
 * Ko'rinish chegarasi, sxematik zona va tugmalar shunga qarab joylashadi (hech narsa ostida qolmaydi).
 */
export function TrackMap({ orderId, status, restaurant, customer, courier, restaurantLabel = '', etaMinutes = null, labels = {}, cityLabel = '', insets = { top: 260, bottom: 320 } }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const st = useRef(null);
  const [mode, setMode] = useState('loading'); // loading | google | schematic
  const rPoint = pt(restaurant?.point);
  const cPoint = pt(customer?.point);
  const kPoint = pt(courier?.location);
  const L = labels;
  const etaText = etaMinutes != null ? `${etaMinutes} ${L.min || 'daqiqa'}` : '';
  const route = useRoute(orderId, kPoint || rPoint, cPoint, status);

  /* Google xaritasi — bir marta, ma'lumotni kutmasdan */
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const cfg = await api.getMapsConfig();
        if (dead) return;
        const key = googleKeyFrom(cfg);
        if (!key) { setMode('schematic'); return; }
        const maps = await loadGoogleMaps(key);
        if (dead || !boxRef.current) return;
        const map = createMap(maps, boxRef.current, { center: DEFAULT_CENTER, zoom: 13, clean: true });
        mapRef.current = map;
        st.current = { maps, Marker: htmlMarkerClass(maps), markers: {}, line: null, fitted: false };
        setMode('google');
      } catch {
        if (!dead) setMode('schematic');
      }
    })();
    return () => {
      dead = true;
      if (st.current) disposeMap(st.current.maps, mapRef.current, boxRef.current);
      mapRef.current = null; st.current = null;
    };
  }, []);

  const fit = useCallback(() => {
    const map = mapRef.current;
    const pts = [rPoint, cPoint, kPoint, ...(route?.points || [])].filter(Boolean);
    if (!map || !st.current || !pts.length) return;
    // Zaxira: tepada kartalar + restoran markeri (~90 px yuqoriga chiqadi), pastda varaq,
    // o'ngda yozuvlar ("Kuryer yo'lda", "Sizning joylashuvingiz") sig'ishi uchun
    fitPoints(st.current.maps, map, pts, { top: insets.top + 96, right: 150, bottom: insets.bottom + 36, left: 48 }, { maxZoom: 17 });
  }, [rPoint, cPoint, kPoint, route, insets.top, insets.bottom]);

  /* Markerlar va yo'l chizig'i */
  useEffect(() => {
    if (mode !== 'google' || !st.current) return;
    const { maps, Marker, markers } = st.current; const map = mapRef.current;
    const put = (key, point, html, z) => {
      if (!point) { if (markers[key]) { markers[key].setMap(null); markers[key] = null; } return; }
      if (markers[key]) markers[key].update(point, html);
      else markers[key] = new Marker({ position: point, html, zIndex: z, map });
    };

    const from = kPoint || rPoint;
    const pts = route?.points?.length > 1 ? route.points : (from && cPoint ? [from, cPoint] : null);
    if (st.current.line) { st.current.line.setMap(null); st.current.line = null; }
    if (pts) {
      st.current.line = routeLine(maps, map, pts, { color: ORANGE, weight: 5, style: 'dot', zIndex: 5 });
    }
    put('customer', cPoint, markup.customer(L.you || 'Siz'), 20);
    put('restaurant', rPoint, markup.restaurant(restaurantLabel), 25);
    put('courier', kPoint, markup.courier(L.courierOnWay || "Kuryer yo'lda", etaText), 30);
    // Birinchi marta — yo'l kelgach (yoki nuqtalar bitta bo'lsa) hammasi ko'rinadigan qilib
    if (!st.current.fitted && (rPoint || cPoint)) { fit(); st.current.fitted = Boolean(route || !(rPoint && cPoint)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, rPoint?.[0], rPoint?.[1], cPoint?.[0], cPoint?.[1], kPoint?.[0], kPoint?.[1], etaText, restaurantLabel, route]);

  const zoom = (d) => { const m = mapRef.current; if (m) m.setZoom(Math.max(3, Math.min(19, m.getZoom() + d))); };

  return (
    <div className="tm">
      <div ref={boxRef} className="tm__box" style={{ visibility: mode === 'google' ? 'visible' : 'hidden' }} />
      {mode === 'schematic' && <SchematicMap rPoint={rPoint} cPoint={cPoint} kPoint={kPoint} route={route} restaurantLabel={restaurantLabel} etaText={etaText} L={L} insets={insets} />}
      {mode === 'loading' && <div className="tm__loading"><span className="spinner" /></div>}

      <div className="tm-ctrl" style={{ bottom: insets.bottom + 12 }}>
        {mode === 'google' && (
          <div className="tm-zoom">
            <button type="button" onClick={() => zoom(1)} aria-label="+"><Icon name="plus" size={22} color="#111" /></button>
            <button type="button" onClick={() => zoom(-1)} aria-label="−"><Icon name="minus" size={22} color="#111" /></button>
          </div>
        )}
        {mode === 'google' && (
          <button type="button" className="tm-locate" onClick={fit} aria-label={L.fit || 'Hammasi'}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" fill="#111" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
          </button>
        )}
      </div>
      {cityLabel && (
        <div className="tm-city" style={{ bottom: insets.bottom + 12 }}><Icon name="pin" size={17} color="#111" /><span>{cityLabel}</span><Icon name="chevronDown" size={16} color="#111" /></div>
      )}
    </div>
  );
}

/* ───────── Sxematik xarita (Google xaritasi yo'q bo'lganda) — xuddi shu yo'l nuqtalari bilan ───────── */
function SchematicMap({ rPoint, cPoint, kPoint, route, restaurantLabel, etaText, L, insets }) {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 390, h: 844 });
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const measure = () => setSize({ w: el.clientWidth || 390, h: el.clientHeight || 844 });
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { w: W, h: H } = size;
  const all = [rPoint, cPoint, kPoint, ...(route?.points || [])].filter(Boolean);
  const key = `${all.length}|${all[0]}|${all[all.length - 1]}|${W}x${H}|${kPoint}|${insets.top}|${insets.bottom}`;
  const proj = useMemo(() => {
    if (!all.length) return () => [W / 2, H / 2];
    const lats = all.map((p) => p[0]); const lngs = all.map((p) => p[1]);
    const minLat = Math.min(...lats); const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs); const maxLng = Math.max(...lngs);
    const cosLat = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
    const spanX = Math.max((maxLng - minLng) * cosLat, 1e-4); const spanY = Math.max(maxLat - minLat, 1e-4);
    const x0 = Math.max(48, W * 0.12); const x1 = W - Math.max(150, W * 0.38); // o'ngda yozuvlarga joy
    // Ko'rinadigan oraliq: yuqori kartalar + restoran markeri ostidan, pastki varaqdan yuqorigacha
    const y0 = Math.min(H * 0.6, insets.top + 96); const y1 = Math.max(y0 + 40, H - insets.bottom - 56);
    const scale = Math.min((x1 - x0) / spanX, (y1 - y0) / spanY);
    const offX = x0 + ((x1 - x0) - spanX * scale) / 2; const offY = y0 + ((y1 - y0) - spanY * scale) / 2;
    return (p) => [offX + (p[1] - minLng) * cosLat * scale, offY + (maxLat - p[0]) * scale];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const from = kPoint || rPoint;
  const linePts = route?.points?.length > 1 ? route.points : (from && cPoint ? [from, cPoint] : []);
  const d = linePts.map((p, i) => { const [x, y] = proj(p); return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`; }).join(' ');
  const items = [
    ['restaurant', rPoint && proj(rPoint), markup.restaurant(restaurantLabel)],
    ['customer', cPoint && proj(cPoint), markup.customer(L.you || 'Siz')],
    ['courier', kPoint && proj(kPoint), markup.courier(L.courierOnWay || "Kuryer yo'lda", etaText)],
  ];
  return (
    <div className="tm__schema" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} className="tm__svg" aria-hidden="true">
        <rect width={W} height={H} fill="#EEF1EC" />
        <path d={`M-10 ${H * 0.16} L${W + 10} ${H * 0.22} M-10 ${H * 0.62} L${W + 10} ${H * 0.52} M${W * 0.3} -10 L${W * 0.45} ${H + 10} M${W * 0.74} -10 L${W * 0.64} ${H + 10}`} stroke="#fff" strokeWidth="10" />
        {d && <path d={d} fill="none" stroke={ORANGE} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0.1 11" />}
      </svg>
      {items.map(([k, p, html]) => p && (
        <div key={k} className={`tm__abs tm__abs--${k}`} style={{ left: p[0], top: p[1] }} dangerouslySetInnerHTML={{ __html: html }} />
      ))}
      {!all.length && <div className="tm__empty">{L.noMap || 'Xarita ma’lumoti yo‘q'}</div>}
    </div>
  );
}

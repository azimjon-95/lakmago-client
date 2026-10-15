import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { api } from '@/api';
import { loadYmaps } from '@/lib/yandexMaps';
import { Icon } from '@/components/Icon';
import { ICONS } from '@/components/icons-data';

/*
 * ═══ KUZATUV XARITASI (Yandex Go uslubida) ═══
 * • Haqiqiy Yandex xaritasi (kalit sozlangan bo'lsa) — ma'lumot kelishini kutmasdan yaratiladi
 *   (avval nuqtalar hali kelmagan paytda xato bilan sxematik rejimga o'tib qolardi).
 * • Yo'l chizig'i — HAQIQIY KO'CHALAR bo'ylab: server GET /orders/:id/route
 *   (Yandex Router → OSRM → to'g'ri chiziq). Kuryer bo'lsa kuryerdan, aks holda restorandan mijozgacha.
 * • Markerlar: restoran (to'q sariq), kuryer (skuter, pulsatsiya, "Kuryer yo'lda · N daqiqa"),
 *   mijoz (ko'k nuqta, aniqlik doirasi, "Sizning joylashuvingiz").
 * • Yandex yo'q bo'lsa — xuddi shu ma'lumot va xuddi shu yo'l nuqtalaridan sxematik xarita.
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

/** Icon ma'lumotidan SVG satr (Yandex marker shablonlari uchun) */
function svg(name, size, color, sw = 2) {
  const parts = (ICONS[name] || []).map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${parts}</svg>`;
}

const markup = {
  restaurant: (label) => `<div class="tm-pin"><span class="tm-rest"><span class="tm-rest__halo"></span><span class="tm-rest__core">${svg('cake', 18, '#fff', 2.2)}</span><span class="tm-rest__stem"></span></span>${label ? `<span class="tm-chip tm-chip--rest">${esc(label)}</span>` : ''}</div>`,
  customer: (text) => `<div class="tm-pin"><span class="tm-me__halo"></span><span class="tm-me__dot"></span><span class="tm-chip tm-chip--me">${svg('pin', 14, '#2563EB', 2.4)}<span>${esc(text)}</span></span></div>`,
  courier: (title, sub) => `<div class="tm-pin"><span class="tm-cour__halo"></span><span class="tm-cour__core">${svg('scooter', 22, ORANGE, 2.2)}</span><span class="tm-chip tm-chip--cour"><span class="tm-chip__shield">${svg('shieldCheck', 14, '#fff', 2.4)}</span><span class="tm-chip__txt"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></span></div>`,
};

/** Yo'l chizig'i: serverdan (haqiqiy ko'chalar), kuryer 40 m dan ko'p siljiganda qayta so'raladi */
function useRoute(orderId, from, to, status) {
  const [route, setRoute] = useState(null);
  const lastFrom = useRef(null);
  const fromKey = from ? from.join(',') : '';
  const toKey = to ? to.join(',') : '';
  useEffect(() => {
    if (!orderId || !from || !to || ['delivered', 'cancelled'].includes(status)) { setRoute(null); return; }
    if (lastFrom.current && route && meters(lastFrom.current, from) < 40) return;
    let dead = false;
    lastFrom.current = from;
    api.getOrderRoute(orderId).then((r) => { if (!dead && r?.points?.length > 1) setRoute(r); }).catch(() => {});
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, fromKey, toKey, status]);
  return route;
}

export function TrackMap({ orderId, status, restaurant, customer, courier, itemLabel = '', etaMinutes = null, labels = {}, cityLabel = '' }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const st = useRef(null);
  const [mode, setMode] = useState('loading'); // loading | yandex | schematic
  const rPoint = pt(restaurant?.point);
  const cPoint = pt(customer?.point);
  const kPoint = pt(courier?.location);
  const L = labels;
  const etaText = etaMinutes != null ? `${etaMinutes} ${L.min || 'daqiqa'}` : '';
  const route = useRoute(orderId, kPoint || rPoint, cPoint, status);

  /* Yandex xaritasi — bir marta, ma'lumotni kutmasdan */
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const cfg = await api.getMapsConfig();
        if (dead) return;
        if (!cfg?.enabled || !cfg?.mapsKey) { setMode('schematic'); return; }
        const ymaps = await loadYmaps(cfg.mapsKey);
        if (dead || !boxRef.current) return;
        const map = new ymaps.Map(boxRef.current, { center: DEFAULT_CENTER, zoom: 13, controls: [] }, { suppressMapOpenBlock: true, yandexMapDisablePoiInteractivity: true });
        map.behaviors.disable(['scrollZoom', 'dblClickZoom']);
        mapRef.current = map;
        st.current = { ymaps, markers: {}, line: null, fitted: false };
        setMode('yandex');
      } catch {
        if (!dead) setMode('schematic');
      }
    })();
    return () => {
      dead = true;
      try { mapRef.current?.destroy(); } catch { /* */ }
      mapRef.current = null; st.current = null;
    };
  }, []);

  const fit = useCallback(() => {
    const map = mapRef.current;
    const pts = [rPoint, cPoint, kPoint, ...(route?.points || [])].filter(Boolean);
    if (!map || !pts.length) return;
    if (pts.length === 1) { map.setCenter(pts[0], 15, { duration: 250 }); return; }
    const lats = pts.map((p) => p[0]); const lngs = pts.map((p) => p[1]);
    const h = window.innerHeight;
    map.setBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
      // O'ngda yozuvlar ("Kuryer yo'lda", "Sizning joylashuvingiz") sig'ishi uchun kattaroq zaxira
      { checkZoomRange: true, zoomMargin: [Math.round(h * 0.34), 170, Math.round(h * 0.48), 56], duration: 300 });
  }, [rPoint, cPoint, kPoint, route]);

  /* Markerlar va yo'l chizig'i */
  useEffect(() => {
    if (mode !== 'yandex' || !st.current) return;
    const { ymaps, markers } = st.current; const map = mapRef.current;
    const put = (key, point, html, z) => {
      if (!point) { if (markers[key]) { map.geoObjects.remove(markers[key]); markers[key] = null; } return; }
      const Layout = ymaps.templateLayoutFactory.createClass(html);
      if (markers[key]) { markers[key].geometry.setCoordinates(point); markers[key].options.set('iconLayout', Layout); }
      else {
        markers[key] = new ymaps.Placemark(point, {}, { iconLayout: Layout, iconShape: { type: 'Circle', coordinates: [0, 0], radius: 22 }, zIndex: z });
        map.geoObjects.add(markers[key]);
      }
    };
    // Yo'l: haqiqiy ko'chalar (server) — bo'lmasa to'g'ri nuqtali chiziq
    const from = kPoint || rPoint;
    const pts = route?.points?.length > 1 ? route.points : (from && cPoint ? [from, cPoint] : null);
    if (st.current.line) { map.geoObjects.remove(st.current.line); st.current.line = null; }
    if (pts) {
      st.current.line = new ymaps.Polyline(pts, {}, { strokeColor: ORANGE, strokeWidth: 5, strokeStyle: { style: [0.1, 2.4], offset: 0 }, strokeOpacity: 0.95, zIndex: 5 });
      map.geoObjects.add(st.current.line);
    }
    put('customer', cPoint, markup.customer(L.you || 'Sizning joylashuvingiz'), 20);
    put('restaurant', rPoint, markup.restaurant(itemLabel), 25);
    put('courier', kPoint, markup.courier(L.courierOnWay || "Kuryer yo'lda", etaText), 30);
    if (!st.current.fitted && (rPoint || cPoint)) { fit(); st.current.fitted = Boolean(route || !(rPoint && cPoint)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, rPoint?.[0], rPoint?.[1], cPoint?.[0], cPoint?.[1], kPoint?.[0], kPoint?.[1], etaText, itemLabel, route]);

  const zoom = (d) => { const m = mapRef.current; if (m) m.setZoom(Math.max(3, Math.min(19, m.getZoom() + d)), { duration: 200 }); };

  return (
    <div className="tm">
      <div ref={boxRef} className="tm__box" style={{ visibility: mode === 'yandex' ? 'visible' : 'hidden' }} />
      {mode === 'schematic' && <SchematicMap rPoint={rPoint} cPoint={cPoint} kPoint={kPoint} route={route} itemLabel={itemLabel} etaText={etaText} L={L} />}
      {mode === 'loading' && <div className="tm__loading"><span className="spinner" /></div>}

      <div className="tm-ctrl">
        {mode === 'yandex' && (
          <div className="tm-zoom">
            <button type="button" onClick={() => zoom(1)} aria-label="+"><Icon name="plus" size={22} color="#111" /></button>
            <button type="button" onClick={() => zoom(-1)} aria-label="−"><Icon name="minus" size={22} color="#111" /></button>
          </div>
        )}
        {mode === 'yandex' && (
          <button type="button" className="tm-locate" onClick={fit} aria-label={L.fit || 'Hammasi'}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" fill="#111" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
          </button>
        )}
      </div>
      {cityLabel && (
        <div className="tm-city"><Icon name="pin" size={17} color="#111" /><span>{cityLabel}</span><Icon name="chevronDown" size={16} color="#111" /></div>
      )}
    </div>
  );
}

/* ───────── Sxematik xarita (Yandex yo'q bo'lganda) — xuddi shu yo'l nuqtalari bilan ───────── */
function SchematicMap({ rPoint, cPoint, kPoint, route, itemLabel, etaText, L }) {
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
  const key = `${all.length}|${all[0]}|${all[all.length - 1]}|${W}x${H}|${kPoint}`;
  const proj = useMemo(() => {
    if (!all.length) return () => [W / 2, H / 2];
    const lats = all.map((p) => p[0]); const lngs = all.map((p) => p[1]);
    const minLat = Math.min(...lats); const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs); const maxLng = Math.max(...lngs);
    const cosLat = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
    const spanX = Math.max((maxLng - minLng) * cosLat, 1e-4); const spanY = Math.max(maxLat - minLat, 1e-4);
    const x0 = Math.max(56, W * 0.15); const x1 = W - Math.max(170, W * 0.42); // o'ngda yozuvlarga joy
    const y0 = H * 0.36; const y1 = H * 0.52;
    const scale = Math.min((x1 - x0) / spanX, (y1 - y0) / spanY);
    const offX = x0 + ((x1 - x0) - spanX * scale) / 2; const offY = y0 + ((y1 - y0) - spanY * scale) / 2;
    return (p) => [offX + (p[1] - minLng) * cosLat * scale, offY + (maxLat - p[0]) * scale];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const from = kPoint || rPoint;
  const linePts = route?.points?.length > 1 ? route.points : (from && cPoint ? [from, cPoint] : []);
  const d = linePts.map((p, i) => { const [x, y] = proj(p); return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`; }).join(' ');
  const items = [
    ['restaurant', rPoint && proj(rPoint), markup.restaurant(itemLabel)],
    ['customer', cPoint && proj(cPoint), markup.customer(L.you || 'Sizning joylashuvingiz')],
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

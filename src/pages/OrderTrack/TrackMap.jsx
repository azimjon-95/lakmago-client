import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { api } from '@/api';
import { loadYmaps } from '@/lib/yandexMaps';
import { Icon } from '@/components/Icon';

/*
 * ═══ KUZATUV XARITASI ═══
 * Restoran → (kuryer) → mijoz. Hammasi HAQIQIY koordinatalar:
 *   restaurant — restoran nuqtasi; customer — yetkazish manzili;
 *   courier    — kuryerning jonli joylashuvi (faqat yo'lda va yangi bo'lsa; aks holda yo'q).
 * Yandex xaritasi sozlangan bo'lsa — haqiqiy xarita; aks holda (kalit yo'q / yuklanmadi)
 * xuddi shu ma'lumotdan sxematik xarita chiziladi — mijoz baribir kuryerni ko'radi.
 */
const DEFAULT_CENTER = [41.311081, 69.240562];
const ORANGE = '#F26A1B';

const pt = (p) => (p && Number.isFinite(p.lat) && Number.isFinite(p.lng) ? [p.lat, p.lng] : null);
const meters = (a, b) => {
  const R = 6371000; const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]); const dLng = rad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* Nuqta markerlari (HTML) — Yandex va sxematik xaritada bir xil ko'rinish. Matnlar escape qilinadi. */
const markup = {
  restaurant: (label) => `<div class="tm-pin tm-pin--rest"><span class="tm-pin__ring"></span><span class="tm-pin__core">🍰</span>${label ? `<span class="tm-chip">${esc(label)}</span>` : ''}</div>`,
  customer: (text) => `<div class="tm-pin tm-pin--me"><span class="tm-pin__halo"></span><span class="tm-pin__dot"></span><span class="tm-chip tm-chip--blue">📍 ${esc(text)}</span></div>`,
  courier: (title, sub) => `<div class="tm-pin tm-pin--courier"><span class="tm-pin__ring"></span><span class="tm-pin__core tm-pin__core--rider">🛵</span><span class="tm-chip tm-chip--white"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></div>`,
};

export function TrackMap({ restaurant, customer, courier, itemLabel = '', etaMinutes = null, labels = {}, cityLabel = '' }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const stateRef = useRef(null);
  const [mode, setMode] = useState('loading'); // loading | yandex | schematic
  const rPoint = pt(restaurant?.point);
  const cPoint = pt(customer?.point);
  const kPoint = pt(courier?.location);
  const L = labels;
  const etaText = etaMinutes != null ? `${etaMinutes} ${L.min || 'daqiqa'}` : '';

  /* ── Yandex xaritasini bir marta yaratish ── */
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const cfg = await api.getMapsConfig();
        if (dead) return;
        if (!cfg?.enabled || !cfg?.mapsKey || !(rPoint || cPoint)) { setMode('schematic'); return; }
        const ymaps = await loadYmaps(cfg.mapsKey);
        if (dead || !boxRef.current) return;
        const map = new ymaps.Map(boxRef.current, { center: cPoint || rPoint || DEFAULT_CENTER, zoom: 14, controls: [] }, { suppressMapOpenBlock: true });
        map.behaviors.disable(['scrollZoom', 'dblClickZoom']);
        mapRef.current = map;
        stateRef.current = { ymaps, markers: {}, route: null, routeFrom: null, fitted: false };
        setMode('yandex');
      } catch { if (!dead) setMode('schematic'); }
    })();
    return () => {
      dead = true;
      try { mapRef.current?.destroy(); } catch { /* */ }
      mapRef.current = null; stateRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fit = useCallback(() => {
    const map = mapRef.current;
    const pts = [rPoint, cPoint, kPoint].filter(Boolean);
    if (!map || !pts.length) return;
    if (pts.length === 1) { map.setCenter(pts[0], 15, { duration: 250 }); return; }
    const lats = pts.map((p) => p[0]); const lngs = pts.map((p) => p[1]);
    // Chegaralar: tepada kartalar, pastda varaq ostida qolmasligi uchun katta zaxira
    map.setBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
      { checkZoomRange: true, zoomMargin: [Math.round(window.innerHeight * 0.36), 70, Math.round(window.innerHeight * 0.52), 70], duration: 300 });
  }, [rPoint, cPoint, kPoint]);

  /* ── Markerlar va yo'l: ma'lumot o'zgarganda yangilanadi (xarita qayta yaratilmaydi) ── */
  useEffect(() => {
    if (mode !== 'yandex' || !stateRef.current) return;
    const st = stateRef.current; const { ymaps, markers } = st; const map = mapRef.current;
    const put = (key, point, html) => {
      if (!point) { if (markers[key]) { map.geoObjects.remove(markers[key]); markers[key] = null; } return; }
      const Layout = ymaps.templateLayoutFactory.createClass(html);
      if (markers[key]) {
        markers[key].geometry.setCoordinates(point);
        markers[key].options.set('iconLayout', Layout);
      } else {
        markers[key] = new ymaps.Placemark(point, {}, { iconLayout: Layout, iconShape: { type: 'Circle', coordinates: [0, 0], radius: 24 }, zIndex: key === 'courier' ? 30 : 20 });
        map.geoObjects.add(markers[key]);
      }
    };
    put('customer', cPoint, markup.customer(L.you || 'Sizning joylashuvingiz'));
    put('restaurant', rPoint, markup.restaurant(itemLabel));
    put('courier', kPoint, markup.courier(L.courierOnWay || "Kuryer yo'lda", etaText));

    // Nuqtali yo'l: kuryer bo'lsa kuryer → mijoz, aks holda restoran → mijoz
    const from = kPoint || rPoint;
    if (from && cPoint) {
      if (!st.route) {
        st.route = new ymaps.multiRouter.MultiRoute({ referencePoints: [from, cPoint], params: { routingMode: 'auto' } }, {
          boundsAutoApply: false, wayPointVisible: false, viaPointVisible: false, pinVisible: false,
          routeActiveStrokeWidth: 5, routeActiveStrokeColor: ORANGE, routeActiveStrokeStyle: 'shortdot',
          routeStrokeWidth: 0, routeStrokeColor: '#00000000',
        });
        map.geoObjects.add(st.route);
        st.routeFrom = from;
      } else if (!st.routeFrom || meters(st.routeFrom, from) > 40) {
        // Kuryer 40 m dan ko'p siljigandagina yo'l qayta quriladi (har so'rov — kvota)
        st.route.model.setReferencePoints([from, cPoint]);
        st.routeFrom = from;
      }
    } else if (st.route) { map.geoObjects.remove(st.route); st.route = null; st.routeFrom = null; }

    if (!st.fitted && (rPoint || cPoint)) { fit(); st.fitted = true; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, rPoint?.[0], rPoint?.[1], cPoint?.[0], cPoint?.[1], kPoint?.[0], kPoint?.[1], etaText, itemLabel]);

  const zoom = (d) => { const m = mapRef.current; if (m) m.setZoom(Math.max(3, Math.min(19, m.getZoom() + d)), { duration: 200 }); };

  return (
    <div className="tm">
      <div ref={boxRef} className="tm__box" style={{ visibility: mode === 'yandex' ? 'visible' : 'hidden' }} />
      {mode === 'schematic' && <SchematicMap rPoint={rPoint} cPoint={cPoint} kPoint={kPoint} itemLabel={itemLabel} etaText={etaText} L={L} />}
      {mode === 'loading' && <div className="tm__loading"><span className="spinner" /></div>}

      {mode === 'yandex' && (
        <>
          <div className="tm-zoom">
            <button type="button" onClick={() => zoom(1)} aria-label="+"><Icon name="plus" size={20} color="#1A1A17" /></button>
            <button type="button" onClick={() => zoom(-1)} aria-label="−"><Icon name="minus" size={20} color="#1A1A17" /></button>
          </div>
          <button type="button" className="tm-locate" onClick={fit} aria-label={L.fit || 'Hammasini ko‘rsatish'}>
            <Icon name="navigation" size={20} color="#1A1A17" />
          </button>
        </>
      )}
      {cityLabel && (
        <div className="tm-city"><Icon name="pin" size={16} color="#1A1A17" /><span>{cityLabel}</span></div>
      )}
    </div>
  );
}

/* ───────────── Sxematik xarita (Yandex yo'q bo'lganda) ───────────── */
function SchematicMap({ rPoint, cPoint, kPoint, itemLabel, etaText, L }) {
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
  const pts = [rPoint, cPoint, kPoint].filter(Boolean);
  const key = pts.map((p) => p.join(',')).join('|') + `|${W}x${H}`;
  const proj = useMemo(() => {
    if (!pts.length) return () => [W / 2, H / 2];
    const lats = pts.map((p) => p[0]); const lngs = pts.map((p) => p[1]);
    const minLat = Math.min(...lats); const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs); const maxLng = Math.max(...lngs);
    const cosLat = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
    const spanX = Math.max((maxLng - minLng) * cosLat, 1e-4); const spanY = Math.max(maxLat - minLat, 1e-4);
    // Ko'rinadigan xarita: yuqorida kartalar (~38%) va pastda varaq (~52%) orasida
    const x0 = Math.max(70, W * 0.18); const x1 = W - x0;
    const y0 = H * 0.40; const y1 = H * 0.50;
    const scale = Math.min((x1 - x0) / spanX, (y1 - y0) / spanY);
    const offX = x0 + ((x1 - x0) - spanX * scale) / 2; const offY = y0 + ((y1 - y0) - spanY * scale) / 2;
    return (p) => [offX + (p[1] - minLng) * cosLat * scale, offY + (maxLat - p[0]) * scale];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const R = rPoint && proj(rPoint); const C = cPoint && proj(cPoint); const K = kPoint && proj(kPoint);
  const from = K || R;
  const path = from && C ? `M ${from[0]} ${from[1]} Q ${(from[0] + C[0]) / 2 + 22} ${(from[1] + C[1]) / 2 - 14} ${C[0]} ${C[1]}` : null;
  const items = [
    ['restaurant', R, markup.restaurant(itemLabel)],
    ['customer', C, markup.customer(L.you || 'Sizning joylashuvingiz')],
    ['courier', K, markup.courier(L.courierOnWay || "Kuryer yo'lda", etaText)],
  ];

  return (
    <div className="tm__schema" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} className="tm__svg" aria-hidden="true">
        <defs>
          <pattern id="tm-grid" width="46" height="46" patternUnits="userSpaceOnUse"><path d="M46 0H0V46" fill="none" stroke="#E3E7E1" strokeWidth="1" /></pattern>
        </defs>
        <rect width={W} height={H} fill="#EFF2EE" />
        <rect width={W} height={H} fill="url(#tm-grid)" />
        <path d={`M-10 ${H * 0.16} L${W + 10} ${H * 0.22} M-10 ${H * 0.62} L${W + 10} ${H * 0.52} M${W * 0.3} -10 L${W * 0.45} ${H + 10} M${W * 0.74} -10 L${W * 0.64} ${H + 10}`} stroke="#fff" strokeWidth="9" opacity=".9" />
        <path d={`M-10 ${H * 0.8} L${W + 10} ${H * 0.74}`} stroke="#D9E8F3" strokeWidth="24" opacity=".85" />
        {path && <path d={path} fill="none" stroke={ORANGE} strokeWidth="5" strokeLinecap="round" strokeDasharray="1 11" />}
      </svg>
      {items.map(([k, p, html]) => p && (
        <div key={k} className={`tm__abs tm__abs--${k}`} style={{ left: p[0], top: p[1] }} dangerouslySetInnerHTML={{ __html: html }} />
      ))}
      {!pts.length && <div className="tm__empty">{L.noMap || 'Xarita ma’lumoti yo‘q'}</div>}
    </div>
  );
}

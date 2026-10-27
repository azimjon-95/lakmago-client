import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/api';
import { loadYmaps } from '@/lib/yandexMaps';
import { useT } from '@/i18n';
import './DeliveryRouteMap.css';

/*
 * ═══ YETKAZISH MARSHRUTI XARITASI ("Shu manzilga yetkazamizmi?") ═══
 *
 * • Haqiqiy Yandex xaritasi (kalit serverdan: GET /maps/config).
 * • Markerlar: restoran(lar) — to'q sariq; yetkazish manzili — ko'k pin; mijozning JORIY GPS
 *   joylashuvi — ko'k nuqta + aniqlik doirasi ("Siz").
 * • Marshrut — FAQAT haqiqiy: Yandex Router (ymaps.route, avtomobil). Masofa = route.getLength(),
 *   vaqt = tirbandlik bilan (getJamsTime) yoki oddiy (getTime). Marshrut topilmasa — SOXTA chiziq
 *   yoki taxminiy raqam CHIZILMAYDI, ochiq xabar ko'rsatiladi.
 * • Xarita yuklanmasa (kalit yo'q / tarmoq) — "Xarita yuklanmadi" (sxematik soxta xarita yo'q).
 */
const DEFAULT_CENTER = [41.311081, 69.240562];
const ORANGE = '#FF6A13';
const BLUE = '#2563EB';
const ok = (p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng));
const pt = (p) => (ok(p) ? [Number(p.lat), Number(p.lng)] : null);
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Masofani odam o'qiydigan ko'rinishda: 850 m · 1,2 km · 14 km */
export function formatDistance(m, t) {
  if (!Number.isFinite(m)) return '';
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} ${t('unitM')}`;
  const km = m / 1000;
  return `${km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km)} ${t('unitKm')}`;
}

const UTENSILS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v5M9 3v5"/><path d="M17 21V3c-2 1.5-3 4-3 7 0 2 1 3 3 3"/></svg>';
const CAR = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14v-5l-2-5H7l-2 5v5z"/><path d="M5 12h14"/><circle cx="8" cy="17" r="1.6" fill="#fff"/><circle cx="16" cy="17" r="1.6" fill="#fff"/></svg>';

const markup = {
  restaurant: (label) => `<div class="drm-pin"><span class="drm-rest"><span class="drm-rest__core">${UTENSILS}</span></span>${label ? `<span class="drm-chip">${esc(label)}</span>` : ''}</div>`,
  dest: (label) => `<div class="drm-pin"><span class="drm-dest"><span class="drm-dest__core"></span></span>${label ? `<span class="drm-chip">${esc(label)}</span>` : ''}</div>`,
  me: (label) => `<div class="drm-pin"><span class="drm-me__halo"></span><span class="drm-me__dot"></span><span class="drm-chip drm-chip--me">${esc(label)}</span></div>`,
  route: (dist, time) => `<div class="drm-pin"><div class="drm-eta"><span class="drm-eta__pill">${CAR}<b>${esc(dist)}</b></span>${time ? `<span class="drm-eta__time">${esc(time)}</span>` : ''}</div></div>`,
};

/** Haqiqiy avtomobil marshruti (Yandex Router). Muvaffaqiyatsiz bo'lsa — xato (zaxira chiziq YO'Q). */
async function buildRoute(ymaps, from, to) {
  const r = await ymaps.route([from, to], { routingMode: 'auto', multiRoute: false, mapStateAutoApply: false });
  const points = [];
  r.getPaths().each((path) => { points.push(...path.geometry.getCoordinates()); });
  const meters = Number(r.getLength?.());
  const seconds = Number(r.getJamsTime?.() ?? r.getTime?.());
  if (points.length < 2 || !(meters > 0)) throw new Error('empty-route');
  return { points, meters, seconds: Number.isFinite(seconds) ? seconds : null };
}

/**
 * @param restaurants  [{ id, name, lat, lng }]
 * @param destination  { lat, lng, label }   — yetkazish manzili (saqlangan)
 * @param me           { lat, lng, accuracy } | null — joriy GPS
 * @param onRoute      (info | null) => void — { meters, seconds } (eng uzoq restorandan) yoki null
 * @param onLocate     () => void — "joylashuvim" tugmasi (GPS ni qayta so'rash)
 */
export function DeliveryRouteMap({ restaurants = [], destination, me = null, onRoute, onLocate }) {
  const t = useT();
  const boxRef = useRef(null);
  const st = useRef(null);
  const [mode, setMode] = useState('loading'); // loading | ready | failed
  const [route, setRoute] = useState({ state: 'idle' }); // idle | loading | ok | failed
  const [attempt, setAttempt] = useState(0);
  const [routeAttempt, setRouteAttempt] = useState(0);
  const modeRef = useRef('loading');
  const routeRef = useRef('idle');
  const dest = pt(destination);
  const rests = restaurants.map((r) => ({ ...r, p: pt(r) })).filter((r) => r.p);
  const mePt = pt(me);
  const restKey = rests.map((r) => `${r.id}:${r.p.join(',')}`).join('|');
  const destKey = dest ? dest.join(',') : '';
  const onRouteRef = useRef(onRoute);
  onRouteRef.current = onRoute;
  modeRef.current = mode;
  routeRef.current = route.state;

  /* Internet qaytganda — xarita yoki marshrut yuklanmagan bo'lsa O'ZI qayta urinadi (mijoz bosmasa ham) */
  useEffect(() => {
    const back = () => {
      if (modeRef.current === 'failed') setAttempt((n) => n + 1);
      else if (routeRef.current === 'failed') setRouteAttempt((n) => n + 1);
    };
    window.addEventListener('online', back);
    return () => window.removeEventListener('online', back);
  }, []);

  /* Xarita — bir marta */
  useEffect(() => {
    let dead = false;
    setMode('loading');
    (async () => {
      try {
        const cfg = await api.getMapsConfig();
        if (dead) return;
        if (!cfg?.enabled || !cfg?.mapsKey) throw new Error('no-key');
        const ymaps = await loadYmaps(cfg.mapsKey);
        if (dead || !boxRef.current) return;
        const map = new ymaps.Map(boxRef.current, { center: dest || DEFAULT_CENTER, zoom: 14, controls: [] },
          { suppressMapOpenBlock: true, yandexMapDisablePoiInteractivity: true });
        map.behaviors.disable(['scrollZoom', 'dblClickZoom']);
        st.current = { ymaps, map, objs: {}, lines: [] };
        setMode('ready');
      } catch {
        if (!dead) setMode('failed');
      }
    })();
    return () => {
      dead = true;
      try { st.current?.map?.destroy(); } catch { /* */ }
      st.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const put = useCallback((key, point, html, z, shape = 22) => {
    const s = st.current; if (!s) return;
    const { ymaps, map, objs } = s;
    if (!point) { if (objs[key]) { map.geoObjects.remove(objs[key]); objs[key] = null; } return; }
    const Layout = ymaps.templateLayoutFactory.createClass(html);
    if (objs[key]) { objs[key].geometry.setCoordinates(point); objs[key].options.set('iconLayout', Layout); return; }
    objs[key] = new ymaps.Placemark(point, {}, { iconLayout: Layout, iconShape: { type: 'Circle', coordinates: [0, 0], radius: shape }, zIndex: z });
    map.geoObjects.add(objs[key]);
  }, []);

  const fit = useCallback((extra = []) => {
    const s = st.current; if (!s) return;
    const pts = [dest, mePt, ...rests.map((r) => r.p), ...s.lines.flatMap((l) => l.points), ...extra].filter(Boolean);
    if (!pts.length) return;
    if (pts.length === 1) { s.map.setCenter(pts[0], 15, { duration: 250 }); return; }
    const lats = pts.map((p) => p[0]); const lngs = pts.map((p) => p[1]);
    // Zaxira: tepada marker va yozuvlar (~70 px), o'ngda "Restoran"/"Siz" yozuvlari
    s.map.setBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
      { checkZoomRange: true, zoomMargin: [72, 96, 40, 48], duration: 300 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destKey, restKey, mePt?.[0], mePt?.[1]]);

  /* Restoran va manzil markerlari + HAQIQIY marshrut */
  useEffect(() => {
    if (mode !== 'ready' || !st.current) return undefined;
    const s = st.current;
    rests.forEach((r, i) => put(`rest${i}`, r.p, markup.restaurant(rests.length > 1 ? r.name : t('addrMapRestaurant')), 30, 20));
    put('dest', dest, markup.dest(destination?.label || ''), 25, 20);
    s.lines.forEach((l) => s.map.geoObjects.remove(l.obj)); s.lines = [];
    put('eta', null);
    if (!dest || !rests.length) { setRoute({ state: 'failed' }); onRouteRef.current?.(null); fit(); return undefined; }

    let dead = false;
    setRoute({ state: 'loading' });
    fit();
    (async () => {
      const results = await Promise.all(rests.map((r) => buildRoute(s.ymaps, r.p, dest).catch(() => null)));
      if (dead || !st.current) return;
      const good = results.filter(Boolean);
      if (!good.length) { setRoute({ state: 'failed' }); onRouteRef.current?.(null); fit(); return; }
      good.forEach((g) => {
        const obj = new s.ymaps.Polyline(g.points, {}, {
          strokeColor: ORANGE, strokeWidth: 5, strokeOpacity: 0.95, strokeStyle: { style: [1.6, 1.8], offset: 0 }, zIndex: 5,
        });
        s.map.geoObjects.add(obj); s.lines.push({ obj, points: g.points });
      });
      // Yetkazish vaqtini eng uzoq yo'l belgilaydi (bitta kuryer hammasini olib keladi)
      const main = good.reduce((a, b) => (b.meters > a.meters ? b : a));
      const mid = main.points[Math.floor(main.points.length / 2)];
      const mins = main.seconds != null ? Math.max(1, Math.round(main.seconds / 60)) : null;
      put('eta', mid, markup.route(formatDistance(main.meters, t), mins != null ? `${mins} ${t('addrMapMin')}` : ''), 40, 30);
      setRoute({ state: 'ok', meters: main.meters, seconds: main.seconds, partial: good.length < rests.length });
      onRouteRef.current?.({ meters: main.meters, seconds: main.seconds });
      fit();
    })();
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, restKey, destKey, destination?.label, routeAttempt]);

  /* Joriy GPS — ko'k nuqta va aniqlik doirasi */
  useEffect(() => {
    if (mode !== 'ready' || !st.current) return;
    const s = st.current;
    put('me', mePt, markup.me(t('addrMapYou')), 35, 14);
    if (s.objs.acc) { s.map.geoObjects.remove(s.objs.acc); s.objs.acc = null; }
    if (mePt && Number.isFinite(me?.accuracy) && me.accuracy > 0) {
      s.objs.acc = new s.ymaps.Circle([mePt, Math.min(me.accuracy, 1500)], {}, {
        fillColor: 'rgba(37,99,235,0.14)', strokeColor: 'rgba(37,99,235,0.35)', strokeWidth: 1, zIndex: 2, interactivityModel: 'default#transparent',
      });
      s.map.geoObjects.add(s.objs.acc);
    }
    if (mePt) fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, mePt?.[0], mePt?.[1], me?.accuracy]);

  const locate = () => {
    const s = st.current;
    if (mePt && s) s.map.setCenter(mePt, 16, { duration: 300 });
    onLocate?.();
  };

  return (
    <div className="drm" data-sheet-nodrag="">
      <div ref={boxRef} className="drm__box" style={{ visibility: mode === 'ready' ? 'visible' : 'hidden' }} />
      {mode === 'loading' && <div className="drm__overlay"><span className="drm-spin" /><span>{t('addrMapLoading')}</span></div>}
      {mode === 'failed' && (
        <div className="drm__overlay drm__overlay--fail" role="status">
          <span>{typeof navigator !== 'undefined' && navigator.onLine === false ? t('addrMapOffline') : t('addrMapFailed')}</span>
          <button type="button" className="drm-retry" onClick={() => setAttempt((n) => n + 1)}>{t('addrGpsRetry')}</button>
        </div>
      )}
      {mode === 'ready' && route.state === 'loading' && <div className="drm-banner" role="status"><span className="drm-spin drm-spin--sm" />{t('addrRouteLoading')}</div>}
      {mode === 'ready' && route.state === 'failed' && (
        <div className="drm-banner drm-banner--warn" role="status">
          <span>{t('addrRouteFailed')}</span>
          <button type="button" className="drm-banner__btn" onClick={() => setRouteAttempt((n) => n + 1)}>{t('addrGpsRetry')}</button>
        </div>
      )}
      {mode === 'ready' && (
        <button type="button" className="drm-locate" onClick={locate} aria-label={t('addrMapLocate')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" fill="#111" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
        </button>
      )}
    </div>
  );
}

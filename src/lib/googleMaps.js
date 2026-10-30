/*
 * ═══ GOOGLE MAPS (brauzer tomoni) ═══
 *
 * Maps JavaScript API faqat XARITANI ko'rsatish uchun. Marshrut/km/daqiqa/manzil — SERVER orqali (GET /maps/route,
 * /maps/reverse): brauzerda Directions xizmati chaqirilmaydi (bitta kalit, kesh, OSRM zaxirasi, narx nazorati).
 *
 * KALIT (BRAUZER kaliti — HTTP referrer bo'yicha cheklangan, FAQAT Maps JavaScript API):
 *   1) build vaqtida VITE_GOOGLE_MAPS_KEY (Vercel env) — server holatidan mustaqil;
 *   2) bo'lmasa serverning GET /maps/config javobi (provider: 'google', GOOGLE_MAPS_BROWSER_KEY).
 * Kalit yo'q/ruxsat yo'q — komponentlar "Xarita yuklanmadi" ko'rsatadi, ilovaning qolgani ishlayveradi.
 */
const ENV_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';
const LOAD_TIMEOUT_MS = 15000;

let loading = null;
let authFailed = false;

/** Brauzer kalitini aniqlaydi. cfg — api.getMapsConfig() javobi. */
export function googleKeyFrom(cfg) {
  if (ENV_KEY) return ENV_KEY;
  return cfg?.provider === 'google' && cfg?.enabled && cfg?.mapsKey ? cfg.mapsKey : '';
}

/** Kalit/domen cheklovi noto'g'ri bo'lsa Google shu hodisani yuboradi (xarita kulrang bo'lib qoladi). */
export const GMAPS_AUTH_EVENT = 'lokma:gmaps-auth-failed';

/** Skriptni BIR marta yuklaydi. Qaytaradi: google.maps nomlar maydoni. */
export function loadGoogleMaps(apiKey) {
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
  if (authFailed) return Promise.reject(new Error('Google Maps kaliti ruxsat bermadi'));
  if (!apiKey) return Promise.reject(new Error('Google Maps API kaliti mavjud emas'));
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    let done = false;
    let script = null;
    const timer = setTimeout(() => fail('Xarita yuklanishi uchun ajratilgan vaqt tugadi'), LOAD_TIMEOUT_MS);
    function fail(message) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      loading = null;
      script?.remove();
      try { delete window.__lokmaGmapsReady; } catch { /* */ }
      reject(new Error(message));
    }

    window.gm_authFailure = () => {
      authFailed = true;
      window.dispatchEvent(new Event(GMAPS_AUTH_EVENT));
      fail('Google Maps kaliti ruxsat bermadi (kalit yoki domen cheklovini tekshiring)');
    };
    window.__lokmaGmapsReady = async () => {
      try {
        await window.google.maps.importLibrary('maps');
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(window.google.maps);
      } catch {
        fail('Google xaritasini ishga tushirib bo‘lmadi');
      }
    };

    script = document.createElement('script');
    script.dataset.googleMapsLoader = 'true';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&language=uz&region=UZ&callback=__lokmaGmapsReady`;
    script.onerror = () => fail('Xarita yuklanmadi. Internet yoki API kalitini tekshiring.');
    document.head.appendChild(script);
  });
  return loading;
}

const HIDE_CLUTTER = [
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.station', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];

/**
 * Standart xarita. center: [lat, lng]. Barcha Google boshqaruvlari o'chirilgan (o'zimizning tugmalar bor), faqat
 * `zoom: true` bo'lsa +/− qoladi. `clean: true` — savdo POI belgilari yashiriladi (marshrut xaritalari toza ko'rinsin).
 * Google logotipi va shartlar QOLADI (majburiy).
 */
export function createMap(maps, el, { center, zoom, clean = false, zoomControl = false, interactive = true, maxZoom, minZoom } = {}) {
  return new maps.Map(el, {
    center: { lat: center[0], lng: center[1] },
    zoom,
    disableDefaultUI: true,
    zoomControl,
    ...(zoomControl ? { zoomControlOptions: { position: maps.ControlPosition.RIGHT_CENTER } } : {}),
    gestureHandling: interactive ? 'greedy' : 'none',
    clickableIcons: false,
    keyboardShortcuts: false,
    backgroundColor: '#EEF1EC',
    ...(maxZoom ? { maxZoom } : {}),
    ...(minZoom ? { minZoom } : {}),
    ...(clean ? { styles: HIDE_CLUTTER } : {}),
  });
}

/** map.getCenter() → [lat, lng] */
export const centerOf = (map) => { const c = map.getCenter(); return [c.lat(), c.lng()]; };
export const ll = (p) => ({ lat: p[0], lng: p[1] });

/**
 * HTML marker: [lat,lng] nuqtasiga o'z HTML'imizni qo'yadi (pin, yozuv kapsulalari). Nuqta — elementning (0,0) i, ichki
 * `.xx-pin` o'zi siljiydi. Sichqoncha/barmoqni to'smaydi (pointer-events: none) — xarita surilaveradi.
 */
let MarkerClass = null;
export function htmlMarkerClass(maps) {
  if (MarkerClass) return MarkerClass;
  MarkerClass = class HtmlMarker extends maps.OverlayView {
    constructor({ position, html, zIndex = 0, map = null }) {
      super();
      this.pos = position;
      this.el = document.createElement('div');
      this.el.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none;';
      this.el.style.zIndex = String(zIndex);
      this.el.innerHTML = html;
      if (map) this.setMap(map);
    }
    onAdd() { this.getPanes().overlayMouseTarget.appendChild(this.el); }
    draw() {
      const proj = this.getProjection();
      if (!proj) return;
      const px = proj.fromLatLngToDivPixel(new maps.LatLng(this.pos[0], this.pos[1]));
      if (px) { this.el.style.left = `${px.x}px`; this.el.style.top = `${px.y}px`; }
    }
    onRemove() { this.el.remove(); }
    update(position, html) {
      this.pos = position;
      if (html !== undefined && html !== this._html) { this.el.innerHTML = html; this._html = html; }
      this.draw();
    }
  };
  return MarkerClass;
}

/** Nuqtalar sig'adigan qilib xaritani moslaydi (padding: { top, right, bottom, left }, px). Juda yaqin nuqtada haddan tashqari yaqinlashmaydi. */
export function fitPoints(maps, map, points, padding, { maxZoom = 17 } = {}) {
  const pts = points.filter(Boolean);
  if (!pts.length) return;
  if (pts.length === 1) { map.setCenter(ll(pts[0])); map.setZoom(Math.min(15, maxZoom)); return; }
  const b = new maps.LatLngBounds();
  pts.forEach((p) => b.extend(ll(p)));
  map.fitBounds(b, padding);
  maps.event.addListenerOnce(map, 'idle', () => { if (map.getZoom() > maxZoom) map.setZoom(maxZoom); });
}

/**
 * Marshrut chizig'i. style: 'dash' (uzun-uzun) yoki 'dot' (nuqta-nuqta). Google'da punktir chiziq — takrorlanuvchi
 * belgilar (icons) bilan chiziladi. Qaytaradi: google.maps.Polyline (setMap(null) bilan olib tashlanadi).
 */
export function routeLine(maps, map, points, { color, weight = 5, style = 'dash', zIndex = 5 } = {}) {
  const symbol = style === 'dot'
    ? { path: maps.SymbolPath.CIRCLE, fillColor: color, fillOpacity: 1, strokeColor: color, strokeOpacity: 1, strokeWeight: 1, scale: weight / 2 }
    : { path: 'M 0,-1 0,1', strokeColor: color, strokeOpacity: 1, strokeWeight: weight, scale: 1 };
  return new maps.Polyline({
    path: points.map(ll), map, geodesic: false, clickable: false, zIndex,
    strokeOpacity: 0,                                   // asosiy chiziq ko'rinmaydi — faqat takrorlanuvchi belgilar
    icons: [{ icon: symbol, offset: '0', repeat: style === 'dot' ? `${Math.round(weight * 2.8)}px` : `${Math.round(weight * 3.2)}px` }],
  });
}

/** Xaritani to'liq tozalaydi (Google'da destroy() yo'q): hodisalar, konteyner. */
export function disposeMap(maps, map, el) {
  try { maps?.event?.clearInstanceListeners(map); } catch { /* */ }
  try { if (el) el.innerHTML = ''; } catch { /* */ }
}

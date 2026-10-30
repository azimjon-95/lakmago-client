// Joylashuv olish va manzilга aylantirish (reverse geocoding).
// Telegram Mini App'да LocationManager, aks holда brauzer geolocation.
import { getTelegram } from './telegram';
import { api } from '@/api';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

// 1) Joriy koordinatani olish
// Qaytaradi: { lat, lng } yoki xato tashlaydi
/*
 * ═══════════════════════════════════════════════════════════
 * JORIY JOYLASHUV — ANIQLIK BILAN
 * ═══════════════════════════════════════════════════════════
 *
 * Qaytaradi: { lat, lng, accuracy } — `accuracy` metrda
 * (kichik = aniqroq). Chaqiruvchi shunga qarab mijozdan
 * tasdiq so'raydi yoki to'g'ridan-to'g'ri qabul qiladi.
 *
 * AVVALGI KAMCHILIKLAR (tuzatildi):
 *  1) Telegram LocationManager birinchi natijani ANIQLIKNI
 *     TEKSHIRMASDAN qaytarardi — Wi-Fi/tarmoq bo'yicha 1–2 km
 *     xatoli joy ham "aniq" deb o'tib ketardi.
 *  2) Brauzerda vaqtincha xato (masalan GPS signal yo'qolishi)
 *     kelsa, allaqachon olingan YAXSHI natija tashlab yuborilib,
 *     butun jarayon xato bilan tugardi.
 *  3) (0, 0) kabi buzuq koordinata tekshirilmasdi.
 */

// Shu aniqlikka yetganda kutish to'xtatiladi (metr)
const GOOD_ENOUGH_M = 20;
// Telegram natijasi shundan yomon bo'lsa — brauzer bilan aniqlashtiramiz
const TG_REFINE_ABOVE_M = 60;

/*
 * ═══════════════════════════════════════════════════════════
 * KUTISH CHEGARALARI — "Aniqlanmoqda..." abadiy qotib qolmasin
 * ═══════════════════════════════════════════════════════════
 * AVVAL: Telegram LocationManager (`init`, `getLocation`) va geokoder `fetch` HECH QANDAY
 * chegarasiz kutilardi. Qishloqdagi sust/uzilib turadigan internetda yoki Telegram ruxsat
 * oynasiga javob bermaganda callback umuman chaqirilmasdi — `await` abadiy turib, tugma
 * "Aniqlanmoqda..." bo'lib qolardi va mijoz hech narsa qila olmasdi.
 *
 * Endi har bosqichning o'z chegarasi bor; chegara tugasa keyingi usulga o'tiladi yoki aniq
 * sabab bilan xato beriladi (LocationError.code). Testda kichik qiymat qo'yish mumkin.
 */
export const LOC = {
  telegramMs: 8000,        // Telegram init / getLocation (ruxsat so'ralgan bo'lsa)
  telegramPromptMs: 30000, // birinchi marta: Telegram ruxsat oynasi — o'qib, bosishga vaqt kerak
  browserMs: 15000,        // brauzer GPS (sovuq GPS qishloqda 10–40 s olishi mumkin)
  geocodeMs: 6000,         // koordinata → manzil (har bir xizmat uchun)
};

/**
 * Joylashuv xatosi. `code`:
 *   unsupported — qurilma/brauzer joylashuvni bilmaydi;
 *   denied      — ruxsat berilmagan (Telegram yoki telefon sozlamasida o'chiq);
 *   timeout     — vaqt ichida signal topilmadi (GPS sovuq, yopiq joy, qishloqda tarmoq yo'q);
 *   unavailable — qurilma joylashuvni bera olmadi (joylashuv xizmati/GPS o'chiq).
 */
export class LocationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'LocationError';
    this.code = code;
  }
}

/** Promise ni `ms` dan keyin `fallback` bilan tugatadi (asl promise keyin tugasa — e'tiborsiz). */
export function withTimeout(promise, ms, fallback = null) {
  let timer;
  const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve(fallback), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Koordinata haqiqiymi (0,0 va chegaradan tashqari qiymatlar rad). */
function validCoords(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    && !(lat === 0 && lng === 0);
}

/**
 * Telegram LocationManager (Bot API 8.0+) orqali.
 * @returns {{ pos: {lat,lng,accuracy}|null, denied: boolean }}
 *   denied — ruxsat so'ralgan, lekin berilmagan (foydalanuvchi sozlamadan yoqishi kerak).
 */
async function telegramPosition() {
  const lm = getTelegram()?.LocationManager;
  if (!lm) return { pos: null, denied: false };
  try {
    if (!lm.isInited) {
      // init javob bermasa Telegram LocationManager ishlamayapti — darhol brauzerga o'tamiz (ikki marta kutmaymiz)
      const inited = await withTimeout(new Promise((resolve) => lm.init(() => resolve(true))), LOC.telegramMs, false);
      if (!inited) return { pos: null, denied: false };
    }
    if (!lm.isLocationAvailable) return { pos: null, denied: false };
    // Hali so'ralmagan bo'lsa Telegram ruxsat oynasini ko'rsatadi — foydalanuvchiga vaqt beramiz
    const budget = lm.isAccessRequested ? LOC.telegramMs : LOC.telegramPromptMs;
    const d = await withTimeout(new Promise((resolve) => lm.getLocation(resolve)), budget, null);
    if (!d || !validCoords(d.latitude, d.longitude)) {
      return { pos: null, denied: Boolean(lm.isAccessRequested && lm.isAccessGranted === false) };
    }
    return {
      pos: {
        lat: d.latitude,
        lng: d.longitude,
        // Telegram aniqlikni bermasa — noma'lum deb hisoblaymiz
        accuracy: Number.isFinite(d.horizontal_accuracy) ? d.horizontal_accuracy : null,
      },
      denied: false,
    };
  } catch {
    return { pos: null, denied: false };
  }
}

/** Telegram'ning joylashuv sozlamalarini ochadi (ruxsat rad etilgan bo'lsa). */
export function canOpenLocationSettings() {
  return typeof getTelegram()?.LocationManager?.openSettings === 'function';
}
export function openLocationSettings() {
  if (!canOpenLocationSettings()) return false;
  try { getTelegram().LocationManager.openSettings(); return true; } catch { return false; }
}

/**
 * Capacitor orqali Android/iOS qurilmasining joylashuvini olish.
 * Runtime permission so'raladi va ruxsat berilmasa aniq xato qaytariladi.
 */
async function nativePosition() {
  let permissions;

  try {
    permissions = await Geolocation.checkPermissions();

    if (
      permissions.location !== 'granted' &&
      permissions.coarseLocation !== 'granted'
    ) {
      permissions = await Geolocation.requestPermissions();
    }
  } catch (error) {
    throw new LocationError(
      'denied',
      'Joylashuv ruxsatini olish muvaffaqiyatsiz tugadi'
    );
  }

  if (
    permissions.location !== 'granted' &&
    permissions.coarseLocation !== 'granted'
  ) {
    throw new LocationError(
      'denied',
      'Joylashuvga ruxsat berilmadi. Telefon sozlamalaridan ruxsat bering.'
    );
  }

  let timer;

  try {
    const position = await Promise.race([
      Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: LOC.browserMs,
        maximumAge: 30000,
      }),

      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new LocationError(
              'timeout',
              'GPS joylashuvini aniqlash uchun vaqt tugadi'
            )
          );
        }, LOC.browserMs + 2000);
      }),
    ]);

    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const accuracy = position.coords.accuracy;

    if (!validCoords(lat, lng)) {
      throw new LocationError(
        'unavailable',
        'Qurilma noto‘g‘ri koordinatalarni qaytardi'
      );
    }

    return { lat, lng, accuracy };
  } catch (error) {
    if (error instanceof LocationError) {
      throw error;
    }

    const message = String(error?.message || '').toLowerCase();

    if (
      message.includes('permission') ||
      message.includes('denied')
    ) {
      throw new LocationError(
        'denied',
        'Joylashuvga ruxsat berilmadi'
      );
    }

    if (
      message.includes('timeout') ||
      message.includes('timed out')
    ) {
      throw new LocationError(
        'timeout',
        'GPS joylashuvini aniqlash uchun vaqt tugadi'
      );
    }

    throw new LocationError(
      'unavailable',
      'Qurilma joylashuvini aniqlab bo‘lmadi'
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Brauzer geolokatsiyasi — bir necha o'lchovdan ENG ANIQINI tanlaydi.
 *
 * watchPosition ishlatiladi, getCurrentPosition emas: u birinchi
 * (odatda tarmoq bo'yicha, noaniq) natijada to'xtamaydi va GPS
 * qulflanishini kutadi.
 *
 * Vaqt tugaganda ENG YAXSHI olingan natija qaytadi (noaniq bo'lsa ham — chaqiruvchi xaritada
 * tasdiqlatadi); hech narsa bo'lmasa — sababi bilan LocationError.
 */
function browserPosition(signal) {
  // Android/iOS ilovasida Capacitor geolokatsiyasidan foydalanamiz.
  if (Capacitor.isNativePlatform()) {
    return nativePosition();
  }

  // Web va brauzerda mavjud geolokatsiya usuli saqlanadi.
  if (!navigator.geolocation) {
    return Promise.reject(
      new LocationError(
        'unsupported',
        'Qurilma joylashuvni qo‘llab-quvvatlamaydi'
      )
    );
  }

  return new Promise((resolve, reject) => {
    let best = null;
    let watchId = null;
    let timer = null;
    let done = false;

    const finish = (error) => {
      if (done) return;
      done = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (timer) clearTimeout(timer);

      if (best) {
        resolve({
          lat: best.coords.latitude,
          lng: best.coords.longitude,
          accuracy: best.coords.accuracy,
        });
      } else {
        reject(error || new LocationError('timeout', 'Joylashuv aniqlanmadi (vaqt tugadi)'));
      }
    };

    // Ixtiyoriy bekor qilish (lib/gpsSource.js): oyna yopilganda GPS kuzatuvi 15 s davom etmasin (batareya)
    if (signal) {
      if (signal.aborted) { finish(new LocationError('timeout', 'Bekor qilindi')); return; }
      signal.addEventListener('abort', () => finish(new LocationError('timeout', 'Bekor qilindi')), { once: true });
    }
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        if (!validCoords(latitude, longitude)) return;
        if (!best || accuracy < best.coords.accuracy) best = pos;
        if (accuracy <= GOOD_ENOUGH_M) finish();
      },
      (err) => {
        /*
         * Yaxshi natija allaqachon bo'lsa — XATONI e'tiborsiz
         * qoldirib, o'shani qaytaramiz. Faqat ruxsat berilmagan
         * holatda darhol to'xtaymiz.
         */
        if (err.code === 1) {
          finish(new LocationError('denied', 'Joylashuvga ruxsat berilmadi'));
          return;
        }
        if (best) { finish(); return; }
        if (err.code === 3) finish(new LocationError('timeout', 'Joylashuv aniqlanmadi (vaqt tugadi)'));
        else finish(new LocationError('unavailable', 'Joylashuvni olishda xato'));
      },
      /*
       * maximumAge 30 s: yaqinda (masalan xarita ilovasi) olingan joy qabul qilinadi — qishloqda
       * sovuq GPS 10–40 s olishi mumkin, tayyor joy bo'lsa kutib o'tirmaymiz. Aniqligi baribir
       * tekshiriladi (isPrecise); noaniq bo'lsa mijoz xaritada tasdiqlaydi.
       */
      { enableHighAccuracy: true, timeout: LOC.browserMs + 5000, maximumAge: 30000 },
    );

    timer = setTimeout(() => finish(), LOC.browserMs);
  });
}

export async function getCurrentPosition({ signal } = {}) {
  const { pos: tg, denied } = await telegramPosition();

  // Telegram yetarlicha aniq natija berdi
  if (tg && tg.accuracy !== null && tg.accuracy <= TG_REFINE_ABOVE_M) return tg;

  /*
   * Telegram natijasi taxminiy yoki aniqligi noma'lum —
   * brauzer GPS'i bilan aniqlashtiramiz va ikkisidan
   * ANIQROG'INI olamiz. Brauzer ishlamasa Telegram natijasi
   * baribir qaytadi (hech bo'lmasa taxminiy joy).
   */
  try {
    const br = await browserPosition(signal);
    if (!tg) return br;
    const tgAcc = tg.accuracy ?? Infinity;
    return br.accuracy < tgAcc ? br : tg;
  } catch (e) {
    if (tg) return tg;
    /*
     * Telegram ruxsat so'ralgan-u berilmagan bo'lsa, brauzerdagi "vaqt tugadi" / "xato" ning
     * haqiqiy sababi ham shu — foydalanuvchiga to'g'ri yo'l-yo'riq ko'rsatamiz.
     */
    if (denied && (e.code === 'timeout' || e.code === 'unavailable')) {
      throw new LocationError('denied', 'Joylashuvga ruxsat berilmadi');
    }
    throw e;
  }
}

/**
 * Natija aniq deb hisoblanadimi.
 * Undan yomon bo'lsa mijozdan xaritada tasdiqlash so'raladi.
 */
/**
 * YANGI (har bir) o'lchovlar OQIMI — takroriy o'lchov va barqarorlashni kutish uchun (lib/gpsSource.js).
 * `getCurrentPosition()` maximumAge: 30000 bilan ESKI (keshdagi) nuqtani qaytarishi mumkin, shuning uchun uni
 * takror chaqirish mustaqil o'lchov bermaydi. Bu yerda maximumAge: 0 — har bir javob haqiqatan yangi.
 * Qaytaradi: to'xtatish funksiyasi yoki null (qurilma oqimni qo'llamaydi). Mavjud kodga TEGMAYDI.
 */
export function watchFixes(onFix, onError) {
  const emit = (coords, ts) => {
    if (!coords || !validCoords(coords.latitude, coords.longitude)) return;
    onFix({ lat: coords.latitude, lng: coords.longitude, accuracy: Number.isFinite(coords.accuracy) ? coords.accuracy : null, ts: ts || Date.now() });
  };
  if (Capacitor.isNativePlatform()) {
    let id = null;
    let stopped = false;
    Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: LOC.browserMs, maximumAge: 0 },
      (pos, err) => {
        if (stopped) return;
        if (err || !pos) { onError?.(err); return; }
        emit(pos.coords, pos.timestamp);
      },
    ).then((cid) => { if (stopped) Geolocation.clearWatch({ id: cid }).catch(() => {}); else id = cid; })
      .catch((e) => onError?.(e));
    return () => { stopped = true; if (id !== null) Geolocation.clearWatch({ id }).catch(() => {}); };
  }
  if (!navigator.geolocation) return null;
  const wid = navigator.geolocation.watchPosition(
    (pos) => emit(pos.coords, pos.timestamp),
    (err) => onError?.(err),
    { enableHighAccuracy: true, maximumAge: 0, timeout: LOC.browserMs + 5000 },
  );
  return () => navigator.geolocation.clearWatch(wid);
}

export const PRECISE_LOCATION_M = 80;
export function isPrecise(pos) {
  return Number.isFinite(pos?.accuracy) && pos.accuracy <= PRECISE_LOCATION_M;
}

/**
 * fetch + kutish chegarasi. Chaqiruvchining `signal` i (masalan yangi qidiruv eskisini bekor
 * qilganda) bilan birlashtiriladi: u bekor qilsa AbortError tashlanadi, chegara tugasa — oddiy
 * xato (chaqiruvchi zaxira yo'liga o'tadi).
 */
async function fetchJson(url, signal) {
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  const timer = setTimeout(() => ctrl.abort(), LOC.geocodeMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error('geocode');
    return await res.json();
  } catch (e) {
    // Faqat CHAQIRUVCHI bekor qilgan bo'lsagina AbortError; o'z chegaramiz tugagani — oddiy xato
    if (e.name === 'AbortError' && !signal?.aborted) throw new Error('geocode-timeout');
    throw e;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

// 2) Koordinatani manzilга aylantirish (reverse geocoding)
// Nominatim (OpenStreetMap) — bepul, kalit talab qilmaydi.
export async function reverseGeocode(lat, lng, signal) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=uz`;
  try {
    return formatAddress(await fetchJson(url, signal));
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    // Xato / chegara tugasa koordinata ko'rsatamiz (mijoz qotib qolmaydi)
    return { street: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, city: '', full: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
  }
}

// 3) Manzil qidirish (matn bo'yicha)
export async function searchAddress(query, signal) {
  if (!query || query.trim().length < 3) return [];
  // O'zbekiston bilan cheklaymiz (aniqroq natija)
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&countrycodes=uz&limit=8&accept-language=uz`;
  try {
    const list = await fetchJson(url, signal);
    return list.map((item) => ({
      lat: Number(item.lat),
      lng: Number(item.lon),
      ...formatAddress(item),
    }));
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    return [];
  }
}

/**
 * Koordinatadan manzil — Google Geocoding orqali (server proksi, kalit serverda qoladi).
 *
 * Server { address, street, city } beradi (Google tarkibiy qismlaridan, til bo'yicha). Karta orqali tanlashda shu
 * ishlatiladi. Xato/bo'sh javob bo'lsa Nominatim'ga o'tiladi — xarita baribir ishlashda davom etadi.
 */
export async function reverseGeocodeViaServer(lat, lng, lang = '') {
  try {
    // Server proksi ham sust tarmoqda osilib qolmasin — chegara tugasa Nominatim'ga o'tamiz
    const res = await withTimeout(api.reverseGeocode(lat, lng, lang), LOC.geocodeMs, null);
    if (res?.address || res?.street) return formatServerAddress(res);
  } catch { /* Nominatim'ga o'tamiz */ }
  return reverseGeocode(lat, lng);
}

/** Server javobini bizning { street, city, full } shakliga keltiradi. */
function formatServerAddress({ address = '', street = '', city = '' }) {
  const st = street || address.split(',')[0]?.trim() || address;
  return { street: st, city: city && city !== st ? city : '', full: address || [st, city].filter(Boolean).join(', ') };
}

// Nominatim javobини chiroyли manzilga aylantirish
function formatAddress(data) {
  const a = data.address || {};
  const street = [a.road, a.house_number].filter(Boolean).join(', ')
    || a.neighbourhood || a.suburb || a.village || a.town || data.name || '';
  const city = a.city || a.town || a.village || a.state || '';
  const full = [street, city].filter(Boolean).join(', ') || data.display_name || '';
  return { street: street || full, city, full };
}

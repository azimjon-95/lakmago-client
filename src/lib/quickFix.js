import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { getTelegram } from './telegram';
import { LocationError, telegramPosition } from './location';
import { locationPermissionState } from './locationPermission';
import { collectFix, recentFix, rememberFix, FIX } from './fixCollector.js';

/*
 * ═══ MANZIL UCHUN TEZ JOYLASHUV (Web / Telegram / iOS / Android) ═══
 *
 *   quickPosition()  — «Joylashuvni avtomatik aniqlash», xaritadagi «Mening joyim», Market.
 *                      1) Oxirgi 45 s ichidagi aniq (≤ 80 m) nuqta bo'lsa — DARHOL (masalan tuman aniqlash hozirgina oldi).
 *                      2) Oldindan isitilgan (warmPosition) so'rov ketayotgan bo'lsa — o'shani kutadi (ikkinchi marta emas).
 *                      3) Aks holda: aniq GPS + tarmoq (Wi-Fi/uyali) PARALLEL (lib/fixCollector.js qoidalari).
 *   warmPosition()   — manzil oynasi ochilishi bilan: ruxsat ALLAQACHON berilgan bo'lsa (oyna ko'rsatilmaydi) joyni
 *                      fonda olishni boshlaydi. Mijoz tugmani bosguncha joy ko'pincha tayyor bo'ladi.
 *                      Ruxsat berilmagan bo'lsa — HECH NARSA qilmaydi (guest-first: so'rov faqat tugma bosilganda).
 *   lastKnownFix()   — xaritani darhol ochish uchun boshlang'ich nuqta (oxirgi 10 daqiqa, aniqligidan qat'i nazar).
 *
 * Natija: { lat, lng, accuracy }. Aniqlik > 80 m (bino ichi, tarmoq bo'yicha) bo'lsa — chaqiruvchi mijozni XARITAGA
 * yuboradi (igna o'sha joyda, mijoz uyiga suradi). Xato: LocationError code 'denied' | 'timeout' | 'unavailable' | 'unsupported'.
 * Koordinatalar log qilinmaydi va diskka yozilmaydi.
 */
const RECENT_PRECISE_MS = 45_000;
const WARM_REUSE_MS = 20_000;
let warm = null;   // { promise, at }

const LOW_OPTS = { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 };
const HIGH_OPTS = { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 };

const fromCoords = (c, source) => ({ lat: c.latitude, lng: c.longitude, accuracy: Number.isFinite(c.accuracy) ? c.accuracy : null, source });
const nativeErrKind = (e) => (/permission|denied|not authorized|unauthorized/i.test(String(e?.message || e)) ? 'denied' : 'other');

/* ── Manbalar ── */
function webSources() {
  const geo = typeof navigator !== 'undefined' ? navigator.geolocation : null;
  if (!geo) return [];
  const high = (onFix, onErr) => {
    const id = geo.watchPosition(
      (p) => onFix(fromCoords(p.coords, 'gps')),
      (e) => onErr(e?.code === 1 ? 'denied' : 'other'),
      HIGH_OPTS,
    );
    return () => geo.clearWatch(id);
  };
  const low = (onFix, onErr) => {
    let off = false;
    geo.getCurrentPosition(
      (p) => { if (!off) onFix(fromCoords(p.coords, 'network')); },
      (e) => { if (!off) onErr(e?.code === 1 ? 'denied' : 'other'); },
      LOW_OPTS,
    );
    return () => { off = true; };
  };
  return [high, low];
}

function nativeSources() {
  const high = (onFix, onErr) => {
    let id = null; let off = false;
    Geolocation.watchPosition(HIGH_OPTS, (p, e) => {
      if (off) return;
      if (e || !p) { onErr(nativeErrKind(e)); return; }
      onFix(fromCoords(p.coords, 'gps'));
    }).then((cid) => { if (off) Geolocation.clearWatch({ id: cid }).catch(() => {}); else id = cid; })
      .catch((e) => onErr(nativeErrKind(e)));
    return () => { off = true; if (id !== null) Geolocation.clearWatch({ id }).catch(() => {}); };
  };
  const low = (onFix, onErr) => {
    let off = false;
    Geolocation.getCurrentPosition(LOW_OPTS)
      .then((p) => { if (!off) onFix(fromCoords(p.coords, 'network')); })
      .catch((e) => { if (!off) onErr(nativeErrKind(e)); });
    return () => { off = true; };
  };
  return [high, low];
}

async function ensureNativePermission() {
  let p;
  try {
    p = await Geolocation.checkPermissions();
    if (p.location !== 'granted' && p.coarseLocation !== 'granted') p = await Geolocation.requestPermissions();
  } catch (e) {
    // Qurilmada joylashuv xizmati (GPS) o'chiq bo'lsa ham shu yerga tushadi
    throw new LocationError(/disabled|not enabled|services/i.test(String(e?.message || e)) ? 'unavailable' : 'denied', 'permission');
  }
  if (p.location !== 'granted' && p.coarseLocation !== 'granted') throw new LocationError('denied', 'denied');
}

const toLocationError = (e) => (e instanceof LocationError ? e : new LocationError(e?.code || 'unavailable', e?.message || 'location'));

/* ── Asosiy ketma-ketlik ── */
async function acquire({ signal } = {}) {
  try {
    if (Capacitor.isNativePlatform()) {
      await ensureNativePermission();
      return await collectFix(nativeSources(), { signal });
    }

    const lm = getTelegram()?.LocationManager;
    if (lm) {
      if (lm.isInited && lm.isAccessGranted) {
        // Ruxsat bor — Telegram ham boshqa manbalar bilan PARALLEL (navbat kutmaydi)
        const tg = (onFix, onErr) => {
          let off = false;
          telegramPosition().then(({ pos, denied }) => {
            if (off) return;
            if (pos) onFix({ ...pos, source: 'telegram' }); else onErr(denied ? 'denied' : 'other');
          }, () => { if (!off) onErr('other'); });
          return () => { off = true; };
        };
        return await collectFix([tg, ...webSources()], { signal });
      }
      // Hali so'ralmagan: Telegram o'z oynasini ko'rsatadi — ikkita oyna chiqmasin, avval faqat Telegram
      const { pos, denied } = await telegramPosition();
      if (pos && Number.isFinite(pos.accuracy) && pos.accuracy <= FIX.PRECISE_M) return pos;
      try {
        return await collectFix(webSources(), { initial: pos, signal });
      } catch (e) {
        if (denied && (e.code === 'timeout' || e.code === 'unavailable')) throw new LocationError('denied', 'denied');
        throw e;
      }
    }

    const src = webSources();
    if (!src.length) throw new LocationError('unsupported', 'unsupported');
    return await collectFix(src, { signal });
  } catch (e) {
    throw toLocationError(e);
  }
}

async function acquireAndRemember(opts) {
  const pos = await acquire(opts);
  rememberFix(pos);
  return pos;
}

export function quickPosition({ signal } = {}) {
  const r = recentFix(RECENT_PRECISE_MS, FIX.PRECISE_M);
  if (r) return Promise.resolve({ lat: r.lat, lng: r.lng, accuracy: r.accuracy });
  if (warm && Date.now() - warm.at < WARM_REUSE_MS) return warm.promise;
  return acquireAndRemember({ signal });
}

export async function warmPosition() {
  if (recentFix(RECENT_PRECISE_MS, FIX.PRECISE_M)) return;
  if (warm && Date.now() - warm.at < WARM_REUSE_MS) return;
  let st = 'unknown';
  try { st = await locationPermissionState(); } catch { /* */ }
  if (st !== 'granted') return;
  if (warm && Date.now() - warm.at < WARM_REUSE_MS) return;
  const promise = acquireAndRemember();
  warm = { promise, at: Date.now() };
  promise.catch(() => { if (warm?.promise === promise) warm = null; });
}

export function lastKnownFix(maxAgeMs = 10 * 60_000) {
  return recentFix(maxAgeMs);
}

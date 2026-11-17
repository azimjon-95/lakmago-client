import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { getTelegram } from './telegram';
import { LocationError, withTimeout } from './location';
import { locationPermissionState } from './locationPermission';
import { rememberFix } from './fixCollector.js';

/*
 * ═══ TUMAN ANIQLASH UCHUN YAGONA GEOLOKATSIYA XIZMATI (Web / Telegram / iOS / Android) ═══
 *
 *   probeAccess()      — ruxsat va qurilma joylashuv xizmati (GPS) holati, HECH QANDAY oyna ko'rsatmasdan:
 *                        { permission: 'granted'|'prompt'|'denied'|'unknown', services: 'on'|'off'|'unknown' }
 *   coarsePosition(ms) — PASTROQ aniqlikdagi joy (enableHighAccuracy: false — Wi-Fi/uyali tarmoq; bino ichida ham
 *                        ishlaydi, 5–10 daqiqalik kesh qabul qilinadi). Aniq GPS natija bermaganda zaxira.
 *                        Natija tumanga FAQAT server butun aniqlik doirasini bitta tumanda tasdiqlasa qo'llanadi
 *                        (districtSwitch.coarseAccept) — noto'g'ri tuman tanlanmaydi.
 *   classifyError(e)   — xato → 'denied' | 'services_off' | 'error'.
 * Koordinatalar hech qayerda log qilinmaydi.
 */
const SERVICES_OFF_RE = /location services|not enabled|disabled|turned off|location is off/i;

export async function probeAccess() {
  if (Capacitor.isNativePlatform()) {
    try {
      const p = await Geolocation.checkPermissions();
      const permission = p.location === 'granted' || p.coarseLocation === 'granted' ? 'granted' : p.location === 'denied' ? 'denied' : 'prompt';
      return { permission, services: 'on' };
    } catch (e) {
      // Capacitor: qurilmada joylashuv xizmati o'chiq bo'lsa checkPermissions xato beradi
      return { permission: 'unknown', services: SERVICES_OFF_RE.test(String(e?.message || e)) ? 'off' : 'unknown' };
    }
  }
  const lm = getTelegram()?.LocationManager;
  const permission = await locationPermissionState();
  if (lm?.isInited && lm.isLocationAvailable === false) return { permission, services: 'off' };
  return { permission, services: 'unknown' };
}

export async function coarsePosition(timeoutMs = 10_000) {
  const toFix = (pos) => {
    const f = pos?.coords && Number.isFinite(pos.coords.latitude) && Number.isFinite(pos.coords.longitude)
      ? { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null, ts: pos.timestamp || Date.now() }
      : null;
    if (f) rememberFix(f);
    return f;
  };
  const opts = { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 10 * 60_000 };
  if (Capacitor.isNativePlatform()) {
    try { return toFix(await withTimeout(Geolocation.getCurrentPosition(opts), timeoutMs + 1500, null)); } catch (e) { throw asLocationError(e); }
  }
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  return new Promise((resolve, reject) => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; resolve(null); } }, timeoutMs + 1500);
    navigator.geolocation.getCurrentPosition(
      (pos) => { if (done) return; done = true; clearTimeout(t); resolve(toFix(pos)); },
      (err) => { if (done) return; done = true; clearTimeout(t); if (err?.code === 1) reject(new LocationError('denied', 'denied')); else resolve(null); },
      opts,
    );
  });
}

function asLocationError(e) {
  if (e instanceof LocationError) return e;
  const m = String(e?.message || e);
  if (/permission|denied/i.test(m)) return new LocationError('denied', m);
  if (SERVICES_OFF_RE.test(m)) return new LocationError('services_off', m);
  return new LocationError('unavailable', m);
}

/** Xato → holat. 'unavailable' bo'lsa GPS o'chiqligini qo'shimcha tekshiradi. */
export async function classifyError(e) {
  const code = e?.code;
  if (code === 'denied') return 'denied';
  if (code === 'services_off' || SERVICES_OFF_RE.test(String(e?.message || ''))) return 'services_off';
  try {
    const pr = await probeAccess();
    if (pr.services === 'off') return 'services_off';
    if (pr.permission === 'denied') return 'denied';
  } catch { /* */ }
  return 'error';
}

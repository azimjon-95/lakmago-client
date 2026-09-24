// Joylashuv olish va manzilга aylantirish (reverse geocoding).
// Telegram Mini App'да LocationManager, aks holда brauzer geolocation.

import { getTelegram } from './telegram';
import { api } from '@/api';

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
// Eng uzoq kutish (GPS sovuq holatda qulflanishiga vaqt kerak)
const MAX_WAIT_MS = 10000;

/** Koordinata haqiqiymi (0,0 va chegaradan tashqari qiymatlar rad). */
function validCoords(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    && !(lat === 0 && lng === 0);
}

/** Telegram LocationManager (Bot API 8.0+) orqali. */
async function telegramPosition() {
  const lm = getTelegram()?.LocationManager;
  if (!lm) return null;
  try {
    if (!lm.isInited) await new Promise((resolve) => lm.init(resolve));
    if (!lm.isLocationAvailable) return null;
    const d = await new Promise((resolve) => lm.getLocation(resolve));
    if (!d || !validCoords(d.latitude, d.longitude)) return null;
    return {
      lat: d.latitude,
      lng: d.longitude,
      // Telegram aniqlikni bermasa — noma'lum deb hisoblaymiz
      accuracy: Number.isFinite(d.horizontal_accuracy) ? d.horizontal_accuracy : null,
    };
  } catch {
    return null;
  }
}

/**
 * Brauzer geolokatsiyasi — bir necha o'lchovdan ENG ANIQINI tanlaydi.
 *
 * watchPosition ishlatiladi, getCurrentPosition emas: u birinchi
 * (odatda tarmoq bo'yicha, noaniq) natijada to'xtamaydi va GPS
 * qulflanishini kutadi.
 */
function browserPosition() {
  if (!navigator.geolocation) {
    return Promise.reject(new Error('Qurilma joylashuvni qo‘llab-quvvatlamaydi'));
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
        reject(error || new Error('Joylashuv aniqlanmadi'));
      }
    };

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
          finish(new Error('Joylashuvga ruxsat berilmadi'));
          return;
        }
        if (best) { finish(); return; }
        if (err.code === 3) finish(new Error('Joylashuv aniqlanmadi (vaqt tugadi)'));
        else finish(new Error('Joylashuvni olishda xato'));
      },
      { enableHighAccuracy: true, timeout: MAX_WAIT_MS + 5000, maximumAge: 0 },
    );

    timer = setTimeout(() => finish(), MAX_WAIT_MS);
  });
}

export async function getCurrentPosition() {
  const tg = await telegramPosition();

  // Telegram yetarlicha aniq natija berdi
  if (tg && tg.accuracy !== null && tg.accuracy <= TG_REFINE_ABOVE_M) return tg;

  /*
   * Telegram natijasi taxminiy yoki aniqligi noma'lum —
   * brauzer GPS'i bilan aniqlashtiramiz va ikkisidan
   * ANIQROG'INI olamiz. Brauzer ishlamasa Telegram natijasi
   * baribir qaytadi (hech bo'lmasa taxminiy joy).
   */
  try {
    const br = await browserPosition();
    if (!tg) return br;
    const tgAcc = tg.accuracy ?? Infinity;
    return br.accuracy < tgAcc ? br : tg;
  } catch (e) {
    if (tg) return tg;
    throw e;
  }
}

/**
 * Natija aniq deb hisoblanadimi.
 * Undan yomon bo'lsa mijozdan xaritada tasdiqlash so'raladi.
 */
export const PRECISE_LOCATION_M = 80;
export function isPrecise(pos) {
  return Number.isFinite(pos?.accuracy) && pos.accuracy <= PRECISE_LOCATION_M;
}

// 2) Koordinatani manzilга aylantirish (reverse geocoding)
// Nominatim (OpenStreetMap) — bepul, kalit talab qilmaydi.
export async function reverseGeocode(lat, lng, signal) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=uz`;
  try {
    const res = await fetch(url, { signal, headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error('geocode');
    const data = await res.json();
    return formatAddress(data);
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    // Xato bo'lsa koordinata ko'rsatamiz
    return { street: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, city: '', full: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
  }
}

// 3) Manzil qidirish (matn bo'yicha)
export async function searchAddress(query, signal) {
  if (!query || query.trim().length < 3) return [];
  // O'zbekiston bilan cheklaymiz (aniqroq natija)
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&countrycodes=uz&limit=8&accept-language=uz`;
  try {
    const res = await fetch(url, { signal, headers: { 'Accept': 'application/json' } });
    if (!res.ok) return [];
    const list = await res.json();
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
 * Koordinatadan manzil — Yandex Geocoder orqali (server proksi).
 *
 * Nominatim'дан farqi: O'zbekiston manzillarini ancha aniqroq
 * biladi (ko'cha-uy darajasida). Karta orqali tanlashda shu
 * ishlatiladi. Xato bo'lsa Nominatim'ga o'tiladi — xarita
 * baribir ishlashda davom etadi.
 */
export async function reverseGeocodeViaYandex(lat, lng) {
  try {
    const { address } = await api.reverseGeocodeYandex(lat, lng);
    if (address) return formatYandexAddress(address);
  } catch { /* Nominatim'ga o'tamiz */ }
  return reverseGeocode(lat, lng);
}

/**
 * Yandex "Toshkent shahri, Chilonzor tumani, ko'cha, 5" kabi
 * bitta qatorni bizning { street, city, full } shakliga bo'ladi.
 */
function formatYandexAddress(text) {
  const parts = text.split(',').map((p) => p.trim()).filter(Boolean);
  // Odatda oxirgi bo'lak eng aniq (ko'cha/uy), birinchisi shahar
  const street = parts.length > 1 ? parts[parts.length - 1] : text;
  const city = parts.find((p) => /shahri|shahar|tuman|viloyat/i.test(p)) || parts[0] || '';
  return { street, city: city === street ? '' : city, full: text };
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

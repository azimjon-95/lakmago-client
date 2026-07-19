// Joylashuv olish va manzilга aylantirish (reverse geocoding).
// Telegram Mini App'да LocationManager, aks holда brauzer geolocation.

import { getTelegram } from './telegram';

// 1) Joriy koordinatani olish
// Qaytaradi: { lat, lng } yoki xato tashlaydi
export async function getCurrentPosition() {
  const tg = getTelegram();

  // Telegram LocationManager (Bot API 8.0+) — eng ishonchli Mini App ичida
  if (tg?.LocationManager) {
    try {
      const lm = tg.LocationManager;
      // Init (bir marta)
      if (!lm.isInited) {
        await new Promise((resolve) => lm.init(resolve));
      }
      if (lm.isLocationAvailable) {
        const data = await new Promise((resolve) => lm.getLocation(resolve));
        if (data?.latitude) {
          return { lat: data.latitude, lng: data.longitude };
        }
      }
    } catch { /* brauzer geolocation'ga o'tamiz */ }
  }

  // Brauzer geolocation (fallback)
  if (!navigator.geolocation) {
    throw new Error('Qurilma joylashuvni qo\u2018llab-quvvatlamaydi');
  }
  // Aniqlik uchun bir necha o'lchov olamiz va eng aniqini tanlaymiz.
  // watchPosition GPS qulflanishini kutadi (getCurrentPosition ba'zan
  // birinchi, noaniq natijani qaytaradi).
  return new Promise((resolve, reject) => {
    let best = null;
    let watchId = null;
    let timer = null;

    const finish = () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (timer) clearTimeout(timer);
      if (best) {
        resolve({ lat: best.coords.latitude, lng: best.coords.longitude, accuracy: best.coords.accuracy });
      } else {
        reject(new Error('Joylashuv aniqlanmadi'));
      }
    };

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        // Eng aniq o'lchovni saqlaymiz (accuracy — metrda, kichik = aniqroq)
        if (!best || pos.coords.accuracy < best.coords.accuracy) best = pos;
        // 30 metrdan aniq bo'lsa — yetarli, kutmaymiz
        if (pos.coords.accuracy <= 30) finish();
      },
      (err) => {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        if (timer) clearTimeout(timer);
        if (err.code === 1) reject(new Error('Joylashuvga ruxsat berilmadi'));
        else if (err.code === 3) reject(new Error('Joylashuv aniqlanmadi (vaqt tugadi)'));
        else reject(new Error('Joylashuvni olishda xato'));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );

    // 8 soniyada eng yaxshi natijani olamiz (cheksiz kutmaymiz)
    timer = setTimeout(finish, 8000);
  });
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

// Nominatim javobини chiroyли manzilga aylantirish
function formatAddress(data) {
  const a = data.address || {};
  const street = [a.road, a.house_number].filter(Boolean).join(', ')
    || a.neighbourhood || a.suburb || a.village || a.town || data.name || '';
  const city = a.city || a.town || a.village || a.state || '';
  const full = [street, city].filter(Boolean).join(', ') || data.display_name || '';
  return { street: street || full, city, full };
}

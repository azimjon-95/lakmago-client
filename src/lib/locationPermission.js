import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { getTelegram } from './telegram';
import { withTimeout } from './location';

/*
 * Joylashuv ruxsati ALLAQACHON berilganmi — HECH QANDAY oyna ko'rsatmasdan tekshiradi (guest-first: ilova ochilishida
 * ruxsat so'ralmaydi). Avtomatik tuman aniqlash faqat 'granted' bo'lsa jim ishlaydi; aks holda mijoz header'dagi
 * "Joyimni aniqlash" tugmasini bosadi (o'shanda ruxsat so'raladi).
 * Qaytaradi: 'granted' | 'denied' | 'prompt' | 'unknown'
 */
export async function locationPermissionState() {
  try {
    if (Capacitor.isNativePlatform()) {
      const p = await Geolocation.checkPermissions();
      if (p.location === 'granted' || p.coarseLocation === 'granted') return 'granted';
      if (p.location === 'denied') return 'denied';
      return 'prompt';
    }
    const lm = getTelegram()?.LocationManager;
    if (lm) {
      // init oyna ko'rsatmaydi (faqat holatni o'qiydi)
      if (!lm.isInited) await withTimeout(new Promise((r) => lm.init(() => r(true))), 4000, false);
      if (lm.isInited && lm.isLocationAvailable) {
        if (lm.isAccessGranted) return 'granted';
        if (lm.isAccessRequested) return 'denied';
        return 'prompt';
      }
    }
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      const s = await navigator.permissions.query({ name: 'geolocation' });
      return s.state === 'granted' || s.state === 'denied' || s.state === 'prompt' ? s.state : 'unknown';
    }
  } catch { /* noma'lum — so'ramaymiz */ }
  return 'unknown';
}

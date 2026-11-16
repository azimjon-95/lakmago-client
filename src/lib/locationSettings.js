import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { canOpenLocationSettings, openLocationSettings } from './location';
import { isTelegramEnv } from './telegram';

/*
 * ═══ JOYLASHUV RUXSATI RAD ETILGANDA: SOZLAMALARGA YO'L ═══
 *
 * Qaysi muhitda ekanimiz va ruxsatni qayta yoqish uchun nima qila olamiz:
 *   telegram — Telegram LocationManager.openSettings() (Bot API 8.0+): bot joylashuv sozlamasi ochiladi.
 *   ios      — Capacitor ilovasi: `app-settings:` (iOS'da ilovaning o'z sozlamalari). Qo'shimcha plagin talab qilmaydi;
 *              ochilmasa — yo'riqnoma matni ko'rsatiladi.
 *   android  — Capacitor ilovasi: ruxsat qayta so'raladi (Android "boshqa so'ralmasin" belgilanmagan bo'lsa oyna chiqadi);
 *              baribir rad bo'lsa — yo'riqnoma (Sozlamalar → Ilovalar → LokmaGo → Ruxsatlar → Joylashuv).
 *   web      — brauzer sozlamalarini dasturdan ochib bo'lmaydi: yo'riqnoma (manzil satridagi 🔒 → Joylashuv).
 */
export function locationPlatform() {
  try {
    if (Capacitor.isNativePlatform()) return Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
    if (isTelegramEnv()) return 'telegram';
  } catch { /* */ }
  return 'web';
}

/**
 * Ruxsatni qayta yoqishga urinadi.
 * Qaytaradi: 'granted' (darhol ruxsat berildi) | 'opened' (sozlamalar ochildi — qaytgach qayta tekshiriladi) | 'manual' (yo'riqnoma kerak)
 */
export async function openAppLocationSettings() {
  const p = locationPlatform();
  if (p === 'telegram' && canOpenLocationSettings()) return openLocationSettings() ? 'opened' : 'manual';
  if (p === 'android') {
    try {
      const r = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] });
      if (r.location === 'granted' || r.coarseLocation === 'granted') return 'granted';
    } catch { /* */ }
    return 'manual';
  }
  if (p === 'ios') {
    try { window.location.href = 'app-settings:'; return 'opened'; } catch { return 'manual'; }
  }
  return 'manual';
}

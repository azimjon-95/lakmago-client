import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';
import { canOpenLocationSettings, openLocationSettings } from './location';
import { isTelegramEnv } from './telegram';

/*
 * ═══ JOYLASHUV SOZLAMALARIGA YO'L (platformalar bo'yicha) ═══
 *
 *   android  — GPS o'chiq: tizimning «Joylashuv» sozlamasi; ilova ruxsati o'chiq: avval ruxsat qayta so'raladi
 *              (Android "boshqa so'ralmasin" bo'lmasa oyna chiqadi), bo'lmasa ilovaning «App info» sahifasi.
 *   ios      — Apple faqat ilovaning o'z sozlamalar sahifasini ochishga ruxsat beradi (Joylashuv xizmatlari
 *              sahifasini emas): ilova sozlamalari ochiladi + qisqa yo'riqnoma.
 *   telegram — Telegram LocationManager.openSettings() (Bot API 8.0+).
 *   web      — brauzer sozlamalarini dasturdan ochib bo'lmaydi: yo'riqnoma + «Qayta urinish».
 *
 * NativeSettings plagini (capacitor-native-settings) faqat YANGI native build'da bor. Eski ilova versiyalarida
 * plagin yo'q → iOS'da `app-settings:`, Android'da ruxsatni qayta so'rash / yo'riqnoma (ilova buzilmaydi).
 */
export function locationPlatform() {
  try {
    if (Capacitor.isNativePlatform()) return Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
    if (isTelegramEnv()) return 'telegram';
  } catch { /* */ }
  return 'web';
}

const hasNativeSettings = () => {
  try { return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('NativeSettings'); } catch { return false; }
};

async function openNative({ android, ios }) {
  if (!hasNativeSettings()) return false;
  try {
    const r = await NativeSettings.open({ optionAndroid: android, optionIOS: ios });
    return r?.status !== false;
  } catch { return false; }
}

/**
 * Joylashuvni yoqishga yo'naltiradi.
 * @param {'services'|'permission'} what — GPS (qurilma joylashuv xizmati) o'chiqmi yoki ilova ruxsati
 * Qaytaradi: 'granted' (darhol ruxsat berildi) | 'opened' (sozlamalar ochildi — qaytgach qayta tekshiriladi) | 'manual'
 */
export async function openAppLocationSettings(what = 'permission') {
  const p = locationPlatform();
  if (p === 'telegram') return canOpenLocationSettings() && openLocationSettings() ? 'opened' : 'manual';
  if (p === 'android') {
    if (what === 'services') return (await openNative({ android: AndroidSettings.Location, ios: IOSSettings.App })) ? 'opened' : 'manual';
    try {
      const r = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] });
      if (r.location === 'granted' || r.coarseLocation === 'granted') return 'granted';
    } catch { /* */ }
    return (await openNative({ android: AndroidSettings.ApplicationDetails, ios: IOSSettings.App })) ? 'opened' : 'manual';
  }
  if (p === 'ios') {
    if (await openNative({ android: AndroidSettings.ApplicationDetails, ios: IOSSettings.App })) return 'opened';
    try { window.location.href = 'app-settings:'; return 'opened'; } catch { return 'manual'; }
  }
  return 'manual';
}

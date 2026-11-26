import { isNativeApp, clientReady } from './clientInfo';
import { api } from '@/api';

/*
 * ═══════════════════════════════════════════════════════════
 * TAOM TAKLIFLARI PUSH'I — faqat iOS / Android ilova
 * ═══════════════════════════════════════════════════════════
 *
 * Rozilik (Apple 4.5.4: reklama push'i faqat ilova ichidagi aniq rozilik bilan va o'chirish imkoni bilan):
 *   • ilova birinchi ochilganda BIR MARTA oyna (components/PromoPush) — "Ha" bosilsagina OS ruxsati so'raladi;
 *     "Hozir emas" — boshqa so'ralmaydi (Profil → "Taom takliflari" tugmasidan yoqiladi);
 *   • oyna ilovani BLOKLAMAYDI (guest-first, CLAUDE.md 2-qoida istisnosi — egasi qarori 2026-11-26).
 * Server (lakmago-server services/promoPush.js) kuniga ko'pi bilan 2 ta yuboradi: tushlik va kechki.
 * Bosilganda: ilova ochiladi va o'sha taom sahifasi (/food/:id); "ochildi" serverga belgilanadi.
 * Token logga yozilmaydi.
 */
export const ASKED_KEY = 'lokma_push_asked_v1';   // rozilik oynasi ko'rsatilganmi
export const OPTIN_KEY = 'lokma_push_optin_v1';   // '1' — rozi, '0' — rozi emas
const LANG_KEY = 'lokmago_lang';

const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } };

let PN = null;
async function plugin() {
  if (!PN) PN = (await import('@capacitor/push-notifications')).PushNotifications;
  return PN;
}

/** Faqat ilova ichidagi xavfsiz yo'llar (bildirishnomadagi url'ga ko'r-ko'rona ishonilmaydi) */
export function safePushUrl(u) {
  return typeof u === 'string' && /^\/(food|restaurant)\/[A-Za-z0-9_-]{6,40}$/.test(u) ? u : null;
}

let navigateFn = null;
let pendingUrl = null;
/** App ichidan: router tayyor bo'lgach chaqiriladi (sovuq ochilishda kutib turgan url darhol ochiladi) */
export function setPushNavigator(fn) {
  navigateFn = fn;
  if (fn && pendingUrl) { const u = pendingUrl; pendingUrl = null; fn(u); }
}

const lang = () => (['uz', 'uzc', 'ru'].includes(read(LANG_KEY)) ? read(LANG_KEY) : 'uz');
const CHANNEL_NAME = { uz: 'Taom takliflari', uzc: 'Таом таклифлари', ru: 'Предложения блюд' };
const CHANNEL_DESC = {
  uz: 'Kuniga ko‘pi bilan 2 marta — tushlik va kechki ovqat paytida',
  uzc: 'Кунига кўпи билан 2 марта — тушлик ва кечки овқат пайтида',
  ru: 'Не чаще 2 раз в день — в обед и к ужину',
};

let context = { district: '' };
/** App: til/tuman o'zgarganda (serverga ham yuboriladi, faqat rozi bo'lsa) */
export function setPushContext(next) { context = { ...context, ...next }; }

async function ensureChannel() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.getPlatform() !== 'android') return;
    const P = await plugin();
    // importance 3 = DEFAULT (ovoz bor, ekranni bosib chiqmaydi) — reklama uchun to'g'ri daraja
    await P.createChannel({ id: 'promo', name: CHANNEL_NAME[lang()], description: CHANNEL_DESC[lang()], importance: 3, visibility: 1 });
  } catch { /* */ }
}

async function onToken(token) {
  if (read(OPTIN_KEY) !== '1' || !token) return;
  await clientReady;
  // Tarmoq uzilsa token serverga yetmay qolmasin: 4 urinish (2 s, 8 s, 30 s), keyin keyingi ochilishda
  for (let i = 0; i < 4; i++) {
    try {
      await api.registerPush({ token, lang: lang(), district: context.district || '', optIn: true, permission: 'granted' });
      return;
    } catch {
      if (read(OPTIN_KEY) !== '1') return;
      await new Promise((r) => setTimeout(r, [2000, 8000, 30000][i] || 0));
    }
  }
}

export async function permissionState() {
  if (!isNativeApp()) return 'unsupported';
  try { return (await (await plugin()).checkPermissions()).receive; } catch { return 'unknown'; }
}

let booted = false;
/** main.jsx — render'dan OLDIN: bosilgan bildirishnoma (sovuq ochilish) yo'qolmasin */
export async function pushBoot() {
  if (!isNativeApp() || booted) return;
  booted = true;
  try {
    const P = await plugin();
    await P.addListener('registration', (t) => { onToken(t?.value); });
    await P.addListener('registrationError', () => { /* jim */ });
    await P.addListener('pushNotificationActionPerformed', (a) => {
      const d = a?.notification?.data || {};
      if (d.type !== 'promo') return;
      if (d.pp) clientReady.then(() => api.pushOpened({ pp: String(d.pp) })).catch(() => {});
      const url = safePushUrl(d.url);
      if (!url) return;
      if (navigateFn) navigateFn(url); else pendingUrl = url;
    });
    // Rozi va ruxsat bor — tokenni har ochilishda yangilaymiz (FCM tokeni o'zgarishi mumkin)
    if (read(OPTIN_KEY) === '1' && (await permissionState()) === 'granted') {
      await ensureChannel();
      await P.register();
    }
  } catch { /* plagin yo'q (eski native build) — jim */ }
}

/** Rozilik oynasini ko'rsatish kerakmi (bir marta, faqat ilova, OS hali so'ramagan) */
export async function shouldAskConsent() {
  if (!isNativeApp() || read(ASKED_KEY)) return false;
  const p = await permissionState();
  return p === 'prompt' || p === 'prompt-with-rationale';
}

/** "Ha" — OS ruxsati so'raladi. @returns 'granted' | 'denied' */
export async function acceptConsent() {
  write(ASKED_KEY, '1');
  try {
    const P = await plugin();
    const r = await P.requestPermissions();
    if (r.receive === 'granted') {
      write(OPTIN_KEY, '1');
      await ensureChannel();
      await P.register();
      return 'granted';
    }
  } catch { /* */ }
  write(OPTIN_KEY, '0');
  return 'denied';
}

/** "Hozir emas" — boshqa so'ralmaydi */
export function declineConsent() {
  write(ASKED_KEY, '1');
  write(OPTIN_KEY, '0');
}

export const isOptedIn = () => read(OPTIN_KEY) === '1';

/**
 * Profil tugmasi. Yoqish: ruxsat yo'q bo'lsa so'raladi; rad etilgan bo'lsa — sozlamalar ochiladi.
 * @returns 'on' | 'off' | 'settings' | 'denied'
 */
export async function setOptIn(on) {
  if (!isNativeApp()) return 'off';
  if (!on) {
    write(OPTIN_KEY, '0');
    await clientReady;
    api.pushPrefs({ optIn: false }).catch(() => {});
    return 'off';
  }
  write(ASKED_KEY, '1');
  const p = await permissionState();
  if (p === 'denied') {
    try {
      const { NativeSettings, AndroidSettings, IOSSettings } = await import('capacitor-native-settings');
      await NativeSettings.open({ optionAndroid: AndroidSettings.AppNotification, optionIOS: IOSSettings.App });
      return 'settings';
    } catch { return 'denied'; }
  }
  if (p !== 'granted') {
    const r = await acceptConsent();
    return r === 'granted' ? 'on' : 'denied';
  }
  write(OPTIN_KEY, '1');
  await ensureChannel();
  try { await (await plugin()).register(); } catch { /* */ }
  await clientReady;
  api.pushPrefs({ optIn: true }).catch(() => {});
  return 'on';
}

/** Til/tuman/hisob o'zgardi — rozi bo'lsa tokenni qayta yuboramiz (userId va til yangilanadi) */
export async function refreshPushRegistration() {
  if (!isNativeApp() || read(OPTIN_KEY) !== '1') return;
  if ((await permissionState()) !== 'granted') return;
  try { await (await plugin()).register(); } catch { /* */ }
}

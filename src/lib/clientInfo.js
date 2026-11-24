import { Capacitor } from '@capacitor/core';

/*
 * ═══════════════════════════════════════════════════════════
 * MIJOZ QAYERDA — iOS ilova, Android ilova, Telegram, oddiy sayt
 * ═══════════════════════════════════════════════════════════
 *
 * Har API so'roviga header bo'lib qo'shiladi (api/index.js doFetch):
 *   X-Lokma-Client       ios | android | telegram | web
 *   X-Lokma-App-Version  native ilova versiyasi (1.2.0)
 *   X-Lokma-Device       native qurilma ID (@capacitor/device)
 *
 * Server buni buyurtmaga yozadi (kanal statistikasi) va "ilovada buyurtma
 * qilsangiz — Cola tekin" kabi sovg'alarni shunga qarab beradi
 * (lakmago-server services/clientChannel.js). Narx/summaga ta'sir qilmaydi.
 *
 * Qurilma ID va versiya native plaginlardan asinxron keladi — birinchi
 * so'rovlar ularni ko'pi bilan READY_TIMEOUT_MS kutadi (ilova to'xtamaydi).
 */
const READY_TIMEOUT_MS = 800;

export function detectChannel() {
  try {
    if (Capacitor.isNativePlatform()) {
      const p = Capacitor.getPlatform();
      if (p === 'ios' || p === 'android') return p;
    }
  } catch { /* veb */ }
  try {
    // telegram-web-app.js har sahifada yuklanadi; Telegram ichida bo'lsa initData to'la bo'ladi
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) return 'telegram';
  } catch { /* */ }
  return 'web';
}

const state = { channel: detectChannel(), appVersion: '', deviceId: '' };
export const isNativeApp = () => state.channel === 'ios' || state.channel === 'android';

async function loadNative() {
  const [{ App }, { Device }] = await Promise.all([import('@capacitor/app'), import('@capacitor/device')]);
  const [info, id] = await Promise.all([
    App.getInfo().catch(() => null),
    Device.getId().catch(() => null),
  ]);
  if (info?.version) state.appVersion = String(info.version);
  if (id?.identifier) state.deviceId = String(id.identifier);
}

export const clientReady = isNativeApp()
  ? Promise.race([loadNative().catch(() => {}), new Promise((r) => setTimeout(r, READY_TIMEOUT_MS))])
  : Promise.resolve();

/** Har so'rovga qo'shiladigan header'lar (faqat bor qiymatlar). */
export function clientHeaders() {
  const h = { 'X-Lokma-Client': state.channel };
  if (state.appVersion) h['X-Lokma-App-Version'] = state.appVersion;
  if (state.deviceId) h['X-Lokma-Device'] = state.deviceId;
  return h;
}

export const clientInfo = () => ({ ...state });

/** Telegram ichida bo'lsa — kanal qayta aniqlanadi (SDK kech yuklansa) */
export function refreshChannel() {
  if (!isNativeApp()) state.channel = detectChannel();
  return state.channel;
}

/** Shu qurilma uchun do'kon havolasi (App Store / Google Play) */
export function storeUrlFor(cfg, ua = typeof navigator !== 'undefined' ? navigator.userAgent : '') {
  const ios = cfg?.ios?.storeUrl || '';
  const android = cfg?.android?.storeUrl || '';
  if (state.channel === 'ios' || /iPhone|iPad|iPod|Macintosh.*Mobile/i.test(ua)) return ios || android;
  if (state.channel === 'android' || /Android/i.test(ua)) return android || ios;
  return android || ios; // kompyuter: mavjudini
}

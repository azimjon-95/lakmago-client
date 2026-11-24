import { isNativeApp, clientInfo } from './clientInfo';

/*
 * ═══════════════════════════════════════════════════════════
 * ILOVA YANGILANISHI (faqat native iOS / Android ilova)
 * ═══════════════════════════════════════════════════════════
 *
 * Manbalar:
 *   • Do'kon (App Store / Google Play) — eng so'nggi versiya bormi
 *     (@capawesome/capacitor-app-update)
 *   • Server GET /api/app/config — minimal versiya (bundan eskisi ISHLAMAYDI),
 *     do'kon havolalari, taklif oralig'i
 *
 * Qaror (decide — sof funksiya, test qilinadi):
 *   joriy < minVersion            → 'force'    yopib bo'lmaydigan "Yangilang"
 *   Android, do'konda yangisi bor → 'flexible' Google Play fonda yuklaydi (ilova ishlayveradi),
 *                                   tayyor bo'lgach "Qayta ishga tushirish" tugmasi
 *   iOS, do'konda yangisi bor     → 'prompt'   "Yangi versiya" taklifi (N kunda bir marta)
 *   aks holda                     → 'none'
 *
 * iOS'da ilova o'zini o'zi yangilay olmaydi (Apple ruxsat bermaydi) — iPhone'da
 * "Avtomatik yangilash" yoqilgan bo'lsa tizim o'zi yangilaydi, aks holda taklif.
 * Xato bo'lsa (tarmoq, do'kon javob bermadi) — jim: ilova HECH QACHON shu sabab bilan to'xtamaydi.
 */
export const SNOOZE_KEY = 'lokma_update_snooze_v1';

export function compareVersions(a, b) {
  const pa = String(a || '0').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '0').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

/**
 * @param platform 'ios' | 'android'
 * @param current  joriy versiya ("1.2.0")
 * @param store    { available: boolean, version?: string, flexibleAllowed?, immediateAllowed? }
 * @param cfg      server /app/config
 * @param snooze   { version, until } — "Keyinroq" bosilgan
 */
export function decide({ platform, current, store = {}, cfg = {}, snooze = null, now = Date.now() }) {
  const p = cfg?.[platform] || {};
  if (p.minVersion && current && compareVersions(current, p.minVersion) < 0) {
    return { action: 'force', storeUrl: p.storeUrl || '', immediate: platform === 'android' && Boolean(store.immediateAllowed) };
  }
  if (!store.available) return { action: 'none' };
  if (platform === 'android') return store.flexibleAllowed ? { action: 'flexible' } : { action: 'prompt', storeUrl: p.storeUrl || '' };
  // iOS: do'kondagi versiya haqiqatan yangiroqmi
  if (store.version && current && compareVersions(store.version, current) <= 0) return { action: 'none' };
  const key = store.version || 'new';
  if (snooze && snooze.version === key && now < snooze.until) return { action: 'none' };
  return { action: 'prompt', storeUrl: p.storeUrl || '', version: store.version || '' };
}

export function readSnooze() {
  try { return JSON.parse(localStorage.getItem(SNOOZE_KEY) || 'null'); } catch { return null; }
}
export function writeSnooze(version, days = 3, now = Date.now()) {
  try { localStorage.setItem(SNOOZE_KEY, JSON.stringify({ version: version || 'new', until: now + days * 86_400_000 })); } catch { /* */ }
}

export const appleIdFromUrl = (url) => (String(url || '').match(/\/id(\d{5,})/) || [])[1] || '';

let plugin = null;
async function updater() {
  if (!plugin) plugin = (await import('@capawesome/capacitor-app-update')).AppUpdate;
  return plugin;
}

/** Do'kondan ma'lumot (xato — "yangilanish yo'q") */
export async function storeInfo() {
  const AppUpdate = await updater();
  const info = await AppUpdate.getAppUpdateInfo({ country: 'UZ' });
  return {
    current: info.currentVersionName || clientInfo().appVersion,
    store: {
      available: info.updateAvailability === 2, // UPDATE_AVAILABLE
      version: info.availableVersionName || '',
      flexibleAllowed: Boolean(info.flexibleUpdateAllowed),
      immediateAllowed: Boolean(info.immediateUpdateAllowed),
    },
  };
}

/** Do'konni ochish: iOS — App Store sahifasi, Android — Google Play */
export async function openStore(storeUrl) {
  try {
    const AppUpdate = await updater();
    const appId = appleIdFromUrl(storeUrl);
    if (clientInfo().channel === 'ios' && appId) return await AppUpdate.openAppStore({ appId });
    if (clientInfo().channel === 'android') return await AppUpdate.openAppStore();
  } catch { /* pastdagi zaxira */ }
  if (storeUrl) window.open(storeUrl, '_blank', 'noopener');
}

/** Android: Google Play'ning o'z oynasi orqali darhol (majburiy) yangilash */
export async function immediateUpdate() {
  const AppUpdate = await updater();
  return AppUpdate.performImmediateUpdate();
}

/**
 * Android: fonda yuklab olish. onReady — yuklab bo'lingach (o'rnatishga tayyor).
 * Google Play mijozdan bir marta rozilik so'raydi, keyin ilova ishlayveradi.
 */
export async function flexibleUpdate(onReady) {
  const AppUpdate = await updater();
  const handle = await AppUpdate.addListener('onFlexibleUpdateStateChange', (s) => {
    if (s?.installStatus === 11) { onReady?.(); handle?.remove?.(); } // DOWNLOADED
    if (s?.installStatus === 5 || s?.installStatus === 6) handle?.remove?.(); // FAILED / CANCELED
  });
  await AppUpdate.startFlexibleUpdate();
}

export async function completeFlexible() {
  const AppUpdate = await updater();
  return AppUpdate.completeFlexibleUpdate();
}

export const updateSupported = () => isNativeApp();

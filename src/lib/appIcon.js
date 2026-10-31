/**
 * Mavsumiy ilova ikonkasini QO'LLASH (faqat iOS/Android ilovada; veb/Telegram'da hech narsa qilmaydi).
 * Qaysi mavzu kerakligini lib/appIconSchedule.js aytadi; native plagin (AppIcon) ikonkani almashtiradi:
 *   iOS     — alternate app icon (tizim "ikonka o'zgartirildi" oynasini ko'rsatadi — Apple cheklovi, jimgina bo'lmaydi);
 *   Android — activity-alias almashtiriladi (ba'zi launcher'larda yangilanish bir necha soniya oladi).
 * Faqat mavzu HAQIQATAN o'zgarganda chaqiriladi; xato ilovani hech qachon buzmaydi. Batafsil: APP-ICONS.md
 */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { iconThemeForDate } from './appIconSchedule.js';

const AppIcon = registerPlugin('AppIcon');

let busy = false;
let failedTheme = null;   // shu ishga tushirishda qo'llab bo'lmagan mavzu — qayta-qayta urinmaymiz (keyingi ochilishda yana urinadi)

export async function syncAppIcon(now = new Date()) {
  if (busy) return { skipped: 'busy' };
  let native = false;
  try { native = Capacitor.isNativePlatform(); } catch { /* veb */ }
  if (!native) return { skipped: 'web' };

  busy = true;
  try {
    const want = iconThemeForDate(now);
    if (want === failedTheme) return { skipped: 'failed-before', theme: want };
    const { theme: current } = await AppIcon.getCurrent();
    if (current === want) return { theme: want, changed: false };
    await AppIcon.setIcon({ theme: want });
    return { theme: want, changed: true };
  } catch (e) {
    failedTheme = iconThemeForDate(now);
    return { error: e?.message || String(e) };
  } finally {
    busy = false;
  }
}

/** Ilova ochilgandan bir ozdan keyin va har safar oldingi planga qaytganda (kun/fasl o'zgargan bo'lishi mumkin) tekshiradi. */
export function startAppIconSync({ delayMs = 4000 } = {}) {
  let native = false;
  try { native = Capacitor.isNativePlatform(); } catch { /* veb */ }
  if (!native) return;
  setTimeout(() => { syncAppIcon(); }, delayMs);                  // birinchi ekran va guest-first oqimiga xalaqit bermaslik uchun kechiktirilgan
  try {
    App.addListener('appStateChange', ({ isActive }) => { if (isActive) syncAppIcon(); });
  } catch { /* plagin yo'q — faqat ishga tushganda tekshiramiz */ }
}

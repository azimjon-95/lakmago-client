import { Capacitor } from '@capacitor/core';
import { API_BASE, setAuthToken, setRefreshToken } from '@/api';
import { getDeviceId } from '@/lib/telegramWebAuth';
import { Browser } from '@capacitor/browser';


/*
 * ═══ TELEGRAM BOT HAVOLASI ORQALI KIRISH (native ilova va brauzer) ═══
 *
 * Telegram Login Widget native WebView'da ishonchsiz (popup yopiladi). Bu yerda boshqa yo'l:
 *   1) start  — server BIR MARTALIK so'rov yaratadi (code + yashirin pollSecret)
 *   2) openExternal(appLink) — Telegram ochiladi, bot mijozni tasdiqlaydi (ixtiyoriy: telefon ulashadi)
 *   3) poll   — ilova ~1.5 s da so'raydi; tasdiqlangach tokenlar keladi → kirildi
 * Server: services/tgLinkLogin.js
 */
export const platformName = () => {
  try { const p = Capacitor.getPlatform(); return p === 'android' || p === 'ios' ? p : 'web'; } catch { return 'web'; }
};

async function post(path, body, signal) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal,
  });
  const data = await res.json().catch(() => ({}));
  return { http: res.status, data };
}

/** Yangi so'rov. Muvaffaqiyatli bo'lsa: { code, pollSecret, appLink, deepLink, expiresIn, expiresAt } */
export async function startTgLogin(lang) {
  const { http, data } = await post('/auth/tg-link/start', { platform: platformName(), deviceId: getDeviceId(), lang });
  if (http !== 200 || !data.code) throw new Error(data?.error || `start: ${http}`);
  return { ...data, expiresAt: Date.now() + (data.expiresIn || 300) * 1000 };
}

/*
 * Oldindan tayyorlash: Safari/WebView faqat FOYDALANUVCHI BOSISHIDAN keyin ~1 soniya ichida tashqi ilovani
 * ochishga ruxsat beradi. Server so'rovini bosishdan KEYIN kutsak, Telegram ochilmay qolishi mumkin.
 * Shuning uchun oyna ochilishi bilan so'rov fonda yaratiladi; bosish — kutishsiz (sinxron) ochadi.
 * Yaroqli so'rov qayta ishlatiladi (oyna qayta-qayta ochilsa bazani to'ldirmaydi).
 */
let cache = null;
export function prefetchTgLogin(lang) {
  if (cache && cache.expiresAt - Date.now() > 60_000 && !cache.failed) return cache.promise;
  const entry = { failed: false, expiresAt: Date.now() + 240_000 };
  entry.promise = startTgLogin(lang).then((r) => { entry.expiresAt = r.expiresAt; return r; }).catch((e) => { entry.failed = true; throw e; });
  cache = entry;
  return entry.promise;
}
export const clearTgLoginCache = () => { cache = null; };

export async function pollTgLogin({ code, pollSecret }, signal) {
  return post('/auth/tg-link/poll', { code, pollSecret }, signal);
}

/**
 * Tashqi ilovani (Telegram) ochadi. <a>.click() — brauzer/WebView uchun eng ishonchli usul: tg:// sxemasi
 * Android'da Intent, iOS'da UIApplication.open orqali ochiladi (Capacitor); https — tizim brauzerida.
 * Faqat foydalanuvchi bosishi ichida chaqiring.
 */
export async function openExternal(url) {
  if (!url) {
    throw new Error('Telegram havolasi mavjud emas');
  }

  if (Capacitor.isNativePlatform()) {
    if (url.startsWith('tg://')) {
      window.location.href = url;
      return;
    }

    await Browser.open({ url });
    return;
  }

  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Server javobidagi tokenlarni saqlaydi (telegramWebAuth bilan bir xil) */
export function applyLoginTokens(data) {
  const access = data.accessToken || data.token;
  if (access) setAuthToken(access);
  if (data.refreshToken) setRefreshToken(data.refreshToken);
}

/** AuthGateModal.applyProfile kutadigan shakl */
export const profileFromLogin = (data) => ({
  telegramId: data.user?.telegramId,
  firstName: data.user?.firstName,
  lastName: data.user?.lastName,
  username: data.user?.username,
  languageCode: data.user?.languageCode,
  photoUrl: data.user?.photoUrl,
  phone: data.user?.phone,
  addresses: data.user?.addresses,
  _id: data.user?._id,
});

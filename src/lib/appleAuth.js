import { useEffect, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { API_BASE } from '@/api';
import { getDeviceId } from '@/lib/telegramWebAuth';
import { AppleAuthError, canUseApple, classifyNativeError, runAppleSignIn } from '@/lib/appleAuthCore';

/*
 * ═══ SIGN IN WITH APPLE — FAQAT iOS ILOVASI (ALOHIDA, QO'SHIMCHA KIRISH USULI) ═══
 *
 * Telegram kirishi (lib/telegram.js, telegramWebAuth.js, tgLinkAuth.js) bu yerda ishlatilmaydi va o'zgartirilmagan.
 * Android/Web/Telegram Mini App'da: tugma ko'rinmaydi, serverga HECH QANDAY so'rov yuborilmaydi, native plugin chaqirilmaydi.
 *
 * Oqim (server: services/appleAuth.js):
 *   1) POST /auth/apple/challenge → { challengeId, nonce }  (bir martalik, 5 daqiqa, qurilma bilan bog'langan)
 *   2) native AppleSignIn.authorize({ nonce }) → Apple identity token (nonce ichida)  [ios/App/App/AppleSignInPlugin.swift]
 *   3) POST /auth/apple { challengeId, identityToken, givenName?, familyName? } → { accessToken, refreshToken, user, ... }
 *      (Telegram login javobi bilan bir xil shakl — natijani chaqiruvchi mavjud applyLoginTokens/profileFromLogin bilan qo'llaydi)
 *
 * Xatolar AppleAuthError.kind bilan: 'cancelled' (foydalanuvchi oynani yopdi — JIM, xato ko'rsatilmaydi), 'blocked', 'unsupported', 'failed'.
 * Hech bir xato Telegram kirishiga yoki mehmon rejimiga ta'sir qilmaydi (tokenlar bu yerda tegilmaydi).
 */
export const PLUGIN_NAME = 'AppleSignIn';
export { AppleAuthError, classifyNativeError };

/** Faqat haqiqiy iOS ilovasi (Capacitor native, platform=ios). Brauzer, Android, Telegram Mini App — false. */
export const isIOSApp = () => { try { return Capacitor.getPlatform() === 'ios' && Capacitor.isNativePlatform(); } catch { return false; } };
const hasNativePlugin = () => { try { return Capacitor.isPluginAvailable(PLUGIN_NAME); } catch { return false; } };
const canUse = () => canUseApple({ platform: platformOf(), isNative: isIOSApp(), hasPlugin: hasNativePlugin() });
const platformOf = () => { try { return Capacitor.getPlatform(); } catch { return 'web'; } };

async function post(path, body) {
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { http: res.status, data };
}

/* Server yoqqan-yoqmaganligi (GET /auth/apple/config). Faqat iOS ilovada so'raladi; boshqa muhitda so'rov YO'Q. */
let availability = null;
export function isAppleLoginAvailable() {
  if (!canUse()) return Promise.resolve(false);
  if (availability) return availability;
  availability = (async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    try {
      const res = await fetch(`${API_BASE}/auth/apple/config`, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
      if (!res.ok) return false;                                    // eski server: 404 → tugma yashirin
      const j = await res.json().catch(() => null);
      return j?.enabled === true;
    } catch { availability = null; return false; }                  // tarmoq xatosi → keyingi safar qayta uriniladi
    finally { clearTimeout(timer); }
  })();
  return availability;
}

export function useAppleLoginAvailable() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let on = true;
    isAppleLoginAvailable().then((v) => { if (on) setOk(Boolean(v)); });
    return () => { on = false; };
  }, []);
  return ok;
}

/**
 * Apple oynasini ochadi va serverda kirishni yakunlaydi.
 * @returns {Promise<object>} server javobi (accessToken, refreshToken, user, isNewUser)
 * @throws {AppleAuthError}
 */
export async function signInWithApple() {
  if (!canUse()) throw new AppleAuthError('unsupported');
  return runAppleSignIn({
    post,
    authorize: (nonce) => registerPlugin(PLUGIN_NAME).authorize({ nonce }),
    deviceId: getDeviceId(),
  });
}

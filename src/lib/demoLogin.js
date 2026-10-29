import { API_BASE } from '@/api';
import { getDeviceId } from '@/lib/telegramWebAuth';
import { platformName } from '@/lib/tgLinkAuth';

/*
 * App Store tekshiruvi uchun DEMO kirish: POST /auth/demo-login (server: services/demoAccount.js).
 * Oddiy fetch (apiFetch emas): noto'g'ri parol 401 beradi — bu "sessiya yaroqsiz" ma'nosida emas, tokenlarni tozalamasligi kerak.
 */
export async function demoLogin(login, password) {
  const res = await fetch(`${API_BASE}/auth/demo-login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password, platform: platformName(), deviceId: getDeviceId() }),
  });
  const data = await res.json().catch(() => ({}));
  return { http: res.status, data };
}

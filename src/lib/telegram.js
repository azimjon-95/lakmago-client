// Telegram Mini App — global tip deklaratsiyasi va auto-auth mantiqi.
// TZ: WebApp ochilganda Telegram.WebApp.ready() chaqiriladi, initData va
// initDataUnsafe.user o'qiladi, backendga yuboriladi (POST /api/auth/telegram).
































export function getTelegram() {
  return window.Telegram?.WebApp;
}

export function haptic() {
  getTelegram()?.HapticFeedback?.impactOccurred('light');
}













const API_BASE = import.meta.env.VITE_API_URL ?? null;

// Fon rejimida ishlaydigan auth: Telegram.WebApp.ready() chaqiradi, initData'ni
// backendga yuboradi. Bosh sahifa BU JARAYONNI KUTMAYDI — darhol ochiladi.
// Backend ulanmagan bo'lsa (.env sozlanmagan) — mahalliy simulyatsiya bilan ishlaydi.
export async function authenticateWithTelegram() {
  const tg = getTelegram();
  if (tg) {
    tg.ready();
    tg.expand();
    // Dark theme — Telegram header va fon ranglari
    try {
      tg.setHeaderColor?.('#0E0E10');
      tg.setBackgroundColor?.('#0E0E10');
    } catch {
      // eski Telegram versiyalarida bo'lmasligi mumkin
    }
  }

  const initData = tg?.initData || '';
  const tgUser = tg?.initDataUnsafe?.user;

  if (!API_BASE) {
    await new Promise((r) => setTimeout(r, 400));
    if (!tgUser) throw new Error('Telegram user topilmadi (brauzerda ochilgan)');
    return {
      telegramId: String(tgUser.id),
      firstName: tgUser.first_name || '',
      lastName: tgUser.last_name || '',
      username: tgUser.username || '',
      languageCode: tgUser.language_code || 'uz',
      isPremium: Boolean(tgUser.is_premium),
      photoUrl: tgUser.photo_url || null
    };
  }

  const res = await fetch(`${API_BASE}/auth/telegram`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData })
  });
  if (!res.ok) throw new Error(`Auth xatosi: ${res.status}`);
  const data = await res.json();
  if (data.token) sessionStorage.setItem('lokmago_token', data.token);
  return {
    telegramId: data.user.telegramId,
    firstName: data.user.firstName,
    lastName: data.user.lastName,
    username: data.user.username,
    languageCode: data.user.languageCode,
    isPremium: data.user.isPremium,
    photoUrl: data.user.photoUrl,
    phone: data.user.phone,
    addresses: data.user.addresses
  };
}

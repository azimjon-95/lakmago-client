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
    body: JSON.stringify({ initData, startParam: tg?.initDataUnsafe?.start_param || '' })
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

// ===== ULASHISH (SHARE) =====
// Bot username va webapp nomi — .env dan (ulashish havolasi uchun).
// Masalan: VITE_BOT_USERNAME=LokmaGoBot, VITE_WEBAPP_NAME=app
const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME ?? 'LokmaGoBot';
const WEBAPP_NAME = import.meta.env.VITE_WEBAPP_NAME ?? 'app';
// Server domenи (OG meta sahifа uchun) — chiroyли rasm+nom karta bilan ulashish.
// Masalan: https://api.lokmago.uz  (bo'sh bo'lsa to'g'ridan t.me havola)
const SHARE_BASE = import.meta.env.VITE_SHARE_BASE ?? '';

// Taomга olib boruvchi havola. SHARE_BASE bo'lsa OG sahifа (chiroyли preview),
// aks holda to'g'ridan Telegram Mini App havolаsi.
export function buildDishShareLink(dishId) {
  if (SHARE_BASE) return `${SHARE_BASE}/share/dish/${dishId}`;
  return `https://t.me/${BOT_USERNAME}/${WEBAPP_NAME}?startapp=dish_${dishId}`;
}

// Taomni Telegram do'stlarга ulashish.
// Telegram do'stlar ro'yxatини ochadi, taom havolasi + tavsif yuboriladi.
// Havola bosilganда webapp o'sha taom bilan ochiladi.
export function shareDish(dish) {
  haptic();
  const link = buildDishShareLink(dish.id || dish._id);

  // Chiroyli, qisqa matn — havola matnга QO'SHILMAYDI (Telegram preview kartаsi yasaydi).
  // Shunda do'stга toza ko'rinadi: rasm + tavsif + bosiladigan karta.
  const price = dish.price ? `${dish.price.toLocaleString('ru-RU')} so'm` : '';
  const lines = [
    `🍽 ${dish.name}`,
    price && `💰 ${price}`,
    dish.description && `\n${dish.description}`,
  ].filter(Boolean);
  const text = lines.join('\n');

  const tg = getTelegram();
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;

  if (tg?.openTelegramLink) {
    // Telegram ichida — do'stlar ro'yxatи ochiladi
    tg.openTelegramLink(shareUrl);
  } else {
    // Brauzerда — yangi oynада ochiladi (yoki nusxalash)
    window.open(shareUrl, '_blank');
  }
}

// Ilova ochilганда startapp parametrини o'qish (ulashilган taomга yo'naltirish).
// Qaytaradi: { type: 'dish', id } yoki null
export function getStartParam() {
  const tg = getTelegram();
  const raw = tg?.initDataUnsafe?.start_param;
  if (!raw) return null;
  if (raw.startsWith('dish_')) {
    return { type: 'dish', id: raw.slice(5) };
  }
  return null;
}

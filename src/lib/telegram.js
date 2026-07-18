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
    // Viewport balandligини CSS o'zgaruvchisига yozamiz — har xil telefonда
    // (notch, klaviatura, kengaytirish) layout to'g'ri moslashadi.
    const syncViewport = () => {
      const h = tg.viewportStableHeight || tg.viewportHeight;
      if (h) document.documentElement.style.setProperty('--tg-viewport-height', `${h}px`);
    };
    syncViewport();
    tg.onEvent?.('viewportChanged', syncViewport);
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
// Bot username va Mini App nomи — tozalanadi (@ , bo'shliq, / olib tashlanadi)
const cleanName = (v, fallback = '') =>
  String(v ?? fallback).trim().replace(/^@/, '').replace(/^\/+|\/+$/g, '');

const BOT_USERNAME = cleanName(import.meta.env.VITE_BOT_USERNAME, 'LokmaGoBot');
const WEBAPP_NAME = cleanName(import.meta.env.VITE_WEBAPP_NAME, '');
// Server domenи (OG meta sahifа uchun) — chiroyли rasm+nom karta bilan ulashish.
// VITE_SHARE_BASE aniq berilса — o'sha. Aks holда VITE_API_URL'дан server domenини
// avtomатик olamiz (chunki OG sahifани shu server beradi). Shunda alohида sozlash shart emas.
// OG sahifа serveringiz domenи (masalan https://api.lokmago.uz).
// MUHIM: bu yerга t.me havolаси YOZILMASLIGI kerak — u Mini App havolаси,
// OG sahifа emas. Noto'g'ri qiymat berilса — e'tiborga olinmaydi.
function isValidShareBase(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    // Faqat http/https
    if (!/^https?:$/.test(u.protocol)) return false;
    // t.me / telegram.org — bu Mini App havolаsи, OG sahifа emas
    if (/(^|\.)t\.me$|(^|\.)telegram\.(org|me)$/i.test(u.hostname)) return false;
    // Lokal manzil — Telegram ko'ra olmaydi
    if (/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(u.hostname)) return false;
    // So'rov (?) yoki yo'l bo'lmasin — faqat toza domen kutiladi
    if (u.search) return false;
    return true;
  } catch {
    return false;
  }
}

function deriveShareBase() {
  const explicit = import.meta.env.VITE_SHARE_BASE;
  if (isValidShareBase(explicit)) return explicit.replace(/\/$/, '');
  // Noto'g'ri yoki bo'sh — API manzilидан olamiz
  const api = import.meta.env.VITE_API_URL;
  if (!api) return '';
  const root = api.replace(/\/api\/?$/, '').replace(/\/$/, '');
  return isValidShareBase(root) ? root : '';
}
const SHARE_BASE = deriveShareBase();

// Taomга olib boruvchi Telegram Mini App havolasi.
// WEBAPP_NAME bo'lsa: t.me/Bot/nom?startapp=dish_<id>
// bo'lmasa:         t.me/Bot?startapp=dish_<id>  (ikkalasi ham webapp'ni ochadi)
function buildMiniAppLink(dishId) {
  const base = WEBAPP_NAME
    ? `https://t.me/${BOT_USERNAME}/${WEBAPP_NAME}`
    : `https://t.me/${BOT_USERNAME}`;
  return `${base}?startapp=dish_${dishId}`;
}

// Taomга olib boruvchi havola. SHARE_BASE bo'lsa OG sahifа (chiroyли preview:
// rasm+nom+narx karta), aks holда to'g'ridan Telegram Mini App havolаsi.
export function buildDishShareLink(dishId) {
  if (SHARE_BASE) return `${SHARE_BASE}/share/dish/${dishId}`;
  return buildMiniAppLink(dishId);
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
  // 1) Telegram SDK'дан (asosiy manba)
  const tg = getTelegram();
  let raw = tg?.initDataUnsafe?.start_param;

  // 2) Ehtiyot: URL hash/query'дан ham qidiramiz (SDK kечиkса yoki bo'sh bo'lsa)
  if (!raw && typeof window !== 'undefined') {
    try {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const params = new URLSearchParams(hash.replace(/^#/, '') + '&' + search.replace(/^\?/, ''));
      raw = params.get('tgWebAppStartParam') || params.get('startapp') || params.get('start_param') || '';
    } catch { /* ignore */ }
  }

  if (!raw) return null;
  if (raw.startsWith('dish_')) {
    return { type: 'dish', id: raw.slice(5) };
  }
  return null;
}

// Haqiqий Telegram Mini App muhitидami tekshirish.
// Brauzerда oddiy ochilса — Telegram obyekti bo'lmaydi yoki initData bo'sh bo'ladi.
export function isTelegramEnv() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return false;
  // initData bor va platform 'unknown' emas — haqiqий Telegram ичида
  const hasInitData = Boolean(tg.initData && tg.initData.length > 0);
  const realPlatform = tg.platform && tg.platform !== 'unknown';
  return hasInitData || realPlatform;
}

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
    // ===== Mini App ochilish ketma-ketligi =====
    // Har bir chaqiruv feature detection bilan himoyalangan —
    // eski Telegram versiyalarida bu API'lar mavjud emas.
    tg.ready();

    if (typeof tg.expand === 'function') {
      try { tg.expand(); } catch { /* qo'llab-quvvatlanmaydi */ }
    }

    // To'liq ekran rejimi (Bot API 8.0+)
    if (typeof tg.requestFullscreen === 'function') {
      try { tg.requestFullscreen(); } catch { /* qo'llab-quvvatlanmaydi */ }
    }

    // Pastga swipe bilan yopilishni bloklaymiz (Bot API 7.7+).
    // Ilovadan chiqish faqat Telegram'ning Close tugmasi orqali.
    if (typeof tg.disableVerticalSwipes === 'function') {
      try { tg.disableVerticalSwipes(); } catch { /* qo'llab-quvvatlanmaydi */ }
    }

    // Yorug' mavzu — Telegram header va fon ranglari.
    // MUHIM: bu Telegram'ning O'Z native UI elementlarini
    // (status bar orqasidagi hudud, header) boshqaradi — CSS
    // o'zgaruvchilaridan MUSTAQIL. Ilova mavzusi (--canvas)
    // oq bo'lgach bu ham yangilanishi shart edi — aks holda
    // Telegram'ning o'zi hamon eski to'q rangni ko'rsatib,
    // status bar atrofida qora chiziq qolib ketardi.
    try {
      tg.setHeaderColor?.('#FFFFFF');
      tg.setBackgroundColor?.('#FFFFFF');
      tg.setBottomBarColor?.('#FFFFFF');
    } catch {
      // eski Telegram versiyalarida bo'lmasligi mumkin
    }
    // Viewport balandligини CSS o'zgaruvchisига yozamiz — har xil telefonда
    // (notch, klaviatura, kengaytirish) layout to'g'ri moslashadi.
    const syncViewport = () => {
      const root = document.documentElement;
      const h = tg.viewportStableHeight || tg.viewportHeight;
      if (h) root.style.setProperty('--tg-viewport-height', `${h}px`);

      // To'liq ekranda Telegram tugmalari (Закрыть, ⌄, ⋯) kontent ustiga
      // tushadi. Telegram ular egallagan balandlikni contentSafeAreaInset
      // da beradi (Bot API 8.0+).
      let top = tg.contentSafeAreaInset?.top ?? 0;

      // Eski versiyalarda bu maydon yo'q — to'liq ekranda bo'lsak
      // tugmalar balandligini taxminan qo'shamiz (~56px).
      if (!top && tg.isFullscreen) top = 56;

      root.style.setProperty('--tg-content-top', `${top}px`);
    };
    syncViewport();
    if (typeof tg.onEvent === 'function') {
      tg.onEvent('viewportChanged', syncViewport);
      // To'liq ekranga o'tganda balandlik va yuqori bo'shliq o'zgaradi
      tg.onEvent('fullscreenChanged', syncViewport);
      tg.onEvent('safeAreaChanged', syncViewport);
      tg.onEvent('contentSafeAreaChanged', syncViewport);
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
  // Tokenni API klientiga beramiz — himoyalangan so'rovlar ishlashi uchun.
  // (Avval faqat sessionStorage'ga yozilardi, API undan xabarsiz edi → 401)
  if (data.token) {
    const { setAuthToken } = await import('@/api');
    setAuthToken(data.token);
  }
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
// Taomга olib boruvchi Telegram Mini App havolasi.
// WEBAPP_NAME bo'lsa: t.me/Bot/nom?startapp=dish_<id>
// bo'lmasa:         t.me/Bot?startapp=dish_<id>  (ikkalasi ham webapp'ni ochadi)
function buildMiniAppLink(dishId) {
  const base = WEBAPP_NAME
    ? `https://t.me/${BOT_USERNAME}/${WEBAPP_NAME}`
    : `https://t.me/${BOT_USERNAME}`;
  return `${base}?startapp=food_${dishId}`;
}

/**
 * Taom ulashish havolasi — to'g'ridan Mini App.
 * Bosilganda Telegram ilovani ochib taom sahifasiga o'tkazadi.
 */
export function buildDishShareLink(dishId) {
  return buildMiniAppLink(dishId);
}

// Taomni Telegram do'stlarга ulashish.
// Telegram do'stlar ro'yxatини ochadi, taom havolasi + tavsif yuboriladi.
// Havola bosilganда webapp o'sha taom bilan ochiladi.
/** Havolani nusxalash — do'stга o'zi yuborish uchun. */
export async function copyDishLink(dish) {
  haptic();
  const link = buildDishShareLink(dish.id || dish._id);
  try {
    await navigator.clipboard.writeText(link);
    return true;
  } catch {
    return false;
  }
}

export function shareDish(dish) {
  haptic();
  const dishId = dish.id || dish._id;
  const link = buildDishShareLink(dishId);
  const tg = getTelegram();

  // ENG YAXSHI YO'L: inline rejim.
  // Telegram do'stlar ro'yxatini ochadi, tanlangach bot RASM +
  // formatlangan matn + "Buyurtma berish" tugmasini yuboradi.
  //
  // t.me/share/url orqali bunday xabar yuborib bo'lmaydi —
  // u faqat oddiy matn va havola qo'ya oladi.
  // Telegram 6.7+ da mavjud. Eski versiyalarda yo'q.
  if (typeof tg?.switchInlineQuery === 'function') {
    try {
      // Bo'sh joy MUHIM: usiz Telegram so'rovni yubormaydi,
      // foydalanuvchi qo'lda Enter bosishi kerak bo'ladi.
      tg.switchInlineQuery(`food_${dishId} `, ['users', 'groups', 'channels']);
      return;
    } catch (e) {
      console.warn('[share] inline ishlamadi:', e?.message);
    }
  }

  // ZAXIRA: oddiy ulashish (rasm bo'lmaydi)
  const price = dish.price ? `${dish.price.toLocaleString('ru-RU')} so'm` : '';
  const lines = [
    `🍽 ${dish.name}`,
    price && `💰 ${price}`,
    dish.restaurantName && `📍 ${dish.restaurantName}`,
    dish.description && `\n${dish.description}`,
    '\n👉 Buyurtma berish:',
  ].filter(Boolean);

  const shareUrl =
    `https://t.me/share/url?url=${encodeURIComponent(link)}`
    + `&text=${encodeURIComponent(lines.join('\n'))}`;

  if (tg?.openTelegramLink) tg.openTelegramLink(shareUrl);
  else window.open(shareUrl, '_blank');
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

  // XAVFSIZLIK: parametr faqat kutilgan naqshga mos bo'lsa qabul
  // qilinadi. Zararli qiymat (skript, yo'l, uzun matn) rad etiladi.
  // MongoDB ObjectId — aynan 24 ta o'n oltilik belgi.
  const OBJECT_ID = /^[a-f\d]{24}$/i;

  // food_<id> — asosiy format (TZ bo'yicha)
  // dish_<id> — eski havolalar uchun moslik
  const m = String(raw).match(/^(food|dish)_([A-Za-z\d]{1,64})$/);
  if (!m) return null;

  const id = m[2];
  if (!OBJECT_ID.test(id)) return null;

  return { type: 'dish', id };
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

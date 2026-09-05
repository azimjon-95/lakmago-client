// Telegram Mini App — global tip deklaratsiyasi va auto-auth mantiqi.
// TZ: WebApp ochilganda Telegram.WebApp.ready() chaqiriladi, initData va
// initDataUnsafe.user o'qiladi, backendga yuboriladi (POST /api/auth/telegram).
































export function getTelegram() {
  return window.Telegram?.WebApp;
}

/*
 * Telegram'ning NATIVE tepa qismini (status bar orqasidagi hudud)
 * joriy ekran foniga moslash.
 *
 * NIMA UCHUN KERAK: to'liq ekran rejimida (Mode: Fullscreen)
 * Telegram header'i shaffof bo'ladi va rasmiy hujjatga ko'ra
 * Telegram AYNAN SHU rangdan status bar (soat, antenna,
 * batareya) uchun KONTRAST rang tanlaydi:
 *   to'q rang berilsa  -> OQ soat/antenna
 *   och rang berilsa   -> QORA soat/antenna
 *
 * REAL QURILMADA ANIQLANDI: bu nazariya iOS'da ISHLAMADI.
 * setHeaderColor('#FFFFFF') berilganda ham Telegram status bar
 * ikonlarini OQ holicha qoldirdi — oq fon ustida ular butunlay
 * ko'rinmay ketdi (soat ham, antenna ham, batareya ham).
 *
 * Shuning uchun ranglarni Telegram tanlashiga TOPSHIRMAYMIZ.
 * Tepadagi status bar chizig'i HAR DOIM to'q (#002634 — splash
 * bilan bir xil) bo'ladi, oq ikonlar unda aniq ko'rinadi va
 * splashdan asosiy sahifaga o'tish ham silliq chiqadi.
 *
 * @param {string} color - '#RRGGBB'
 */
export function setTelegramSurfaceColor(color) {
  const tg = getTelegram();
  if (!tg) return;
  try {
    tg.setHeaderColor?.(color);
    tg.setBackgroundColor?.(color);
  } catch { /* eski Telegram versiyalarida bo'lmasligi mumkin */ }

  // CSS tomoni: status bar ostidagi qatlam ham shu rangda bo'lsin
  try {
    document.documentElement.style.setProperty('--tg-surface-top', color);
  } catch { /* SSR/DOM yo'q */ }
}

export function haptic() {
  getTelegram()?.HapticFeedback?.impactOccurred('light');
}













const API_BASE = import.meta.env.VITE_API_URL ?? null;

/*
 * Session.deviceId uchun — shu qurilma/brauzerni boshqalardan
 * ajratib turadi (masalan "boshqa qurilmalarda chiqish" funksiyasi
 * kelajakda kerak bo'lsa). Bir marta generatsiya qilinadi va
 * localStorage'da qoladi — sessionStorage emas, chunki tab
 * yopilganda ham SHU QURILMA ekanligi o'zgarmasligi kerak.
 */
function getDeviceId() {
  try {
    let id = localStorage.getItem('lokmago_device_id');
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : `dev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem('lokmago_device_id', id);
    }
    return id;
  } catch {
    return ''; // localStorage bloklangan — server deviceId'siz ham ishlaydi (ixtiyoriy maydon)
  }
}

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

    /*
     * expand()/requestFullscreen() FAQAT MOBILDA.
     *
     * Ilgari bu ikkalasi PLATFORMASIDAN QAT'IY NAZAR
     * chaqirilardi — desktop Telegram'da (Windows/macOS
     * dasturi) ilova butun oynani egallab, kichik popup emas,
     * to'liq ekran bo'lib ochilardi. Telefonda bu TO'G'RI
     * xulq (kontent uchun har bir piksel muhim), lekin
     * desktop'da mijoz kompyuterida boshqa ishlar bilan bir
     * qatorda ochib ko'rmoqchi bo'ladi — katta ekranni butunlay
     * band qilish keraksiz.
     *
     * tg.platform orqali aniqlanadi: mobil ('android',
     * 'android_x', 'ios') — kengaytiriladi. Qolgani (desktop:
     * 'tdesktop', 'macos'; veb: 'weba', 'webk'; yoki
     * 'unknown') — Telegram'ning o'z standart (ixcham) oyna
     * o'lchami saqlanadi, hech narsa chaqirilmaydi.
     */
    const isMobilePlatform = ['android', 'android_x', 'ios'].includes(tg.platform);

    if (isMobilePlatform) {
      /*
       * DIQQAT — BU BLOK ATAYLAB SODDA VA SINXRON.
       *
       * Bu aynan 38ae3fd commitidagi, ISHLAGANI TASDIQLANGAN
       * ketma-ketlik: ready() -> expand() -> requestFullscreen(),
       * hammasi bitta tickda, hech qanday kechikishsiz.
       *
       * Keyinchalik bu joyga bir necha "yaxshilash" kiritilgan edi:
       * requestAnimationFrame kechikishi, setTimeout, expand() ni
       * olib tashlash, takroriy urinishlar, index.html ga ko'chirish.
       * HECH BIRI YORDAM BERMADI va har biri ishlagan koddan
       * uzoqlashtirdi.
       *
       * Shuning uchun: KECHIKISH QO'SHMANG, expand() ni OLIB
       * TASHLAMANG, tartibni O'ZGARTIRMANG. Agar kelajakda bu yerni
       * o'zgartirish kerak bo'lsa — avval real qurilmada tekshiring.
       */
      if (typeof tg.expand === 'function') {
        try { tg.expand(); } catch { /* qo'llab-quvvatlanmaydi */ }
      }

      // To'liq ekran rejimi (Bot API 8.0+)
      if (typeof tg.requestFullscreen === 'function') {
        try { tg.requestFullscreen(); } catch { /* qo'llab-quvvatlanmaydi */ }
      }
    }

    // Pastga swipe bilan yopilishni bloklaymiz (Bot API 7.7+).
    // Ilovadan chiqish faqat Telegram'ning Close tugmasi orqali.
    if (typeof tg.disableVerticalSwipes === 'function') {
      try { tg.disableVerticalSwipes(); } catch { /* qo'llab-quvvatlanmaydi */ }
    }

    /*
     * Yorug' mavzu — Telegram header va fon ranglari.
     * MUHIM: bu Telegram'ning O'Z native UI elementlarini
     * (status bar orqasidagi hudud, header) boshqaradi — CSS
     * o'zgaruvchilaridan MUSTAQIL.
     *
     * TO'LIQ EKRANDA bu ayniqsa muhim: rasmiy hujjat aytadi —
     * fullscreen'da header shaffof bo'ladi, va Telegram AYNAN SHU
     * rangdan status bar (soat, antenna, batareya) va boshqaruv
     * tugmalari uchun KONTRAST rang tanlaydi. Oq bergani uchun
     * Telegram qora soat/antenna chizadi — bizga kerakli natija.
     */
    const applyColors = () => {
      // Tepa chizig'i OQ, status bar ikonlari TO'Q bo'lishi kerak.
      // Telegram kontrastni header rangidan hisoblaydi.
      setTelegramSurfaceColor('#FFFFFF');
      try {
        tg.setBottomBarColor?.('#FFFFFF');
      } catch {
        // eski Telegram versiyalarida bo'lmasligi mumkin
      }
    };
    applyColors();

    /*
     * RANGNI QAYTA BERISH — nima uchun kerak.
     *
     * BotFather'da Mode: Fullscreen yoqilgani uchun ilova
     * to'liq ekranda OCHILADI — ya'ni `fullscreenChanged`
     * hodisasi UMUMAN kelmaydi (rejim allaqachon o'rnatilgan).
     * Demak applyColors() faqat bir marta, React mount
     * bo'lganda ishlaydi.
     *
     * Ehtimol shu sabab ilgari ishlamagan: Telegram ochilish
     * paytida status bar uslubini O'ZI belgilaydi va bizning
     * chaqiruvimiz undan OLDIN kelib, keyin ustidan yozib
     * yuborilgan. Shuning uchun rangni bir necha marta,
     * ochilish tugagach ham qayta beramiz.
     */
    setTimeout(applyColors, 300);
    setTimeout(applyColors, 1200);
    if (typeof tg.onEvent === 'function') {
      // Ilova fon rejimidan qaytganda ham status bar tiklanishi kerak
      try { tg.onEvent('activated', applyColors); } catch { /* eski versiya */ }
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
      // To'liq ekranga o'tganda balandlik va yuqori bo'shliq o'zgaradi.
      // Ranglar ham QAYTA berilishi kerak — rejim almashganda Telegram
      // status bar kontrastini qaytadan hisoblaydi.
      tg.onEvent('fullscreenChanged', () => { syncViewport(); applyColors(); });
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
    body: JSON.stringify({
      initData,
      startParam: tg?.initDataUnsafe?.start_param || '',
      platform: 'telegram',
      deviceId: getDeviceId(),
    })
  });
  if (!res.ok) throw new Error(`Auth xatosi: ${res.status}`);
  const data = await res.json();
  /*
   * Tokenlarni API klientiga beramiz — himoyalangan so'rovlar
   * ishlashi uchun. accessToken (qisqa muddatli) + refreshToken
   * (uzoq muddatli, muddati tugaganda apiFetch o'zi avtomatik
   * yangilaydi) — Auth fundamenti. Eski `token` (uzoq muddatli,
   * 30 kun) ham qaytariladi va SAQLANADI — agar biror sabab bilan
   * accessToken/refreshToken kelmasa (masalan eski server versiyasi
   * bilan ishlab turgan holatda), ilova baribir ishlayveradi.
   */
  const { setAuthToken, setRefreshToken } = await import('@/api');
  if (data.accessToken) setAuthToken(data.accessToken);
  else if (data.token) setAuthToken(data.token);
  if (data.refreshToken) setRefreshToken(data.refreshToken);
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

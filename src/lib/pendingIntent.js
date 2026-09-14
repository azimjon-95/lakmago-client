/*
 * pendingIntent.js — AUTH PAYTIDA SAHIFA RELOAD BO'LIB QOLSA ZAXIRA
 * (fallback) MEXANIZMI.
 *
 * BU ASOSIY AUTH OQIMI EMAS:
 *
 *   Submit → ensureAuth() → AuthGateModal → Auth success →
 *   original submit() davom etadi
 *
 * Odatda AuthGateModal JOYIDA (in-place) ochiladi — CartPage/
 * ReservationPage unmount bo'lmaydi, local state (selectedAddress,
 * paymentMethod va h.k.) tabiiy ravishda saqlanadi. Bu holatda bu
 * fayl UMUMAN ishlatilmasligi ham mumkin.
 *
 * Faqat KUTILMAGAN holatlar uchun zaxira: Telegram WebApp fon
 * rejimiga o'tib qayta yuklansa, yoki browser/WebApp lifecycle
 * sahifani kutilmagan tarzda qayta mount qilsa — shunda
 * "foydalanuvchi NIMA boshlagan edi" degan signalni beradi.
 *
 * QAT'IY QOIDALAR:
 *   - order/booking'ning TO'LIQ ma'lumotini SAQLAMAYDI (cart,
 *     manzil, to'lov — bularning har biri O'Z JOYIDA — store/cart.js,
 *     server, store/user.js — allaqachon saqlanadi)
 *   - token/parol/Telegram initData/telefon SAQLAMAYDI
 *   - O'ZI HECH QACHON navigate() yoki window.location
 *     o'zgartirmaydi — faqat "data layer". Navigatsiya qarorini
 *     ilova/feature qatlami qabul qiladi (sabab: reload paytida
 *     order allaqachon yaratilgan, to'lov holati o'zgargan yoki
 *     savat o'zgargan bo'lishi mumkin — bu faqat recovery SIGNALI,
 *     "albatta shu yerga yubor" degan buyruq emas).
 *   - order/booking yaratish uchun AUTORITET EMAS — takroriy
 *     buyurtma/bron yaratish uchun ISHLATILMAYDI (mavjud backend
 *     idempotency mexanizmiga tayaniladi, bu fayl bunga aloqasi yo'q).
 *
 * Uslub pendingPayment.js namunasiga moslashtirilgan (localStorage,
 * TTL, xatoga chidamli parsing, tozalash) — LEKIN bu fayl MUSTAQIL
 * modul, pendingPayment.js O'ZGARTIRILMAGAN.
 */

const PENDING_INTENT_KEY = 'lokmago_pending_intent';
const PENDING_INTENT_TTL = 10 * 60 * 1000; // 10 daqiqa

const VALID_TYPES = new Set(['order', 'booking']);

/*
 * returnPath FAQAT ilova ichki yo'li bo'lishi mumkin — aks holda
 * open redirect bo'lardi (masalan https://evil.com saqlanib,
 * keyinchalik recovery paytida shu yerga yo'naltirilsa).
 *
 * Ruxsat etiladi:   '/cart', '/restaurant/123', '/restaurant/123/booking'
 * Rad etiladi:      'https://evil.com', 'http://evil.com', '//evil.com',
 *                   'javascript:...', '/\evil.com' (backslash-trik —
 *                   ba'zi brauzerlar '\' ni '/' kabi talqin qiladi)
 */
function isSafeReturnPath(path) {
  if (typeof path !== 'string') return false;
  const p = path.trim();
  if (!p) return false;
  // Bitta "/" bilan boshlanishi, undan KEYINGI belgi "/" yoki "\"
  // bo'lmasligi kerak — "//evil.com" va "/\evil.com" ni bloklaydi
  if (!/^\/(?!\/|\\)/.test(p)) return false;
  // Qo'shimcha himoya: "schema:" bilan boshlanuvchi har qanday qator
  // (masalan "javascript:...") — yuqoridagi tekshiruv buni allaqachon
  // ushlaydi ("/" bilan boshlanmagani uchun), lekin aniqlik uchun qoldi
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(p)) return false;
  return true;
}

function safeStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Transactional action (order/booking submit) BOSHLANISHIDAN OLDIN
 * chaqiriladi. `ts` FUNKSIYANING O'ZI qo'shadi — chaqiruvchi buni
 * yubormasligi kerak.
 *
 * @param {{ type: 'order'|'booking', returnPath: string }} intent
 */
export function setPendingIntent(intent) {
  const storage = safeStorage();
  if (!storage) return;
  if (!intent || !VALID_TYPES.has(intent.type)) return;
  if (!isSafeReturnPath(intent.returnPath)) return;

  const payload = {
    type: intent.type,
    returnPath: intent.returnPath.trim(),
    ts: Date.now(),
  };

  try {
    storage.setItem(PENDING_INTENT_KEY, JSON.stringify(payload));
  } catch {
    /* storage to'liq yoki bloklangan — sessiya davomida yo'qoladi, zarari kam */
  }
}

/**
 * Saqlangan intent'ni o'qiydi. JSON buzuq, maydonlar noto'g'ri,
 * turi noma'lum, returnPath xavfli yoki muddati o'tgan bo'lsa —
 * AVTOMATIK tozalab, null qaytaradi.
 *
 * @returns {{ type: 'order'|'booking', returnPath: string, ts: number } | null}
 */
export function getPendingIntent() {
  const storage = safeStorage();
  if (!storage) return null;

  let raw;
  try {
    raw = storage.getItem(PENDING_INTENT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    clearPendingIntent();
    return null;
  }

  const valid = data
    && typeof data === 'object'
    && VALID_TYPES.has(data.type)
    && isSafeReturnPath(data.returnPath)
    && typeof data.ts === 'number'
    && Number.isFinite(data.ts);

  if (!valid) {
    clearPendingIntent();
    return null;
  }

  if (Date.now() - data.ts > PENDING_INTENT_TTL) {
    clearPendingIntent();
    return null;
  }

  return { type: data.type, returnPath: data.returnPath, ts: data.ts };
}

/**
 * Saqlangan intent'ni o'chiradi. Storage xatosi (masalan
 * localStorage bloklangan) ilovani BUZMASLIGI kerak.
 */
export function clearPendingIntent() {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.removeItem(PENDING_INTENT_KEY);
  } catch {
    /* e'tiborsiz */
  }
}

/**
 * Intent'ni BIR MARTA o'qiydi va DARHOL o'chiradi — bir xil intent
 * ikki marta "ishlatilib" ketmasligi uchun (masalan bir nechta
 * komponent bir vaqtda tekshirsa, faqat biri uni oladi).
 *
 * @returns {{ type: 'order'|'booking', returnPath: string, ts: number } | null}
 */
export function consumePendingIntent() {
  const intent = getPendingIntent();
  if (intent) clearPendingIntent();
  return intent;
}

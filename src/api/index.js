// LokmaGo API mijozi — faqat real backend (Express + MongoDB).
// Mock/demo rejim yo'q: barcha ma'lumot serverdan keladi.

export const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

/*
 * ===== AUTH TOKENLARI =====
 *
 * accessToken — qisqa muddatli (server: 1 soat), HAR SO'ROVDA
 * Authorization header'da yuboriladi. sessionStorage'da (sahifa
 * yangilanganda saqlanadi, tab/brauzer yopilganda yo'qoladi —
 * ESKI xatti-harakat, o'zgartirilmadi).
 *
 * refreshToken — uzoq muddatli (server: 30 kun), FAQAT accessToken
 * muddati tugaganda (401 kelganda) ishlatiladi. localStorage'da —
 * accessToken'dan farqli, chunki uning butun maqsadi FOYDALANUVCHINI
 * TAB/BRAUZER YOPILGANDAN KEYIN HAM ESLAB QOLISH (sessionStorage'ga
 * qo'ysak, refresh token'ning uzoq-muddatliligi ma'nosiz qolardi).
 */
const TOKEN_KEY = 'lokmago_token';
const REFRESH_TOKEN_KEY = 'lokmago_refresh_token';

let authToken = (typeof sessionStorage !== 'undefined')
  ? sessionStorage.getItem(TOKEN_KEY)
  : null;
let refreshTokenValue = (typeof localStorage !== 'undefined')
  ? localStorage.getItem(REFRESH_TOKEN_KEY)
  : null;

export function setAuthToken(token) {
  authToken = token || null;
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch { /* sessionStorage bloklangan bo'lishi mumkin */ }
}

export function getAuthToken() {
  return authToken;
}

export function setRefreshToken(token) {
  refreshTokenValue = token || null;
  try {
    if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
    else localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch { /* localStorage bloklangan bo'lishi mumkin */ }
}

export function getRefreshToken() {
  return refreshTokenValue;
}

// Logout yoki "sessiya butunlay yaroqsiz" holatida — ikkalasini ham tozalaydi
export function clearAuthTokens() {
  setAuthToken(null);
  setRefreshToken(null);
}

// MongoDB `_id` ni `id` ga ham nusxalaymиz (rekursiv).
// Sabab: backend `_id` (ObjectId) beradi, UI kодда `.id` ishlatiladi.
// Shu tufayli hech qayerда `undefined` id bo'lmaydi va serverга to'g'ri ObjectId ketadi.
function normalizeIds(data) {
  if (Array.isArray(data)) return data.map(normalizeIds);
  if (data && typeof data === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(data)) {
      out[k] = normalizeIds(v);
    }
    // _id bor va id yo'q bo'lsa — id ni qo'shamiz (string ko'rinishда)
    if (out._id !== undefined && out.id === undefined) {
      out.id = String(out._id);
    }
    return out;
  }
  return data;
}

// Umumiy fetch — AbortController (signal) qo'llab-quvvatlaydi, JWT qo'shadi.
async function doFetch(path, { signal, ...options } = {}) {
  const url = `${API_BASE}${path}`;
  let res;
  try {
    res = await fetch(url, {
      ...options,
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (e) {
    // Tarmoq darajasidagi xato: CORS, Mixed Content (HTTPS→HTTP), server o'chiq
    if (e.name === 'AbortError') throw e;
    const err = new Error('Serverga ulanib bo‘lmadi');
    err.kind = 'network';
    err.url = url;
    err.detail = e.message;
    throw err;
  }
  return res;
}

/*
 * Bir vaqtda bir nechta so'rov 401 qaytarsa (masalan sahifa
 * ochilganda 5 ta parallel so'rov), HAR BIRI ALOHIDA
 * /auth/refresh chaqirmasin — bitta "inflight" promise'ni
 * hammasi kutadi (deduplication).
 */
let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      if (!refreshTokenValue) return false;
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refreshTokenValue }),
        });
        if (!res.ok) { clearAuthTokens(); return false; }
        const data = await res.json();
        setAuthToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        return true;
      } catch {
        return false; // tarmoq xatosi — tokenlarni SAQLAB QOLAMIZ, keyingi urinishda qayta sinaladi
      }
    })().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

async function apiFetch(path, opts = {}) {
  let res = await doFetch(path, opts);

  /*
   * 401 kelsa — accessToken muddati tugagan bo'lishi mumkin.
   * /auth/* so'rovlarining o'zini qayta urinmaymiz (cheksiz
   * rekursiya: refresh so'rovi 401 qaytarsa, uni refresh
   * qilishga urinish ma'nosiz).
   */
  if (res.status === 401 && !path.startsWith('/auth/') && refreshTokenValue) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await doFetch(path, opts); // bir marta qayta urinish
    }
  }

  if (!res.ok) {
    /*
     * Serverning haqiqiy sababi ({ error: '...' }) o'qib
     * olinadi. Avval bu tashlab yuborilardi va foydalanuvchi
     * har doim "Server xatosi (400)" kabi umumiy xabar ko'rardi
     * — masalan "Telefon raqam noto'g'ri" o'rniga.
     */
    let serverMessage = '';
    try {
      const body = await res.clone().json();
      serverMessage = body?.error || '';
    } catch { /* JSON emas yoki bo'sh — umumiy xabar qoladi */ }

    const err = new Error(serverMessage || `Server xatosi (${res.status})`);
    err.status = res.status;
    err.kind = 'http';
    err.url = `${API_BASE}${path}`;
    throw err;
  }
  if (res.status === 204) return null;
  const json = await res.json();
  return normalizeIds(json);
}

export const api = {
  // ===== Xarita =====
  // Yandex JS API kaliti — server domenga cheklab beradi,
  // kodda saqlanmaydi
  getMapsConfig: (opts) => apiFetch('/maps/config', opts),
  // Koordinatadan manzil (kalit serverda qoladi — proksi)
  reverseGeocodeYandex: (lat, lng, opts) =>
    apiFetch(`/maps/reverse?lat=${lat}&lng=${lng}`, opts),

  // ===== Katalog =====
  getBanners: (opts) => apiFetch('/banners', opts),
  // Restoran/taom reklamalari — admin tasdiqlagan, bosh sahifa banneriga qo'shiladi
  getBannerAds: (opts) => apiFetch('/ads/banner', opts),
  clickAd: (id) => apiFetch(`/ads/${id}/click`, { method: 'POST' }),

  getRestaurants: async (opts) => {
    const res = await apiFetch('/restaurants', opts);
    return Array.isArray(res) ? res : (res.items ?? []);
  },

  getRestaurant: (id, opts) => apiFetch(`/restaurants/${id}`, opts),

  getDishes: (restaurantId, opts) => apiFetch(`/restaurants/${restaurantId}/dishes`, opts),

  /**
   * Bron oldindan buyurtma ekrani (PreOrderScreen) uchun menyu —
   * restoranning o'z narxida (yetkazish ustamasi va mijoz xizmat
   * haqisiz), chunki mehmon zalga kelib yeydi, yetkazish emas.
   *
   * MUHIM: bu endpoint DineInConfig (QR/Kiosk zal buyurtmasi
   * yoqilgan-yoqilmaganligi) bilan BOG'LIQ EMAS — bular ikkita
   * mustaqil funksiya. Ilgari /dine-in/menu/:id ishlatilardi, u esa
   * "Dine-in faol emas" deb rad etardi agar restoran QR/Kiosk
   * funksiyasini yoqmagan bo'lsa — garchi bron oldindan
   * buyurtmasining bunga hech qanday aloqasi yo'q edi.
   */
  getReservationMenu: (restaurantId, opts) => apiFetch(`/reservations/menu/${restaurantId}`, opts),

  getDish: (id, opts) => apiFetch(`/dishes/${id}`, opts),

  getTrendingDishes: (opts) => apiFetch('/dishes/trending', opts),

  getDiscountedDishes: (opts) => apiFetch('/dishes/discounted', opts),

  // Barcha restoranlar taomlarи aralash (bosh sahifа)
  getAllDishes: async (opts) => {
    const res = await apiFetch('/dishes/all', opts);
    return Array.isArray(res) ? res : (res.items ?? []);
  },

  // ===== Auth =====
  // Eslatma: haqiqiy login oqimi src/lib/telegram.js da (Telegram
  // WebApp obyektidan initData olish alohida logika talab qiladi),
  // shu funksiya hozircha ISHLATILMAYDI — kelajakda shu yerga
  // ko'chirish mumkin bo'lishi uchun saqlanmoqda.
  loginTelegram: (initData, startParam) =>
    apiFetch('/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ initData, startParam }),
    }),

  // Access token muddati tugaganda apiFetch o'zi avtomatik
  // chaqiradi (yuqoridagi refreshAccessToken) — bu funksiya
  // qo'lda refresh qilish kerak bo'lgan kam uchraydigan holatlar
  // uchun (masalan ilova fon-oldinga qaytganda tekshirish)
  refreshSession: () => apiFetch('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: getRefreshToken() }),
  }),

  // Joriy qurilmadagi sessiyani serverda bekor qiladi (Session.revokedAt)
  // — mahalliy tokenlarni tozalash CHAQIRUVCHI tomonda (masalan
  // ProfilePage) clearAuthTokens() orqali alohida qilinadi.
  logoutSession: () => apiFetch('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: getRefreshToken() }),
  }),

  // ===== Buyurtma =====
  createOrder: (payload) =>
    apiFetch('/orders', { method: 'POST', body: JSON.stringify(payload) }),

  // Mening buyurtmalarim (server tarixi)
  getMyOrders: () => apiFetch('/orders', { method: 'GET' }),
  cancelOrder: (id) => apiFetch(`/orders/${id}/cancel`, { method: 'PATCH' }),

  getActiveOrders: (opts) => apiFetch('/orders/active', { method: 'GET', ...opts }),
  // Bitta buyurtma — karta to'lovi tasdiqlanganini tekshirish uchun
  getOrder: (id) => apiFetch(`/orders/${id}`, { method: 'GET' }),

  getOrderGroup: (groupId) => apiFetch(`/orders/group/${groupId}`, { method: 'GET' }),

  confirmDelivery: (orderId, rating, comment) =>
    apiFetch(`/orders/${orderId}/confirm`, {
      method: 'PATCH',
      body: JSON.stringify({ rating, comment }),
    }),

  // ===== Manzillar (serverda saqlanadi) =====
  getAddresses: () => apiFetch('/addresses', { method: 'GET' }),
  createAddress: (data) => apiFetch('/addresses', { method: 'POST', body: JSON.stringify(data) }),
  updateAddress: (id, data) => apiFetch(`/addresses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAddress: (id) => apiFetch(`/addresses/${id}`, { method: 'DELETE' }),
  setDefaultAddress: (id) => apiFetch(`/addresses/${id}/default`, { method: 'PATCH' }),

  // ===== To'lov tizimlari =====
  // Server vaqti — ish vaqtini to'g'ri hisoblash uchun
  // Yetkazish masofasi va narxi
  getDeliveryQuote: (restaurantId, lat, lng) =>
    apiFetch(`/maps/delivery-quote?restaurantId=${restaurantId}&lat=${lat}&lng=${lng}`),

  getServerTime: () => apiFetch('/time', { method: 'GET' }),

  getPaymentStatus: () => apiFetch('/payments/status', { method: 'GET' }),
  getPaymentLink: (orderId, provider) =>
    apiFetch(`/payments/link/${orderId}?provider=${provider}`, { method: 'GET' }),

  // ===== To'lov kartalari =====
  getCards: () => apiFetch('/cards', { method: 'GET' }),
  addCard: (data) => apiFetch('/cards', { method: 'POST', body: JSON.stringify(data) }),
  deleteCard: (id) => apiFetch(`/cards/${id}`, { method: 'DELETE' }),
  setDefaultCard: (id) => apiFetch(`/cards/${id}/default`, { method: 'PATCH' }),

  // ===== Qo'llab-quvvatlash chati =====
  getSupportChat: () => apiFetch('/support/chat', { method: 'GET' }),
  // Boshlang'ich "online/offline" holati — socket ulanishidan oldin
  getSupportPresence: () => apiFetch('/support/presence', { method: 'GET' }),
  sendSupportMessage: (text) => apiFetch('/support/message', { method: 'POST', body: JSON.stringify({ text }) }),

  // ===== Referral =====
  getReferralInfo: () => apiFetch('/referral/me', { method: 'GET' }),
  getSubscription: () => apiFetch('/referral/subscription', { method: 'GET' }),

  // ===== Bron =====
  getMyReservations: () => apiFetch('/reservations/my', { method: 'GET' }),
  cancelReservation: (id) => apiFetch(`/reservations/${id}/cancel`, { method: 'PATCH' }),
  createReservation: (payload) =>
    apiFetch('/reservations', { method: 'POST', body: JSON.stringify(payload) }),

  // ===== To'lov =====
  createPayment: (orderId, provider) =>
    apiFetch('/payments/create', {
      method: 'POST',
      body: JSON.stringify({ orderId, provider }),
    }),
};

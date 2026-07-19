// LokmaGo API mijozi — faqat real backend (Express + MongoDB).
// Mock/demo rejim yo'q: barcha ma'lumot serverdan keladi.

export const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

// JWT token (Telegram login orqali olinadi)
let authToken = null;
export function setAuthToken(token) {
  authToken = token;
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
async function apiFetch(path, { signal, ...options } = {}) {
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
    const err = new Error('Serverga ulanib bo\u2018lmadi');
    err.kind = 'network';
    err.url = url;
    err.detail = e.message;
    throw err;
  }
  if (!res.ok) {
    const err = new Error(`Server xatosi (${res.status})`);
    err.status = res.status;
    err.kind = 'http';
    err.url = url;
    throw err;
  }
  if (res.status === 204) return null;
  const json = await res.json();
  return normalizeIds(json);
}

export const api = {
  // ===== Katalog =====
  getBanners: (opts) => apiFetch('/banners', opts),

  getRestaurants: async (opts) => {
    const res = await apiFetch('/restaurants', opts);
    return Array.isArray(res) ? res : (res.items ?? []);
  },

  getRestaurant: (id, opts) => apiFetch(`/restaurants/${id}`, opts),

  getDishes: (restaurantId, opts) => apiFetch(`/restaurants/${restaurantId}/dishes`, opts),

  getDish: (id, opts) => apiFetch(`/dishes/${id}`, opts),

  getTrendingDishes: (opts) => apiFetch('/dishes/trending', opts),

  getDiscountedDishes: (opts) => apiFetch('/dishes/discounted', opts),

  // Barcha restoranlar taomlarи aralash (bosh sahifа)
  getAllDishes: async (opts) => {
    const res = await apiFetch('/dishes/all', opts);
    return Array.isArray(res) ? res : (res.items ?? []);
  },

  // ===== Auth =====
  loginTelegram: (initData, startParam) =>
    apiFetch('/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ initData, startParam }),
    }),

  // ===== Buyurtma =====
  createOrder: (payload) =>
    apiFetch('/orders', { method: 'POST', body: JSON.stringify(payload) }),

  getActiveOrders: (opts) => apiFetch('/orders/active', { method: 'GET', ...opts }),

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

  // ===== Referral =====
  getReferralInfo: () => apiFetch('/referral/me', { method: 'GET' }),
  getSubscription: () => apiFetch('/referral/subscription', { method: 'GET' }),

  // ===== Bron =====
  createReservation: (payload) =>
    apiFetch('/reservations', { method: 'POST', body: JSON.stringify(payload) }),

  // ===== To'lov =====
  createPayment: (orderId, provider) =>
    apiFetch('/payments/create', {
      method: 'POST',
      body: JSON.stringify({ orderId, provider }),
    }),
};

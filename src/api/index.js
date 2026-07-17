import { restaurants, dishes, banners, trendingDishIds, discountedDishIds } from '@/data/mock';

// API mijozi. VITE_API_URL='mock' bo'lsa demo (mock) rejim ishlaydi,
// aks holda real backend (Express + MongoDB). TanStack Query bilan ishlaydi.

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';
const DEMO_MODE = API_BASE === 'mock';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// Request cancellation (AbortController) bilan fetch — eski so'rovlar bekor qilinadi
async function tryFetch(path, fallback, { signal } = {}) {
  if (DEMO_MODE) {
    await delay(120);
    return fallback;
  }
  try {
    const res = await fetch(`${API_BASE}${path}`, { signal });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch (e) {
    // So'rov bekor qilingan bo'lsa — jim o'tamiz (yangi so'rov keldi)
    if (e.name === 'AbortError') throw e;
    // Backend yo'q bo'lsa demo uchun mock (production'da bu kamdan-kam)
    await delay(200);
    return fallback;
  }
}

// JWT token'ni saqlash (Telegram login orqali olinadi)
let authToken = null;
export function setAuthToken(token) {
  authToken = token;
}

async function authFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...options.headers
    }
  });
  if (!res.ok) throw new Error(`API xatosi: ${res.status}`);
  return await res.json();
}

// Demo (backend yo'q) rejimda soxta ID generatsiya
function mockId(prefix = 'A') {
  return prefix + Math.floor(1000 + Math.random() * 9000);
}

// authFetch'ni mock fallback bilan o'raymiz — backend yo'q bo'lsa soxta javob
async function authFetchOrMock(path, options, mockResponse) {
  if (DEMO_MODE) {
    await delay(400);
    return mockResponse();
  }
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(options.headers || {}),
      },
    });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch {
    await delay(400);
    return mockResponse();
  }
}

export const api = {
  getBanners: (opts) => tryFetch('/banners', banners, opts),

  getRestaurants: async (opts) => {
    const res = await tryFetch('/restaurants', { items: restaurants, nextCursor: null, hasMore: false }, opts);
    // Backend { items, nextCursor } qaytaradi; mock ham shu formatда. Array bo'lsa ham qo'llab-quvvatlaymiz.
    return Array.isArray(res) ? res : (res.items ?? []);
  },

  getRestaurant: (id, opts) =>
  tryFetch(
    `/restaurants/${id}`,
    restaurants.find((r) => r.id === id),
    opts,
  ),

  getDishes: (restaurantId, opts) =>
  tryFetch(
    `/restaurants/${restaurantId}/dishes`,
    dishes.filter((d) => d.restaurantId === restaurantId),
    opts,
  ),

  // Bitta taom (ulashilган havola uchun)
  getDish: (id, opts) =>
  tryFetch(
    `/dishes/${id}`,
    dishes.find((d) => d.id === id),
    opts,
  ),

  getTrendingDishes: (opts) =>
  tryFetch(
    '/dishes/trending',
    dishes.filter((d) => trendingDishIds.includes(d.id)),
    opts,
  ),

  getDiscountedDishes: (opts) =>
  tryFetch(
    '/dishes/discounted',
    dishes.filter((d) => discountedDishIds.includes(d.id)),
    opts,
  ),

  // Barcha restoranlar taomlarи aralash (bosh sahifа)
  getAllDishes: async (opts) => {
    const res = await tryFetch('/dishes/all', { items: dishes, nextCursor: null, hasMore: false }, opts);
    return Array.isArray(res) ? res : (res.items ?? []);
  },

  // Telegram login — token qaytaradi
  loginTelegram: (initData) =>
  authFetch('/auth/telegram', {
    method: 'POST',
    body: JSON.stringify({ initData })
  }),

  // Buyurtma yaratish (batch — bir yoki bir necha restoran)
  // payload: { orders: [...], address, phone, paymentMethod, paymentLabel }
  createOrder: (payload) =>
  authFetchOrMock('/orders', { method: 'POST', body: JSON.stringify(payload) }, () => {
    const groupId = 'G' + Date.now();
    return {
      groupId,
      orders: payload.orders.map((o, i) => ({
        _id: mockId('A') + i,
        ...o,
        groupId,
        address: payload.address,
        phone: payload.phone,
        paymentMethod: payload.paymentMethod,
        total: o.subtotal + (o.deliveryFee || 0) + (o.serviceFee || 0),
        status: 'pending',
        courierName: ['Aziz', 'Bek', 'Dilshod', 'Jasur'][i % 4],
        createdAt: new Date().toISOString(),
      })),
    };
  }),

  // Faol buyurtmalar
  getActiveOrders: () => authFetchOrMock('/orders/active', { method: 'GET' }, () => []),

  // ===== Referral tizimi =====
  // Referal statistika (havola, do'stlar soni, bonus)
  getReferralInfo: () => authFetchOrMock('/referral/me', { method: 'GET' }, () => ({
    referralLink: 'https://t.me/LokmaGoBot?start=ref_demo',
    referralCount: 0, bonusBalance: 0, reward: 5000, welcomeBonus: 3000,
  })),
  // Asosiy kanал obuna holati (gate)
  getSubscription: () => authFetchOrMock('/referral/subscription', { method: 'GET' }, () => ({
    required: false, subscribed: true,
  })),

  // Guruh (bitta buyurtma = bir necha restoran)
  getOrderGroup: (groupId) => authFetchOrMock(`/orders/group/${groupId}`, { method: 'GET' }, () => []),

  // Mijoz "Ha, oldim" — yakunlash + baho
  confirmDelivery: (orderId, rating, comment) =>
  authFetchOrMock(`/orders/${orderId}/confirm`, { method: 'PATCH', body: JSON.stringify({ rating, comment }) }, () => ({
    _id: orderId, status: 'delivered', rating, comment,
  })),

  // Stol bron qilish
  createReservation: (payload) =>
  authFetchOrMock('/reservations', { method: 'POST', body: JSON.stringify(payload) }, () => ({
    _id: mockId('R'),
    ...payload,
    status: 'pending',
    createdAt: new Date().toISOString(),
  })),

  // To'lov boshlash — checkout URL qaytaradi
  createPayment: (orderId, provider) =>
  authFetchOrMock('/payments/create', { method: 'POST', body: JSON.stringify({ orderId, provider }) }, () => ({
    checkoutUrl: null,
    provider,
    orderId,
    demo: true,
  }))
};

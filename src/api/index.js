import { restaurants, dishes, banners, trendingDishIds, discountedDishIds } from '@/data/mock';


// Real backend Express + MongoDB bilan ishlaydi.
// Hozircha mock — har bir funksiya Promise qaytaradi, shu tufayli
// TanStack Query bilan ishlash real API ga o'tganda o'zgarmaydi.

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';
// Demo rejim: VITE_API_URL='mock' bo'lsa backendga umuman urilmaydi, to'g'ridan mock.
const DEMO_MODE = API_BASE === 'mock';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function tryFetch(path, fallback) {
  if (DEMO_MODE) {
    await delay(150);
    return fallback;
  }
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch {
    await delay(250); // mock kechikish
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
  getBanners: () => tryFetch('/banners', banners),

  getRestaurants: () => tryFetch('/restaurants', restaurants),

  getRestaurant: (id) =>
  tryFetch(
    `/restaurants/${id}`,
    restaurants.find((r) => r.id === id)
  ),

  getDishes: (restaurantId) =>
  tryFetch(
    `/restaurants/${restaurantId}/dishes`,
    dishes.filter((d) => d.restaurantId === restaurantId)
  ),

  getTrendingDishes: () =>
  tryFetch(
    '/dishes/trending',
    dishes.filter((d) => trendingDishIds.includes(d.id))
  ),

  getDiscountedDishes: () =>
  tryFetch(
    '/dishes/discounted',
    dishes.filter((d) => discountedDishIds.includes(d.id))
  ),

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

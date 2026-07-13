import { restaurants, dishes, banners, trendingDishIds, discountedDishIds } from '@/data/mock';


// Real backend Express + MongoDB bilan ishlaydi.
// Hozircha mock — har bir funksiya Promise qaytaradi, shu tufayli
// TanStack Query bilan ishlash real API ga o'tganda o'zgarmaydi.

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function tryFetch(path, fallback) {
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

  // Buyurtma yaratish
  createOrder: (payload) =>
  authFetch('/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),

  // Stol bron qilish
  createReservation: (payload) =>
  authFetch('/reservations', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),

  // To'lov boshlash — checkout URL qaytaradi
  createPayment: (orderId, provider) =>
  authFetch('/payments/create', {
    method: 'POST',
    body: JSON.stringify({ orderId, provider })
  })
};

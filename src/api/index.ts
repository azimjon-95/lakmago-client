import { restaurants, dishes, banners, trendingDishIds, discountedDishIds } from '@/data/mock';
import type { Restaurant, Dish, Banner } from '@/types';

// Real backend Express + MongoDB bilan ishlaydi.
// Hozircha mock — har bir funksiya Promise qaytaradi, shu tufayli
// TanStack Query bilan ishlash real API ga o'tganda o'zgarmaydi.

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function tryFetch<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as T;
  } catch {
    await delay(250); // mock kechikish
    return fallback;
  }
}

// JWT token'ni saqlash (Telegram login orqali olinadi)
let authToken: string | null = null;
export function setAuthToken(token: string) {
  authToken = token;
}

async function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`API xatosi: ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  getBanners: () => tryFetch<Banner[]>('/banners', banners),

  getRestaurants: () => tryFetch<Restaurant[]>('/restaurants', restaurants),

  getRestaurant: (id: string) =>
    tryFetch<Restaurant | undefined>(
      `/restaurants/${id}`,
      restaurants.find((r) => r.id === id),
    ),

  getDishes: (restaurantId: string) =>
    tryFetch<Dish[]>(
      `/restaurants/${restaurantId}/dishes`,
      dishes.filter((d) => d.restaurantId === restaurantId),
    ),

  getTrendingDishes: () =>
    tryFetch<Dish[]>(
      '/dishes/trending',
      dishes.filter((d) => trendingDishIds.includes(d.id)),
    ),

  getDiscountedDishes: () =>
    tryFetch<Dish[]>(
      '/dishes/discounted',
      dishes.filter((d) => discountedDishIds.includes(d.id)),
    ),

  // Telegram login — token qaytaradi
  loginTelegram: (initData: string) =>
    authFetch<{ token: string }>('/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    }),

  // Buyurtma yaratish
  createOrder: (payload: unknown) =>
    authFetch<{ _id: string; status: string }>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Stol bron qilish
  createReservation: (payload: unknown) =>
    authFetch<{ _id: string; status: string }>('/reservations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // To'lov boshlash — checkout URL qaytaradi
  createPayment: (orderId: string, provider: string) =>
    authFetch<{ checkoutUrl: string }>('/payments/create', {
      method: 'POST',
      body: JSON.stringify({ orderId, provider }),
    }),
};

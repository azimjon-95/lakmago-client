import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { api } from '@/api';

// Har query TanStack signal'ini API'ga uzatadi — eski so'rovlar bekor qilinadi (AbortController).

export const useBannersQuery = () =>
  useQuery({
    queryKey: ['banners'],
    queryFn: ({ signal }) => api.getBanners({ signal }),
    staleTime: 10 * 60_000, // bannerlar kam o'zgaradi
  });

// Restoran/taom reklamalari — admin tasdiqlagan, tez-tez o'zgarishi
// mumkin (yangi tasdiqlanadi/muddati tugaydi), shuning uchun
// bannerlarga qaraganda qisqaroq staleTime.
export const useBannerAds = () =>
  useQuery({
    queryKey: ['ads', 'banner'],
    queryFn: ({ signal }) => api.getBannerAds({ signal }),
    staleTime: 2 * 60_000,
  });

export const useRestaurants = () =>
  useQuery({
    queryKey: ['restaurants'],
    queryFn: ({ signal }) => api.getRestaurants({ signal }),
  });

export const useRestaurant = (id) =>
  useQuery({
    queryKey: ['restaurant', id],
    queryFn: ({ signal }) => api.getRestaurant(id, { signal }),
    enabled: !!id,
  });

export const useDishes = (restaurantId) =>
  useQuery({
    queryKey: ['dishes', restaurantId],
    queryFn: ({ signal }) => api.getDishes(restaurantId, { signal }),
    enabled: !!restaurantId,
  });

/**
 * Restoranning o'z narxidagi menyu (yetkazish ustamasi va mijoz
 * xizmat haqisiz). Bron oldindan buyurtmasi shuni ishlatadi —
 * mehmon zalda o'tirib yeydi, kuryer kerak emas.
 *
 * DineInConfig (QR/Kiosk zal buyurtmasi)ga bog'liq emas — bron
 * har doim ishlashi kerak, restoran QR/Kiosk funksiyasini
 * yoqmagan bo'lsa ham.
 */
export const usePreOrderMenu = (restaurantId) =>
  useQuery({
    queryKey: ['preorder-menu', restaurantId],
    queryFn: ({ signal }) => api.getReservationMenu(restaurantId, { signal }),
    enabled: !!restaurantId,
  });

export const useTrendingDishes = () =>
  useQuery({
    queryKey: ['dishes', 'trending'],
    queryFn: ({ signal }) => api.getTrendingDishes({ signal }),
  });

export const useDiscountedDishes = () =>
  useQuery({
    queryKey: ['dishes', 'discounted'],
    queryFn: ({ signal }) => api.getDiscountedDishes({ signal }),
  });

/*
 * ═══ BOSH SAHIFA QATORLARI — SERVER FILTRLI TASMA ═══
 *
 * «Super Chegirmalar» va «Tavsiya qilamiz» qatorlari endi
 * /dishes/all?discounted=&category= dan to'g'ridan-to'g'ri
 * olinadi — «Barchasi» sahifasi bilan AYNAN bir manba.
 *
 * AVVALGI MUAMMO: bosh sahifa eng yangi 50 ta taomni olib,
 * kategoriyani mijozda filtrlardi. Tanlangan kategoriyadagi
 * taomlar o'sha 50 talikka tushmasa (yoki restoran yopiq
 * bo'lsa) qatorlar butunlay yo'qolardi — «Barchasi» sahifasida
 * esa o'sha taomlar bemalol ko'rinardi.
 *
 * Kalit kategoriya bo'yicha — har kategoriya alohida keshlanadi,
 * qaytib tanlanganda darhol chiqadi.
 */
export const HOME_FEED_LIMIT = 50;

export const dishFeedQuery = ({ discounted, category = 'all', limit = HOME_FEED_LIMIT }) => ({
  queryKey: ['dishes', 'feed', discounted ? 'discount' : 'regular', category, limit],
  queryFn: async ({ signal }) => {
    const res = await api.getDishesFeed({ discounted, category, limit, signal });
    return Array.isArray(res?.items) ? res.items : [];
  },
  staleTime: 2 * 60_000,
});

export const useDishFeed = (params) => useQuery(dishFeedQuery(params));

export const useAllDishes = () =>
  useQuery({
    queryKey: ['dishes', 'all'],
    queryFn: ({ signal }) => api.getAllDishes({ signal }),
  });

// Prefetch — restoran kartasiga tegilганда menyuни oldindan yuklaydi (tezkorlik)
export function usePrefetchRestaurant() {
  const qc = useQueryClient();
  return useCallback((id) => {
    if (!id) return;
    qc.prefetchQuery({ queryKey: ['restaurant', id], queryFn: ({ signal }) => api.getRestaurant(id, { signal }) });
    qc.prefetchQuery({ queryKey: ['dishes', id], queryFn: ({ signal }) => api.getDishes(id, { signal }) });
  }, [qc]);
}

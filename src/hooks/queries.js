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

/*
 * Sessiya urug'i (butun son). Server adolatli tartibni shu bilan
 * aralashtiradi: oyna fokusidagi qayta so'rov (React Query) BIR XIL
 * tartibni oladi — aks holda mijoz ilovaga qaytgan zahoti ikkala
 * qator ham butunlay boshqacha bo'lib qolardi. Har yangi sessiyada —
 * yangi tartib. Splash va bosh sahifa bir xil urug'ni ishlatadi
 * (oldindan yuklangan kesh qayta ishlatiladi).
 */
let feedSeedCache = null;
function feedSeed() {
  if (feedSeedCache !== null) return feedSeedCache;
  const KEY = 'lokma_feed_seed';
  try {
    let v = Number(sessionStorage.getItem(KEY));
    if (!Number.isInteger(v) || v < 0) {
      v = Math.floor(Math.random() * 2 ** 31);
      sessionStorage.setItem(KEY, String(v));
    }
    feedSeedCache = v;
  } catch {
    feedSeedCache = Math.floor(Math.random() * 2 ** 31); // storage bloklangan
  }
  return feedSeedCache;
}

/*
 * Bosh sahifa tasmasi. `fair` — restoranlar navbatma-navbat (server,
 * controllers/catalog.js). To'liq javob qaytariladi: «Tavsiya qilamiz»
 * davomi server nextCursor'i bilan yuklanadi.
 * Qaytaradi: { items, nextCursor, hasMore }
 */
export const dishFeedQuery = ({ discounted, category = 'all', limit = HOME_FEED_LIMIT, fair = true }) => ({
  queryKey: ['dishes', 'feed', discounted ? 'discount' : 'regular', category, limit, fair ? 'fair' : 'chrono'],
  queryFn: async ({ signal }) => {
    const res = await api.getDishesFeed({ discounted, category, limit, fair, seed: feedSeed(), signal });
    return {
      items: Array.isArray(res?.items) ? res.items : [],
      nextCursor: typeof res?.nextCursor === 'string' ? res.nextCursor : null,
      hasMore: Boolean(res?.hasMore),
    };
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

/* ═══ LOKMA MARKET ═══ */

/*
 * Bo'lim ruxsatlari (Market / To'yxonalar tugmalari). Xato bo'lsa — hammasi
 * yopiq (tugma chiqmaydi): server eski bo'lsa ham bosh sahifa buziлmaydi.
 * Kirish (token) o'zgarsa qayta so'raladi — kalitda token borligi.
 */
export const useFeatures = (authStatus) =>
  useQuery({
    queryKey: ['features', authStatus || 'none'],
    queryFn: async ({ signal }) => {
      try { return await api.getFeatures({ signal }); } catch { return { market: false, wedding: false }; }
    },
    staleTime: 5 * 60_000,
  });

export const useMarketCategories = () =>
  useQuery({
    queryKey: ['market', 'categories'],
    queryFn: ({ signal }) => api.getMarketCategories({ signal }),
    staleTime: 30 * 60_000,
  });

export const useMarketStores = (enabled = true) =>
  useQuery({
    queryKey: ['market', 'stores'],
    queryFn: ({ signal }) => api.getMarketStores({ signal }),
    enabled,
  });

export const useMarketBanners = (enabled = true) =>
  useQuery({
    queryKey: ['banners', 'market'],
    queryFn: async ({ signal }) => {
      try { return await api.getMarketBanners({ signal }); } catch { return []; }
    },
    staleTime: 10 * 60_000,
    enabled,
  });

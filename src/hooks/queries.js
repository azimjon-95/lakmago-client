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

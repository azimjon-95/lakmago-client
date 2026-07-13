import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';

export const useBannersQuery = () =>
  useQuery({ queryKey: ['banners'], queryFn: api.getBanners });

export const useRestaurants = () =>
  useQuery({ queryKey: ['restaurants'], queryFn: api.getRestaurants });

export const useRestaurant = (id: string) =>
  useQuery({ queryKey: ['restaurant', id], queryFn: () => api.getRestaurant(id) });

export const useDishes = (restaurantId: string) =>
  useQuery({ queryKey: ['dishes', restaurantId], queryFn: () => api.getDishes(restaurantId) });

export const useTrendingDishes = () =>
  useQuery({ queryKey: ['dishes', 'trending'], queryFn: api.getTrendingDishes });

export const useDiscountedDishes = () =>
  useQuery({ queryKey: ['dishes', 'discounted'], queryFn: api.getDiscountedDishes });

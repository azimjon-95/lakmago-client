import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';

/** Demo foydalanuvchi uchun demo restoran kartochkasi (u umumiy ro'yxatda yo'q). Boshqalarga so'rov UMUMAN ketmaydi. */
export function useDemoRestaurant(enabled) {
  const { data } = useQuery({
    queryKey: ['demo-restaurant'],
    queryFn: () => api.getDemoRestaurant(),
    enabled: Boolean(enabled),
    staleTime: 10 * 60_000,
    retry: 1,
  });
  return data || null;
}

import { QueryClient } from '@tanstack/react-query';
import { restorePersistedQueries, persistQueries } from './queryPersist';

// Bitta umumiy kesh. Alohida modul: chiqishda (lib/session.js) oldingi foydalanuvchi ma'lumotlarini tozalash uchun.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,        // 5 daqiqa "yangi" — keraksiz refetch bo'lmaydi
      gcTime: 30 * 60_000,          // 30 daqiqa cache saqlanadi (tez qaytish)
      refetchOnWindowFocus: false,   // fokusda qayta so'ramaydi
      refetchOnReconnect: true,      // internet tiklanganda yangilaydi
      retry: 2,                      // xatoda 2 marta qayta urinadi
      retryDelay: (n) => Math.min(1000 * 2 ** n, 8000),
    },
  },
});

/*
 * Ommaviy katalog keshi (restoran/menyu/do'kon bo'limlari) qurilmada saqlanadi — keyingi
 * ochilishda sahifa darhol chiqadi, fonda yangilanadi (lib/queryPersist.js). Birinchi
 * render'dan OLDIN tiklanadi (modul yuklanishida, sinxron).
 */
if (typeof window !== 'undefined') {
  restorePersistedQueries(queryClient);
  persistQueries(queryClient);
}

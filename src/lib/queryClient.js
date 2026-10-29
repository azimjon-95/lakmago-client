import { QueryClient } from '@tanstack/react-query';

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

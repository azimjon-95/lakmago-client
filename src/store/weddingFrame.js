import { create } from 'zustand';

/*
 * To'yxonalar iframe'i ilova ichida DOIM tirik turadi (fonda isitiladi),
 * sahifa ochilganda faqat ko'rinadi — shuning uchun ochilish darhol bo'ladi
 * va ma'lumotlar (to'yxonalar ro'yxati) oldindan yuklangan bo'ladi.
 *   visible — foydalanuvchi shu paytda to'yxonalar sahifasida
 *   path    — iframe ichida ochilishi kerak bo'lgan sahifa ("/" | "/venue/<slug>")
 */
/*
 *   canGoBack — iframe ichida orqaga qaytish mumkinmi (masalan to'yxona sahifasidan ro'yxatga);
 *   goBack    — iframe'ni bir qadam orqaga qaytarish (WeddingHost o'rnatadi).
 * Telegram "Назад" tugmasi avval iframe ichida qaytaradi, keyingina Lokma'ga chiqadi.
 */
export const useWeddingFrame = create((set) => ({
  visible: false,
  path: '/',
  canGoBack: false,
  goBack: null,
  /*
   * tone — sayt tepasidagi fon: 'dark' (rasm ustida) | 'light' (och fon ustida).
   * Telegram sarlavha rangi shunga moslanadi: to'q -> oq soat/antenna/"Назад",
   * och -> qora. Sayt aylantirilganda o'zi yangilab turadi.
   */
  tone: 'dark',
  setVisible: (visible) => set({ visible }),
  setPath: (path) => set({ path }),
  setCanGoBack: (canGoBack) => set({ canGoBack }),
  setGoBack: (goBack) => set({ goBack }),
  setTone: (tone) => set({ tone: tone === 'light' ? 'light' : 'dark' }),
}));

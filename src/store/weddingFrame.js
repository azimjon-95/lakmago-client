import { create } from 'zustand';

/*
 * To'yxonalar iframe'i ilova ichida DOIM tirik turadi (fonda isitiladi),
 * sahifa ochilganda faqat ko'rinadi — shuning uchun ochilish darhol bo'ladi
 * va ma'lumotlar (to'yxonalar ro'yxati) oldindan yuklangan bo'ladi.
 *   visible — foydalanuvchi shu paytda to'yxonalar sahifasida
 *   path    — iframe ichida ochilishi kerak bo'lgan sahifa ("/" | "/venue/<slug>")
 */
export const useWeddingFrame = create((set) => ({
  visible: false,
  path: '/',
  setVisible: (visible) => set({ visible }),
  setPath: (path) => set({ path }),
}));

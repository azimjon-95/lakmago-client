import { create } from 'zustand';

/*
 * ═══════════════════════════════════════════════════════════
 * MODAL STEKI — Android / Telegram "orqaga" tugmasi uchun
 * ═══════════════════════════════════════════════════════════
 *
 * Oddiy HISOBLAGICH (faqat son) YETARLI EMAS: u "nechta modal
 * ochiq" degan savolga javob beradi, lekin "orqaga bosilganda
 * QAYSI modalni yopish kerak" degan savolga javob BERA OLMAYDI.
 * Ikkita modal ustma-ust ochilganda (masalan AuthGateModal
 * ustiga DishModal), hisoblagich ikkalasini ham bir xil
 * ko'radi — qaysi biri "tepada" ekanini bilolmaydi.
 *
 * Shuning uchun STEK: har bir ochiq modal o'zining yopish
 * funksiyasini (`ref` — har render yangilanadigan, doim
 * SO'NGGI holatni ko'rsatuvchi ob'ekt) shu yerga navbatga
 * qo'yadi. Orqaga bosilganda FAQAT ENG YUQORIDAGI modalning
 * o'z (haqiqiy, UI holatini o'zgartiradigan) funksiyasi
 * chaqiriladi — modal chindan ham ekrandan yo'qoladi, shunchaki
 * hisoblagich kamaymaydi.
 *
 * Ishlatish uchun to'g'ridan-to'g'ri emas — src/hooks/
 * useModalBackClose.js orqali.
 */
export const useUI = create((set, get) => ({
  modalStack: [],
  modalCount: 0,

  /**
   * Modal ochilganda ro'yxatga qo'shadi.
   * @param {{ current: () => void }} ref — modalning joriy
   *   yopish funksiyasini ushlab turuvchi ob'ekt (har render
   *   yangilanadi, shuning uchun har doim so'nggi holatni oladi)
   * @returns {() => void} tozalash funksiyasi — modal
   *   yopilganda/unmount bo'lganda albatta chaqirilishi kerak
   */
  pushModal: (ref) => {
    set((s) => {
      const modalStack = [...s.modalStack, ref];
      return { modalStack, modalCount: modalStack.length };
    });
    return () => set((s) => {
      const modalStack = s.modalStack.filter((r) => r !== ref);
      return { modalStack, modalCount: modalStack.length };
    });
  },

  /** Orqaga tugmasi bosilganda — ENG YUQORI modalni yopadi. */
  closeTopModal: () => {
    const { modalStack } = get();
    modalStack[modalStack.length - 1]?.current?.();
  },
}));

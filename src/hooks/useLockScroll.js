import { useEffect } from 'react';
import { lockScroll, unlockScroll } from '@/lib/scrollLock';
/**
 * Modal ochilganda orqa fon scroll bo'lmasligi uchun.
 *
 * iOS Safari'da `overflow: hidden` yetarli emas — sahifa baribir
 * suriladi. Shuning uchun `position: fixed` bilan joyini qotiramiz
 * va yopilganda o'sha joyga qaytaramiz.
 *
 * Bir nechta modal birga ochilsa ham xavfsiz: hisoblagich
 * (src/lib/scrollLock.js) faqat oxirgi unlock'da stilni tiklaydi.
 * Aks holda overflow: hidden qolib, sahifa scroll qotib qolardi.
 */
export function useLockScroll(locked) {
  useEffect(() => {
    if (!locked) return undefined;

    lockScroll();
    return () => {
      unlockScroll();
    };
  }, [locked]);
}
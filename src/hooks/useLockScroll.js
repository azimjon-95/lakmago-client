import { useEffect } from 'react';

/**
 * Modal ochilganda orqa fon scroll bo'lmasligi uchun.
 *
 * iOS Safari'da `overflow: hidden` yetarli emas — sahifa baribir
 * suriladi. Shuning uchun `position: fixed` bilan joyini qotiramiz
 * va yopilganda o'sha joyga qaytaramiz.
 */
export function useLockScroll(locked) {
  useEffect(() => {
    if (!locked) return;

    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      // Foydalanuvchi qayerda edi — o'sha joyga qaytaramiz
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}

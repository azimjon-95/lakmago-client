import { useEffect, useRef } from 'react';
import { useUI } from '@/store/ui';

/**
 * Modalni Android tizim / Telegram "orqaga" tugmasi bilan
 * yopish navbatiga ro'yxatdan o'tkazadi.
 *
 * `useLockScroll(open)` bilan bir xil naqsh — faqat `isOpen`
 * true bo'lganda ro'yxatda turadi, false bo'lsa yoki komponent
 * unmount bo'lsa avtomatik chiqariladi.
 *
 * @param {boolean} isOpen — modal HOZIR ko'rinadimi. Ba'zi
 *   modallar doim mount bo'lib turadi va faqat shu bayroq bilan
 *   yashiriladi (masalan AuthGateModal) — shuning uchun mount/
 *   unmount emas, aynan shu qiymat kuzatiladi.
 * @param {() => void} onBack — orqaga bosilganda chaqiriladigan
 *   funksiya (odatda modalning o'z yopish funksiyasi). Har
 *   renderda YANGILANADI — masalan AddressFlow kabi ko'p
 *   bosqichli oqimlar bosqichga qarab turli funksiya berishi
 *   mumkin (avval ICHKI bosqichni qaytaradi, oxirida modalni
 *   butunlay yopadi) — eski (stale) funksiya emas, HAR DOIM eng
 *   so'nggisi chaqiriladi.
 */
export function useModalBackClose(isOpen, onBack) {
  const ref = useRef(onBack);
  ref.current = onBack;

  useEffect(() => {
    if (!isOpen) return undefined;
    return useUI.getState().pushModal(ref);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
}

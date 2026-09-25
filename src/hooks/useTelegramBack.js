import { useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getTelegram } from '@/lib/telegram';
import { useUI } from '@/store/ui';

/*
 * ═══════════════════════════════════════════════════════════
 * ANDROID / TELEGRAM "ORQAGA" TUGMASI
 * ═══════════════════════════════════════════════════════════
 *
 * MUAMMO: Android'da tizim pastki "<" tugmasi bosilganda,
 * hech qanday maxsus ishlov bo'lmasa, Telegram WebApp'ni
 * DARHOL yopib qo'yardi — ochiq modal yoki ichki sahifa bo'lsa
 * ham, mijoz kutmagan holda butun ilovadan chiqib ketardi.
 *
 * YECHIM: Telegram.WebApp.BackButton — rasmiy API. Ko'rsatilgan
 * bo'lsa, Android tizim Back tugmasi WebApp'ni yopish o'rniga
 * shu tugmaning `onClick` hodisasini chaqiradi. Mantiq
 * NAVBATI BILAN:
 *
 *   1. Modal ochiq          → faqat ENG YUQORI modalni yop
 *   2. Modal yo'q, sahifa≠"/" → bir qadam orqaga (navigate(-1))
 *   3. Modal yo'q, sahifa="/" → Telegram.WebApp.close()
 *
 * iOS'GA TA'SIRI YO'Q: iOS'da tizim Back tugmasi UMUMAN yo'q
 * (faqat swipe yoki header'dagi o'z Back tugmasi bor).
 * BackButton.show()/hide()/onClick() Telegram'ning O'Z UI
 * elementini boshqaradi — iOS gesture yoki header'ga tegmaydi.
 * disableVerticalSwipes (lib/telegram.js) bilan ham
 * aralashmaydi — u pastga SWIPE bilan yopilishni bloklaydi,
 * bu yerda esa Back TUGMASI (yoki Telegram'ning yuqori chap
 * burchakdagi o'q belgisi) bilan ishlanadi.
 *
 * TELEGRAM TASHQARISIDA (oddiy brauzer, authMode='web'):
 * `tg?.BackButton` mavjud emas — effekt darhol to'xtaydi, hech
 * narsa qilinmaydi, xato bermaydi. Brauzerning o'z tizim Back
 * tugmasi (Android'dagi native) o'zgarishsiz, brauzerning
 * standart tarix (history) mexanizmi orqali ishlayveradi.
 */
export function useTelegramBack() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const modalCount = useUI((s) => s.modalCount);
  const tg = getTelegram();

  const onBack = useCallback(() => {
    /*
     * `useUI.getState()` — Zustand'ning to'g'ridan-to'g'ri,
     * ENG SO'NGGI holatni o'qish usuli. `modalCount` (yuqorida,
     * `useUI((s) => s.modalCount)`) faqat BackButton ko'rsatish/
     * yashirish uchun kerak (quyidagi useEffect); bu yerda esa
     * `onBack` closure eskirib qolmasligi uchun (masalan tez
     * ketma-ket ikkita modal ochilib yopilganda) har doim
     * JORIY holatdan o'qiymiz.
     */
    if (useUI.getState().modalCount > 0) {
      useUI.getState().closeTopModal();
      return;
    }
    if (pathname !== '/') {
      navigate(-1);
      return;
    }
    tg?.close?.();
  }, [pathname, navigate, tg]);

  useEffect(() => {
    if (!tg?.BackButton) return undefined; // Telegram yo'q / eski versiya

    const show = modalCount > 0 || pathname !== '/';
    if (show) tg.BackButton.show();
    else tg.BackButton.hide();

    tg.BackButton.onClick(onBack);
    return () => tg.BackButton.offClick(onBack);
  }, [tg, onBack, modalCount, pathname]);
}

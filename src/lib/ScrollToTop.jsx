import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/*
 * Har yangi sahifa TEPADAN boshlanadi (Lokma Go, Market, Qidiruv, Buyurtmalar, Profil — pastki menyudan ham, havoladan ham).
 * Hujjat scrolli umumiy bo'lgani uchun avval oldingi sahifaning pastki joyi yangi sahifaga o'tib qolardi.
 * "Orqaga" (POP) — o'zgarmaydi: mijoz ro'yxatdagi joyiga qaytadi. Faqat yo'l (pathname) o'zgarsa; ?filtr o'zgarishi tegmaydi.
 * Router startTransition rejimida — effekt yangi sahifa chizilgandan KEYIN ishlaydi (eski sahifa sakramaydi).
 */
export function ScrollToTop() {
  const { pathname } = useLocation();
  const type = useNavigationType();
  useEffect(() => {
    if (type === 'POP') return;
    try { window.scrollTo(0, 0); } catch { /* DOM yo'q */ }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

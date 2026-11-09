import { useEffect } from 'react';
import { useSection } from '@/store/section';

/*
 * Restoran / do'kon / taom sahifasi ochilganda bo'limni (Lokma Go yoki Lokma Market) MAZMUNGA moslaydi.
 * Havola orqali (startapp=rest_…) kirilganda bo'lim hali `go` bo'lishi mumkin, lekin ochilgan joy do'kon —
 * ranglar, pastki menyu va "Назад" (do'kon → Market bosh sahifasi) to'g'ri bo'lishi uchun.
 * `isStore` — undefined bo'lsa (ma'lumot hali yuklanmagan) hech narsa qilmaydi.
 */
export function useSyncSection(isStore) {
  const setSection = useSection((s) => s.setSection);
  useEffect(() => {
    if (typeof isStore !== 'boolean') return;
    setSection(isStore ? 'market' : 'go');
  }, [isStore, setSection]);
}

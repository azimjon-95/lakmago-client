import { useEffect, useMemo } from 'react';
import { useOrders } from '@/store/orders';
import { useUser } from '@/store/user';
import { useOrderTracking } from '@/hooks/useOrderTracking';

/*
 * ═══ FAOL BUYURTMANI JONLI SAQLASH ═══
 * "Sizning buyurtmangiz" nishoni uchun (App darajasida, har sahifada ishlaydi):
 *   • ilova ochilganda (yangilash/refresh ham) — serverdan faol buyurtma TIKLANADI;
 *   • soket orqali holat o'zgarsa — darhol; soket uzilsa ham — davriy so'rov
 *     (12 s, ilova ko'rinib turganda), ilova qaytganda ham darhol;
 *   • buyurtma yakunlansa/bekor qilinsa — nishon yo'qoladi (server ro'yxati bo'sh → tozalanadi).
 */
const POLL_MS = 12_000;

export function useActiveOrderSync() {
  const authStatus = useUser((s) => s.authStatus);
  const loadActive = useOrders((s) => s.loadActive);
  const applyBackendStatus = useOrders((s) => s.applyBackendStatus);
  // Selektor BARQAROR bo'lishi shart: har chaqiruvda yangi massiv qaytarsa zustand cheksiz qayta chizadi.
  // Shuning uchun primitiv (vergul bilan birlashtirilgan satr) olinadi va keyin massivga bo'linadi.
  const idsKey = useOrders((s) => (s.activeOrder?.subOrders || []).map((x) => x.backendId).filter(Boolean).join(','));
  const ids = useMemo(() => (idsKey ? idsKey.split(',') : []), [idsKey]);

  // Ilova ochilganda va hisob tayyor bo'lgach — tiklash
  useEffect(() => {
    if (authStatus === 'done') loadActive();
  }, [authStatus, loadActive]);

  // Jonli: soket holatlari
  useOrderTracking(ids, (backendId, status) => {
    applyBackendStatus(backendId, status);
    // Yakunlangan/bekor — serverdan tasdiqlab nishonni tozalaymiz
    if (status === 'delivered' || status === 'cancelled') loadActive();
  });

  // Davriy so'rov (faqat faol buyurtma bor va ilova ko'rinib turganda) + qaytganda darhol
  const hasActive = ids.length > 0;
  useEffect(() => {
    if (authStatus !== 'done' || !hasActive) return undefined;
    const tick = () => { if (!document.hidden) loadActive(); };
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [authStatus, hasActive, loadActive]);
}

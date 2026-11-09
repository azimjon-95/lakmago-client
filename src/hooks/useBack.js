import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { resolveBack } from '@/lib/backRoute';
import { useSection } from '@/store/section';

/*
 * ORQAGA — Telegram "Назад" tugmasi va sahifalardagi o'qlar uchun yagona amal. Qoida: lib/backRoute.js
 *
 * Iz (trail): react-router har tarix yozuviga `history.state.idx` yozadi. Har joy o'zgarganda
 * trail[idx] = pathname deb eslab qolamiz → oldingi ILOVA ichidagi sahifa = trail[idx - 1].
 * idx = 0 bo'lsa (havola orqali `replace` bilan ochilgan yoki birinchi sahifa) — oldingi sahifa YO'Q.
 */
const trail = [];
const idxNow = () => window.history.state?.idx ?? 0;

/** App ichida BIR MARTA chaqiriladi (useTelegramBack orqali): qaysi yozuvda qaysi sahifa turganini yozib boradi. */
export function useTrackTrail() {
  const { pathname } = useLocation();
  useEffect(() => { trail[idxNow()] = pathname; }, [pathname]);
}

/** @returns {() => boolean} orqaga qaytaradi; bosh sahifada hech narsa qilmaydi va false qaytaradi (yopish chaqiruvchida) */
export function useBack() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return useCallback(() => {
    const idx = idxNow();
    const prev = idx > 0 ? (trail[idx - 1] ?? null) : null;
    const { section, setSection } = useSection.getState();
    const r = resolveBack({ pathname, prev, section });
    if (r.action === 'close') return false;
    // Bo'lim avval o'zgaradi: aks holda `/` ga qaytganda bosh sahifa Market'ga qaytarib yuboradi
    if (r.section) setSection(r.section);
    if (r.action === 'history') navigate(-1);
    else navigate(r.to, { replace: true });
    return true;
  }, [navigate, pathname]);
}

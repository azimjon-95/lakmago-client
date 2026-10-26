import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentPosition } from '@/lib/location';

/*
 * ═══ JORIY GPS ↔ SAQLANGAN MANZIL ═══
 *
 * Holatlar (state):
 *   checking    — GPS so'ralmoqda
 *   ok          — mijoz saqlangan manzilda (100 m dan yaqin)
 *   far         — 100 m yoki undan UZOQDA → ogohlantirish
 *   lowacc      — GPS aniqligi past: xulosa chiqarib bo'lmaydi (yolg'on ogohlantirish bermaymiz)
 *   denied      — joylashuvga ruxsat berilmagan
 *   unavailable — signal yo'q / vaqt tugadi / joylashuv xizmati o'chiq
 *   unsupported — qurilma joylashuvni bilmaydi
 *   nopoint     — saqlangan manzilda koordinata yo'q
 *
 * Masofa — haqiqiy koordinatalar orasidagi geodezik (haversine) masofa, metrda.
 */
export const FAR_M = 100;       // TZ: 100 m yoki undan uzoq — ogohlantirish
export const MAX_ACC_M = 100;   // GPS xatosi shundan katta bo'lsa — natija ishonchsiz

export function distanceM(a, b) {
  const R = 6371000; const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat); const dLng = rad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Aniqlik past bo'lsa ham XULOSA aniq bo'lishi mumkin: masofadan xatoni ayirganda ham ≥ 100 m qolsa —
 * mijoz baribir uzoqda. Aks holda (xato ichida 100 m chegarasi kesishadi) — "lowacc".
 */
export function classify(d, acc) {
  if (!Number.isFinite(acc) || acc <= MAX_ACC_M) return d >= FAR_M ? 'far' : 'ok';
  return d - acc >= FAR_M ? 'far' : 'lowacc';
}

export function useAddressGpsCheck(address, active) {
  const [res, setRes] = useState({ state: 'idle' });
  const run = useRef(0);
  const lat = Number(address?.lat); const lng = Number(address?.lng);

  const check = useCallback(async () => {
    const id = ++run.current;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) { setRes({ state: 'nopoint' }); return; }
    // Avvalgi joylashuv (marker) qayta tekshirish paytida yo'qolib qolmasin
    setRes((r) => ({ ...r, state: 'checking' }));
    try {
      const pos = await getCurrentPosition();
      if (id !== run.current) return;
      const d = distanceM(pos, { lat, lng });
      const acc = Number.isFinite(pos.accuracy) ? pos.accuracy : null;
      setRes({ state: classify(d, acc), pos, d, acc });
    } catch (e) {
      if (id !== run.current) return;
      const c = e?.code;
      setRes({ state: c === 'denied' ? 'denied' : c === 'unsupported' ? 'unsupported' : 'unavailable' });
    }
  }, [lat, lng]);

  useEffect(() => {
    if (active) check();
    return () => { run.current += 1; };   // eskirgan javob holatni buzmasin
  }, [active, check]);

  return [res, check];
}

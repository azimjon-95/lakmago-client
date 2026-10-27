import { useCallback, useEffect, useRef, useState } from 'react';
import { runGpsCheck } from '@/lib/gpsCheck';
import { createFixSource } from '@/lib/gpsSource';

/*
 * ═══ JORIY GPS ↔ SAQLANGAN MANZIL (yumshoq tekshiruv) ═══
 *
 * Mantiq — lib/gpsCheck.js (takroriy o'lchovlar, xato hisobga olinadi, barqarorlashishni kutadi, 30–50 m tebranish
 * ogohlantirmaydi). Bu hook faqat uni interfeysga ulaydi va quyidagilarni KAFOLATLAYDI:
 *
 *  • Interfeys HECH QACHON qotmaydi: tekshiruv fonda; har bir holat cheklangan vaqtda yakunlanadi
 *    (birinchi o'lchovga FIRST_FIX_CAP_MS, so'ng barqarorlashga BUDGET_MS).
 *  • 8 s dan ko'p GPS topilmasa — `slow: true` (karta "qo'lda tanlang" ni taklif qiladi).
 *  • Bekor qilish / qayta urinish / oyna yopilishi — eskirgan javob holatni buzmaydi, GPS oqimi YOPILADI (batareya).
 *
 * Holatlar (state):
 *   checking    — o'lchanmoqda (pos/U/n — joriy baho; slow — uzoq kutilmoqda)
 *   ok          — manzilda            near — xato hisobga olinganda ham ogohlantirishga yetmaydi (yumshoq)
 *   far         — sezilarli uzoqda (xatodan keyin ham ≥ 100 m, ≥ 2 o'lchov)
 *   lowacc      — barqarorlashmadi (aniqlik past) — ogohlantirish EMAS
 *   denied / unsupported / unavailable — ruxsat yo'q / qo'llanmaydi / signal yo'q (vaqt tugadi)
 *   nopoint     — saqlangan manzilda koordinata yo'q
 */
export const FIRST_FIX_CAP_MS = 36000; // Telegram ruxsat oynasini o'qish vaqti (30 s) + zaxira
export const SLOW_MS = 8000;

const capped = (promise, ms) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(Object.assign(new Error('GPS vaqti tugadi'), { code: 'timeout' })), ms);
  promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
});

export function useAddressGpsCheck(address, active) {
  const [res, setRes] = useState({ state: 'idle' });
  const run = useRef({ id: 0, source: null, slow: null });
  const lat = Number(address?.lat); const lng = Number(address?.lng);

  const stop = useCallback(() => {
    run.current.id += 1;                       // eskirgan javoblar e'tiborsiz
    clearTimeout(run.current.slow);
    run.current.source?.close();               // GPS oqimi yopiladi
    run.current.source = null;
  }, []);

  const check = useCallback(async () => {
    stop();
    const id = run.current.id;
    const cancelled = () => run.current.id !== id;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) { setRes({ state: 'nopoint' }); return; }

    const source = createFixSource();
    run.current.source = source;
    // Qayta urinishda oldingi marker yo'qolib qolmasin
    setRes((r) => ({ state: 'checking', pos: r.pos, U: r.U, d: r.d }));
    run.current.slow = setTimeout(() => {
      if (!cancelled()) setRes((r) => (r.state === 'checking' && !r.pos ? { ...r, slow: true } : r));
    }, SLOW_MS);

    try {
      const out = await runGpsCheck({
        target: { lat, lng },
        source: { first: () => capped(source.first(), FIRST_FIX_CAP_MS), next: (ms) => source.next(ms) },
        isCancelled: cancelled,
        onUpdate: (u) => { if (!cancelled()) setRes({ state: 'checking', pos: { ...u.pos, accuracy: u.U }, U: u.U, d: u.d, n: u.n }); },
      });
      if (!out || cancelled()) return;
      // pos.accuracy — BARQARORLASHGAN xato: xaritadagi aniqlik doirasi shuni ko'rsatadi
      setRes({ state: out.state, pos: { ...out.pos, accuracy: out.U }, d: out.d, acc: out.U, n: out.n });
    } catch (e) {
      if (cancelled()) return;
      const c = e?.code;
      setRes({ state: c === 'denied' ? 'denied' : c === 'unsupported' ? 'unsupported' : 'unavailable' });
    } finally {
      clearTimeout(run.current.slow);
      if (!cancelled()) { source.close(); run.current.source = null; }
    }
  }, [lat, lng, stop]);

  useEffect(() => {
    if (active) check();
    return stop;
  }, [active, check, stop]);

  return [res, check];
}

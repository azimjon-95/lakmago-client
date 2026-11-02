import { useCallback, useEffect, useRef, useState } from 'react';
import { collectStableFix } from '@/lib/currentFix';
import { createFixSource } from '@/lib/gpsSource';
import { reverseGeocodeViaYandex } from '@/lib/location';
import { prefillText, ONCE_TEXT_MAX } from '@/lib/oneTimeAddress';
import { FIRST_FIX_CAP_MS, SLOW_MS } from '@/hooks/useAddressGpsCheck';

const capped = (promise, ms) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(Object.assign(new Error('GPS vaqti tugadi'), { code: 'timeout' })), ms);
  promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
});

/*
 * ═══ HOZIRGI JOYIM: GPS → BARQAROR NUQTA → MANZIL MATNI ═══
 *
 * Mantiq lib/currentFix.js (bir nechta yangi o'lchov, barqarorlashishni kutadi). Bu hook uni interfeysga ulaydi va KAFOLATLAYDI:
 *  • GPS FAQAT shu hook ishga tushganda (mijoz "Hozirgi joyimga yetkazish" bosganda) so'raladi — ilova ochilishida emas (guest-first);
 *  • interfeys qotmaydi: birinchi o'lchovga FIRST_FIX_CAP_MS, so'ng barqarorlashga BUDGET_MS; 8 s dan ko'p topilmasa `slow`;
 *  • qayta aniqlash / oyna yopilishi — eskirgan javob holatni buzmaydi, GPS oqimi YOPILADI (batareya);
 *  • koordinata → manzil (reverse geocoding) matni textarea'ga AVTOMATIK yoziladi, lekin mijoz matnni o'zi tahrirlagan bo'lsa — ustidan YOZILMAYDI.
 *
 * Holat (st):
 *   stage    'locating' | 'ready' | 'error'
 *   quality  'ok' | 'weak' | 'poor' (stage 'ready' da; xaritadan qo'lda tanlangan nuqta — doim 'ok')
 *   pos      { lat, lng, accuracy } — joriy baho (locating paytida ham, xarita markeri uchun)
 *   manual   nuqta xaritadan qo'lda tanlangan (GPS emas)
 *   code     'denied' | 'unsupported' | 'unavailable' (stage 'error')
 *   slow     uzoq kutilmoqda
 *
 * initial — mavjud bir martalik manzil (tahrirlash): GPS ISHGA TUSHMAYDI, joriy qiymatlar ko'rsatiladi.
 */
export function useCurrentLocation({ initial = null } = {}) {
  const [st, setSt] = useState(() => (initial
    ? { stage: 'ready', quality: 'ok', pos: { lat: initial.lat, lng: initial.lng, accuracy: initial.accuracy }, manual: Boolean(initial.manual) }
    : { stage: 'locating' }));
  const [text, setTextState] = useState(initial?.address || '');
  const [geo, setGeo] = useState('idle');                 // idle | loading | done | failed
  const touched = useRef(Boolean(initial?.address));      // mijoz matnni o'zi yozgan/tahrirlagan
  const run = useRef({ id: 0, source: null, slow: null, geoId: 0 });

  const stop = useCallback(() => {
    run.current.id += 1;
    run.current.geoId += 1;
    clearTimeout(run.current.slow);
    run.current.source?.close();
    run.current.source = null;
  }, []);

  const resolveText = useCallback(async (lat, lng) => {
    const gid = ++run.current.geoId;
    setGeo('loading');
    try {
      const addr = await reverseGeocodeViaYandex(lat, lng);
      if (gid !== run.current.geoId) return;
      const filled = prefillText(addr);
      setGeo(filled ? 'done' : 'failed');
      if (!touched.current) setTextState(filled);
    } catch {
      if (gid === run.current.geoId) setGeo('failed');
    }
  }, []);

  const locate = useCallback(async () => {
    stop();
    const id = run.current.id;
    const cancelled = () => run.current.id !== id;
    const source = createFixSource();
    run.current.source = source;
    // Qayta urinishda oldingi marker yo'qolib qolmasin
    setSt((s) => ({ stage: 'locating', pos: s.pos, manual: false }));
    run.current.slow = setTimeout(() => {
      if (!cancelled()) setSt((s) => (s.stage === 'locating' && !s.pos ? { ...s, slow: true } : s));
    }, SLOW_MS);

    try {
      const out = await collectStableFix({
        source: { first: () => capped(source.first(), FIRST_FIX_CAP_MS), next: (ms) => source.next(ms) },
        isCancelled: cancelled,
        onUpdate: (u) => { if (!cancelled()) setSt({ stage: 'locating', pos: { ...u.pos, accuracy: u.U }, manual: false }); },
      });
      if (!out || cancelled()) return;
      setSt({ stage: 'ready', quality: out.state, pos: { ...out.pos, accuracy: out.U }, manual: false });
      resolveText(out.pos.lat, out.pos.lng);
    } catch (e) {
      if (cancelled()) return;
      const c = e?.code;
      setSt({ stage: 'error', code: c === 'denied' ? 'denied' : c === 'unsupported' ? 'unsupported' : 'unavailable' });
    } finally {
      clearTimeout(run.current.slow);
      if (!cancelled()) { source.close(); run.current.source = null; }
    }
  }, [stop, resolveText]);

  /** Xaritadan qo'lda tanlangan nuqta ({ lat, lng, full?, ... } — MapAddressPicker.onPick). GPS to'xtatiladi. */
  const pickManual = useCallback((picked) => {
    stop();
    setSt({ stage: 'ready', quality: 'ok', pos: { lat: picked.lat, lng: picked.lng, accuracy: null }, manual: true });
    const filled = prefillText(picked);
    setGeo(filled ? 'done' : 'failed');
    if (!touched.current) setTextState(filled);
  }, [stop]);

  const setText = useCallback((v) => {
    touched.current = true;
    setTextState(String(v).slice(0, ONCE_TEXT_MAX));
  }, []);

  useEffect(() => {
    if (!initial) locate();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { st, text, setText, geo, locate, pickManual, stop };
}

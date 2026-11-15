import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { useI18n } from '@/i18n';
import { useDistrict, useDistrictMeta } from '@/store/district';
import { useDeviceLocation } from '@/store/deviceLocation';
import { DISTRICT_SELECTOR_ENABLED, DISTRICT_AUTO_DETECT_ENABLED } from '@/lib/districtFlags';
import { activeCatalogDistrict, CATALOG_QUERY_PREFIXES } from '@/lib/catalogDistrict';
import { createDistrictTracker, fixProblem, DEFAULTS } from '@/lib/districtSwitch';
import { createFixSource } from '@/lib/gpsSource';
import { locationPermissionState } from '@/lib/locationPermission';

/*
 * ═══ TUMAN DVIGATELI (App'da BIR MARTA) ═══
 *  1) /districts metama'lumoti (server flaglari) — yo'q bo'lsa hech narsa qilinmaydi (eski xatti-harakat).
 *  2) Faol tuman (katalog uchun) o'zgarsa — katalog so'rovlari bekor qilinib, qayta yuklanadi (kursor ham noldan).
 *  3) AUTO rejim: ruxsat ALLAQACHON berilgan bo'lsa — ilova ochilganda / qaytganda (resume) / 10 daqiqada bir
 *     2–3 ta o'lchov olinadi va server orqali tekshiriladi (lib/districtSwitch.js: 2 ta ishonchli o'lchov, gisterezis).
 *     Boshqa oqimlar (manzil GPS tekshiruvi, "Hozirgi joyim") olgan nuqtalar ham ishlatiladi — qo'shimcha GPS yo'q.
 *     MANUAL rejimda GPS umuman ishlatilmaydi. Doimiy (yuqori chastotali) kuzatuv yo'q; fon rejimida ishlash va'da qilinmaydi.
 *  Eski javob yangisini bosib ketmaydi (seq), xato bo'lsa qayta urinish bo'roni yo'q (keyingi trigger kutiladi).
 */
const MIN_CHECK_GAP_MS = 60_000;
const READ_GAP_MS = 4000;

export function useDistrictEngine() {
  const qc = useQueryClient();
  const { lang } = useI18n();
  const meta = useDistrictMeta((s) => s.meta);
  const activeId = useDistrict((s) => s.activeDistrictId);
  const mode = useDistrict((s) => s.selectionMode);
  const tracker = useRef(null);
  const seq = useRef(0);
  const busy = useRef(false);
  const lastCheck = useRef(0);
  const runGen = useRef(0);
  const sourceRef = useRef(null);

  // 1) Server metama'lumoti
  useEffect(() => {
    if (!DISTRICT_SELECTOR_ENABLED) return undefined;
    let alive = true;
    api.getDistricts().then((r) => {
      if (!alive) return;
      const m = r?.boundaries && Array.isArray(r.boundaries.supported) ? r.boundaries : null;
      useDistrictMeta.getState().setMeta(m, Array.isArray(r?.districts) ? r.districts : []);
      if (m) useDistrict.getState().dropUnsupported(m.supported);
    }).catch(() => { /* server eski/o'chiq — tanlagich ko'rinmaydi */ });
    return () => { alive = false; };
  }, []);

  // 2) Katalog tumani o'zgarsa — katalog keshlari tozalanib qayta yuklanadi (Pop keshi Chust'ga chiqmaydi)
  const effective = DISTRICT_SELECTOR_ENABLED && meta?.catalogFilterEnabled && activeId && meta.supported?.includes(activeId) ? activeId : null;
  const prevEffective = useRef(effective);
  useEffect(() => {
    if (prevEffective.current === effective) return;
    prevEffective.current = effective;
    for (const queryKey of CATALOG_QUERY_PREFIXES) {
      qc.cancelQueries({ queryKey }).finally(() => qc.resetQueries({ queryKey }));
    }
  }, [effective, qc]);

  const autoOn = DISTRICT_AUTO_DETECT_ENABLED && !!meta?.autoDetect?.enabled;
  if (autoOn && !tracker.current) {
    tracker.current = createDistrictTracker({
      current: useDistrict.getState().lastAutoDetectedDistrictId,
      minAccuracyMeters: meta.autoDetect.minAccuracyMeters ?? DEFAULTS.minAccuracyMeters,
      confirmations: Math.max(2, meta.autoDetect.confirmationReadings ?? DEFAULTS.confirmations),
    });
  }

  /** Bitta o'lchovni qayta ishlash (server → tracker). */
  const processFix = useCallback(async (fix) => {
    const tr = tracker.current;
    if (!tr) return null;
    const problem = fixProblem(fix, { minAccuracyMeters: meta?.autoDetect?.minAccuracyMeters ?? DEFAULTS.minAccuracyMeters });
    if (problem) { useDistrict.getState().setStatus(problem === 'LOW_ACCURACY' ? 'low_accuracy' : 'idle'); return null; }
    if (!tr.shouldResolve(fix)) return { status: 'skipped' };
    const my = ++seq.current;
    try {
      const res = await api.resolveDistrict(fix.lat, fix.lng, { lang });
      if (my !== seq.current) return null;                       // eskirgan javob
      const out = tr.step(fix, res?.data);
      const st = useDistrict.getState();
      if (out.switched || (out.status === 'same' && out.districtId)) st.applyAuto(out.districtId, res?.data?.boundaryVersion);
      st.setStatus(out.status.startsWith('kept:') ? (out.status.includes('OUTSIDE') ? 'outside' : 'uncertain') : 'idle', st.isResolving);
      return out;
    } catch {
      if (my === seq.current) useDistrict.getState().setStatus('error');
      return null;
    }
  }, [lang, meta]);

  /**
   * 2–3 ta o'lchov oladi (interactive — mijoz tugmani bosgan: ruxsat so'ralishi mumkin).
   * Mijoz bosganda fonda ketayotgan tekshiruv TO'XTATILADI (GPS oqimi yopiladi) va yangisi boshlanadi —
   * tugma "kutib qolmaydi" va eski tekshiruv natijasi yangisini bosib ketmaydi.
   */
  const checkNow = useCallback(async ({ interactive = false } = {}) => {
    if (!tracker.current) return;
    if (busy.current && !interactive) return;
    if (!interactive && Date.now() - lastCheck.current < MIN_CHECK_GAP_MS) return;
    if (!interactive && useDistrict.getState().selectionMode !== 'auto') return;
    if (busy.current && interactive) { sourceRef.current?.close(); seq.current += 1; }
    const myRun = ++runGen.current;
    const alive = () => runGen.current === myRun;
    if (!interactive) {
      const perm = await locationPermissionState();
      if (!alive()) return;
      if (perm !== 'granted') { useDistrict.getState().setStatus(perm === 'denied' ? 'denied' : 'no_permission'); return; }
    }
    busy.current = true; lastCheck.current = Date.now();
    useDistrict.getState().setStatus('checking', true);
    const source = createFixSource();
    sourceRef.current = source;
    const startedAt = Date.now();
    try {
      let fix = await source.first();
      // Mijoz bosganda: qurilma keshidagi ESKI nuqta (maximumAge) emas, faqat bosilgandan keyingi yangi o'lchovlar
      for (let i = 0; i < 5 && fix && alive(); i += 1) {
        const f = { lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy, at: fix.ts ?? Date.now() };
        const cachedOld = interactive && Number.isFinite(f.at) && f.at < startedAt - 1000;
        if (!cachedOld) {
          useDeviceLocation.getState().set(f);
          const out = await processFix(f);
          if (!alive() || !out) break;
          // tasdiqlandi / o'sha / noaniq — yetarli; 'pending' — ikkinchi o'lchov kerak; 'skipped' (siljimagan) — fonda to'xtaymiz
          if (out.status !== 'pending' && !(interactive && out.status === 'skipped')) break;
        }
        fix = await source.next(READ_GAP_MS + 2000);
      }
      if (alive() && useDistrict.getState().autoStatus === 'checking') useDistrict.getState().setStatus('idle');
    } catch (e) {
      if (alive()) useDistrict.getState().setStatus(e?.code === 'denied' ? 'denied' : 'error');
    } finally {
      source.close();
      if (alive()) {
        busy.current = false;
        sourceRef.current = null;
        useDistrict.getState().setStatus(useDistrict.getState().autoStatus, false);
      }
    }
  }, [processFix]);

  // 3) Triggerlar: ochilish, resume, 10 daqiqalik yangilash (faqat ko'rinib turganda), boshqa oqimlardan kelgan nuqtalar
  useEffect(() => {
    if (!autoOn || mode !== 'auto') return undefined;
    checkNow();
    const onVis = () => { if (document.visibilityState === 'visible') checkNow(); };
    document.addEventListener('visibilitychange', onVis);
    const timer = setInterval(() => { if (document.visibilityState === 'visible') checkNow(); }, DEFAULTS.refreshMs);
    const unsub = useDeviceLocation.subscribe((s, prev) => {
      if (s.fix && s.fix !== prev.fix && !busy.current) processFix(s.fix);
    });
    return () => {
      document.removeEventListener('visibilitychange', onVis); clearInterval(timer); unsub();
      runGen.current += 1; sourceRef.current?.close(); sourceRef.current = null; busy.current = false;   // GPS oqimi qolib ketmasin
    };
  }, [autoOn, mode, checkNow, processFix]);

  return { checkNow, autoOn };
}

/** Header komponentlari uchun: dvigatelning "hozir tekshir" funksiyasiga kirish (App'dagi yagona nusxa). */
let engineCheck = null;
export const requestDistrictCheck = (opts) => engineCheck?.(opts);

/** App ichida BIR MARTA chiziladi (hech narsa ko'rsatmaydi). Flag o'chiq bo'lsa — hook ichida hech narsa qilinmaydi. */
export function DistrictEngine() {
  const { checkNow } = useDistrictEngine();
  useEffect(() => { engineCheck = checkNow; return () => { if (engineCheck === checkNow) engineCheck = null; }; }, [checkNow]);
  return null;
}
export { activeCatalogDistrict };

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
import { getCurrentPosition, watchFixes } from '@/lib/location';
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
    // Past aniqlik (sovuq GPS'da birinchi o'lchov ko'pincha 100 m+): tekshiruv TO'XTAMAYDI — aniqroq o'lchov kutiladi
    if (problem) { useDistrict.getState().setStatus(problem === 'LOW_ACCURACY' ? 'low_accuracy' : 'idle', true); return { status: 'ignored' }; }
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
      let lastStatus = null; let freshUsed = 0; let lastAt = null;
      // Mijoz bosganda: qurilma keshidagi ESKI nuqta (maximumAge) emas, faqat bosilgandan keyingi yangi o'lchovlar
      for (let i = 0; i < 7 && fix && alive(); i += 1) {
        const f = { lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy, at: fix.ts ?? Date.now() };
        const cachedOld = interactive && Number.isFinite(f.at) && f.at < startedAt - 1000;
        if (!cachedOld) {
          useDeviceLocation.getState().set(f);
          const out = await processFix(f);
          if (!alive() || !out) break;
          lastStatus = out.status; lastAt = f.at;
          // tasdiqlandi / o'sha / noaniq — yetarli; 'pending' — ikkinchi o'lchov kerak; 'skipped' (siljimagan) — fonda to'xtaymiz
          if (out.status !== 'pending' && out.status !== 'ignored' && !(interactive && out.status === 'skipped')) break;
        }
        // Nomzod kutilayotgan bo'lsa ko'p kutmaymiz (ikkinchi o'lchov ≥1,5 s keyin yetarli) — birinchi aniqlash tez bo'lsin
        fix = await source.next(lastStatus === 'pending' ? 50 : READ_GAP_MS + 2000);   // navbatda tayyor nuqta bo'lsa — darhol
        /*
         * Qimirlamay turgan telefonda GPS oqimi yangi nuqta bermasligi mumkin — 1 ta o'lchov bilan tuman hech qachon
         * tasdiqlanmay qolardi. Nomzod kutilayotgan bo'lsa: BIR MARTA yangi (keshsiz) o'lchov so'raymiz.
         */
        if (!fix && freshUsed < 2 && (lastStatus === 'pending' || lastStatus === 'ignored') && alive()) { freshUsed += 1; fix = await freshFix(READ_GAP_MS + 4000, lastAt); }
      }
      if (alive() && useDistrict.getState().autoStatus === 'checking') useDistrict.getState().setStatus(lastStatus === 'ignored' ? 'low_accuracy' : 'idle');
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
    /*
     * OCHILISH (splash bilan parallel — dvigatel splash ostida chiziladi, splash'ni KUTTIRMAYDI):
     *   ruxsat bor        → jim tekshiruv;
     *   ruxsat so'ralmagan → tizim oynasi DARHOL ko'rsatiladi (egasi qarori, 2026-11; CLAUDE.md 2/6-qoida istisnosi),
     *                        lekin 24 soatda ko'pi bilan BIR MARTA (iOS "bir marta ruxsat" keyingi kunlari qayta so'raydi);
     *   rad etilgan       → so'ralmaydi; oxirgi saqlangan tuman / qo'lda tanlash ishlaydi.
     * Qo'lda tanlangan rejimda (mode !== 'auto') bu effekt umuman ishlamaydi — qo'lda tanlov doim ustun.
     */
    let cancelled = false;
    (async () => {
      const perm = await locationPermissionState();
      if (cancelled) return;
      // Birinchi urinish signal topmasa (timeout/GPS sovuq) — 2,5 s keyin BIR MARTA qayta (ruxsat rad etilgan bo'lsa emas)
      const retryOnce = async () => {
        if (cancelled) return;
        const st = useDistrict.getState();
        if (st.autoStatus !== 'error' && st.autoStatus !== 'low_accuracy') return;
        await new Promise((r) => setTimeout(r, 2500));
        if (!cancelled && useDistrict.getState().selectionMode === 'auto') await checkNow({ interactive: true });
      };
      if (perm === 'granted') { await checkNow({ interactive: true }); await retryOnce(); return; }
      if ((perm === 'prompt' || perm === 'unknown') && startupAskAllowed()) {
        markStartupAsk();
        await checkNow({ interactive: true });
        await retryOnce();
        return;
      }
      useDistrict.getState().setStatus(perm === 'denied' ? 'denied' : 'no_permission');
    })();
    const onVis = () => { if (document.visibilityState === 'visible') checkNow(); };
    document.addEventListener('visibilitychange', onVis);
    const timer = setInterval(() => { if (document.visibilityState === 'visible') checkNow(); }, DEFAULTS.refreshMs);
    const unsub = useDeviceLocation.subscribe((s, prev) => {
      if (s.fix && s.fix !== prev.fix && !busy.current) processFix(s.fix);
    });
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis); clearInterval(timer); unsub();
      runGen.current += 1; sourceRef.current?.close(); sourceRef.current = null; busy.current = false;   // GPS oqimi qolib ketmasin
    };
  }, [autoOn, mode, checkNow, processFix]);

  return { checkNow, autoOn };
}

/**
 * Bitta YANGI o'lchov (avvalgisidan kamida minGapMs keyin): yangi kuzatuv (maximumAge 0) VA getCurrentPosition PARALLEL;
 * vaqt belgisi avvalgi o'lchovdan keyingi BIRINCHI natija olinadi (keshdagi eski nuqta ikkinchi tasdiq bo'lmaydi).
 * Qaytaradi: fix | null. Kuzatuv albatta yopiladi (batareya).
 */
async function freshFix(timeoutMs, prevAt) {
  await new Promise((r) => setTimeout(r, DEFAULTS.minGapMs + 200));
  return new Promise((resolve) => {
    let stop = null; let done = false; let pending = 2;
    const ctl = new AbortController();
    const finish = (v) => {
      if (done) return; done = true; clearTimeout(t); ctl.abort();
      try { stop?.(); } catch { /* */ }
      resolve(v);
    };
    const offer = (f) => {
      const fix = f ? { ...f, ts: f.ts ?? Date.now() } : null;
      if (fix && (!Number.isFinite(prevAt) || fix.ts > prevAt + 1000)) return finish(fix);
      pending -= 1; if (pending <= 0) finish(null);
    };
    const t = setTimeout(() => finish(null), timeoutMs);
    try { stop = watchFixes((f) => offer(f), () => offer(null)); } catch { offer(null); }
    if (done) { try { stop?.(); } catch { /* */ } }
    getCurrentPosition({ signal: ctl.signal }).then(offer, () => offer(null));
  });
}

/** Ochilishdagi GPS so'rovi: 24 soatda ko'pi bilan bir marta (localStorage bo'lmasa — sessiyada bir marta). */
const ASK_KEY = 'lokma-district-gps-asked-at';
const ASK_GAP_MS = 24 * 60 * 60 * 1000;
let askedThisSession = false;
export function startupAskAllowed(now = Date.now()) {
  if (askedThisSession) return false;
  try {
    const at = Number(localStorage.getItem(ASK_KEY));
    return !(Number.isFinite(at) && at > 0 && now - at < ASK_GAP_MS);
  } catch { return true; }
}
function markStartupAsk(now = Date.now()) {
  askedThisSession = true;
  try { localStorage.setItem(ASK_KEY, String(now)); } catch { /* xususiy rejim — sessiya bayrog'i yetarli */ }
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

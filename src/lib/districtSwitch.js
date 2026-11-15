/*
 * ═══ TUMANNI AVTOMATIK ALMASHTIRISH QAROR MANTIG'I (toza, test qilinadi) ═══
 *
 * Kirish: GPS o'lchovi { lat, lng, accuracy, at } va server javobi { districtId, matched, reason }.
 * Qoidalar (TZ 10–11):
 *   • aniqlik `minAccuracyMeters` dan yomon (yoki noma'lum) — e'tiborsiz (holat o'zgarmaydi);
 *   • eskirgan o'lchov (staleMs dan eski) — e'tiborsiz;
 *   • BOUNDARY_UNCERTAIN / OUTSIDE_COVERAGE / UNAVAILABLE — oxirgi ishonchli tuman SAQLANADI, nomzod tozalanadi;
 *   • yangi tuman `confirmations` (≥2) ta KETMA-KET ishonchli o'lchov bilan tasdiqlangandagina almashadi;
 *   • tasdiqlash o'lchovlari bir-biridan kamida `minGapMs` farq qilishi kerak (bitta GPS javobi ikki marta sanalmasin).
 * Server chegaradan 50 m ichida BOUNDARY_UNCERTAIN beradi — bu gisterezis: chegarada Pop/Chust tez-tez almashmaydi.
 *
 * Tarmoq tejash: shouldResolve() — oldingi so'ralgan nuqtadan `minMoveMeters` (standart 150 m) uzoqlashmagan va
 * tasdiqlanmagan nomzod yo'q bo'lsa — serverga so'rov yuborilmaydi (30–50 m GPS tebranishi umuman so'rov chiqarmaydi).
 */
export const DEFAULTS = { minAccuracyMeters: 50, confirmations: 2, staleMs: 2 * 60_000, minGapMs: 1500, minMoveMeters: 150, refreshMs: 10 * 60_000 };

export function metersBetween(a, b) {
  if (!a || !b) return Infinity;
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Aniqlik va yangilik tekshiruvi: null — yaroqli; aks holda sabab. */
export function fixProblem(fix, { minAccuracyMeters = DEFAULTS.minAccuracyMeters, staleMs = DEFAULTS.staleMs, now = Date.now() } = {}) {
  if (!fix || !Number.isFinite(fix.lat) || !Number.isFinite(fix.lng)) return 'NO_FIX';
  if (!Number.isFinite(fix.accuracy) || fix.accuracy > minAccuracyMeters) return 'LOW_ACCURACY';
  if (Number.isFinite(fix.at) && now - fix.at > staleMs) return 'STALE_FIX';
  return null;
}

export function createDistrictTracker(opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  let current = o.current ?? null;   // oxirgi ishonchli (tasdiqlangan) tuman
  let cand = null;                   // { id, count, lastAt }
  let lastResolvedAt = 0;
  let lastResolvedPoint = null;

  return {
    get current() { return current; },
    get candidate() { return cand ? { ...cand } : null; },
    setCurrent(id) { current = id ?? null; cand = null; },
    /** Bu o'lchov uchun serverdan so'rash kerakmi (tarmoq tejash). */
    shouldResolve(fix, now = Date.now()) {
      if (fixProblem(fix, { ...o, now })) return false;
      if (cand) return true;                                  // nomzodni tasdiqlash kerak
      if (!lastResolvedPoint) return true;
      if (now - lastResolvedAt >= o.refreshMs) return true;
      return metersBetween(lastResolvedPoint, fix) >= o.minMoveMeters;
    },
    /**
     * O'lchov + server javobi → { switched, districtId, status }.
     * status: 'confirmed' | 'pending' | 'same' | 'kept:<reason>' | 'ignored:<reason>'
     */
    step(fix, result, now = Date.now()) {
      const bad = fixProblem(fix, { ...o, now });
      if (bad) return { switched: false, districtId: current, status: `ignored:${bad}` };
      lastResolvedAt = now; lastResolvedPoint = { lat: fix.lat, lng: fix.lng };
      if (!result?.matched || !result.districtId) {
        cand = null;
        return { switched: false, districtId: current, status: `kept:${result?.reason || 'UNKNOWN'}` };
      }
      const id = result.districtId;
      if (id === current) { cand = null; return { switched: false, districtId: current, status: 'same' }; }
      const at = Number.isFinite(fix.at) ? fix.at : now;
      if (cand && cand.id === id) {
        if (at - cand.lastAt < o.minGapMs) return { switched: false, districtId: current, status: 'pending' };   // o'sha javob takrori
        cand = { id, count: cand.count + 1, lastAt: at };
      } else {
        cand = { id, count: 1, lastAt: at };
      }
      if (cand.count >= o.confirmations) {
        current = id; cand = null;
        return { switched: true, districtId: id, status: 'confirmed' };
      }
      return { switched: false, districtId: current, status: 'pending' };
    },
  };
}

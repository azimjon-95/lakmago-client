/*
 * ═══ HOZIRGI JOY: BARQAROR GPS NUQTA (bir martalik manzil uchun) ═══
 *
 * "Hozirgi joyimga yetkazish" bosilganda BITTA o'lchovga ishonilmaydi: GPS bir joyda turganda ham 20–50 m "tebranadi",
 * birinchi o'lchov esa ko'pincha eski (keshdagi) yoki past aniqlikda. Shuning uchun YANGI o'lchovlar yig'iladi
 * (lib/gpsSource.js oqimi), oxirgi WINDOW tasidan aniqlikka vaznlangan o'rtacha nuqta olinadi (lib/gpsCheck.js `estimate`)
 * va koordinata BARQARORLASHGUNCHA kutiladi.
 *
 *   ok    — barqaror (kamida 2 ta YANGI o'lchov, xato U ≤ GOOD_ACC_M)            → to'g'ridan-to'g'ri tasdiqlash mumkin
 *   weak  — aniqlik o'rtacha (GOOD < U ≤ USABLE)                                   → tasdiqlash mumkin, lekin qayta aniqlash/xaritada to'g'rilash taklif qilinadi
 *   poor  — aniqlik past (U > USABLE)                                              → tasdiqlab BO'LMAYDI: qayta aniqlash yoki xaritadan nuqta tanlash
 *
 * Bitta yagona o'lchov (GPS sekin/oqim yo'q): u o'zi ≤ GOOD_ACC_M bo'lsa ham faqat vaqt tugagach ('ok') qabul qilinadi —
 * "eski keshdagi nuqta" bilan adashmaslik uchun kamida MIN_SAMPLES ta o'lchovni kutamiz.
 *
 * Bu fayl faqat gpsCheck.js ni import qiladi (toza mantiq) — Node'da vaqtni sun'iy boshqarib sinaladi (tests/currentFix.test.mjs).
 */
import { GPS, estimate } from './gpsCheck.js';

export const ONCE = {
  GOOD_ACC_M: 50,        // shundan aniq → barqaror
  USABLE_ACC_M: 100,     // shundan yomon bo'lsa tasdiqlab bo'lmaydi
  MIN_SAMPLES: 2,        // erta chiqish uchun kamida shuncha YANGI o'lchov
  WINDOW: 3,             // oxirgi 3 ta o'lchovdan baho (bitta sakrash keyingilar bilan chiqib ketadi)
  MAX_SAMPLES: 8,
  BUDGET_MS: 15000,      // birinchi o'lchovdan keyin barqarorlashishni kutish chegarasi
  NEXT_WAIT_MS: 4000,
  STALL_MS: 6000,        // shuncha vaqt YANGI o'lchov kelmasa — kutmasdan yakunlaymiz
};

const valid = (f) => f && Number.isFinite(f.lat) && Number.isFinite(f.lng) && !(f.lat === 0 && f.lng === 0);

/** Holat: xato U (m) → 'ok' | 'weak' | 'poor'. */
export function qualityOf(U, cfg = ONCE) {
  if (!Number.isFinite(U)) return 'poor';
  if (U <= cfg.GOOD_ACC_M) return 'ok';
  return U <= cfg.USABLE_ACC_M ? 'weak' : 'poor';
}

/**
 * source: { first(): Promise<fix>, next(ms): Promise<fix|null> } (fix = { lat, lng, accuracy, ts? }) — lib/gpsSource.js.
 * first() xato otsa (ruxsat yo'q, signal yo'q ...) — shu xato yuqoriga chiqadi.
 * onUpdate({ pos, U, n }) — jarayon davomida (xarita markeri va "aniqlanmoqda ±X m" yozuvi uchun).
 * Qaytaradi: { state, pos: {lat,lng}, U, n } yoki null (bekor qilingan).
 */
export async function collectStableFix({ source, onUpdate, isCancelled = () => false, now = Date.now, cfg = ONCE }) {
  const all = [];
  let lastAdd = now();
  const add = (f) => {
    if (!valid(f)) return false;
    // Aynan bir xil qiymat (kesh / birinchi va oqimning birinchi javobi) — YANGI o'lchov emas
    if (all.slice(-3).some((p) => p.lat === f.lat && p.lng === f.lng && p.accuracy === f.accuracy)) return false;
    all.push(f);
    lastAdd = now();
    return true;
  };

  const f0 = await source.first();
  if (isCancelled()) return null;
  if (!add(f0)) throw Object.assign(new Error('Qurilma noto‘g‘ri koordinata qaytardi'), { code: 'unavailable' });
  const t0 = now();

  for (;;) {
    const est = estimate(all.slice(-cfg.WINDOW), GPS);
    const out = (state) => ({ state, pos: est.pos, U: est.U, n: all.length });

    if (all.length >= cfg.MIN_SAMPLES && est.U <= cfg.GOOD_ACC_M) return out('ok');

    const elapsed = now() - t0;
    const stalled = now() - lastAdd >= cfg.STALL_MS;
    if (all.length >= cfg.MAX_SAMPLES || elapsed >= cfg.BUDGET_MS || stalled) return out(qualityOf(est.U, cfg));

    onUpdate?.({ pos: est.pos, U: est.U, n: all.length });
    const fix = await source.next(Math.min(cfg.NEXT_WAIT_MS, cfg.BUDGET_MS - elapsed, Math.max(500, cfg.STALL_MS - (now() - lastAdd))));
    if (isCancelled()) return null;
    if (fix) add(fix);
  }
}

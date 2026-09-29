import { calcDeliveryFee } from './pricing.js';

/*
 * ═══════════════════════════════════════════════════════════
 * YETKAZISH SHARTLARI — MIJOZGA QANDAY KO'RSATILADI
 * ═══════════════════════════════════════════════════════════
 *
 * Restoran yetkazishni ikki xil hisoblashi mumkin:
 *   flat  — bitta narx (`deliveryFee`), masofaga bog'liq emas;
 *   perKm — kilometrga qarab: boshlang'ich masofagacha (freeKm) belgilangan
 *           summa (basePrice, 0 = bepul), undan keyin har km uchun perKm
 *           QO'SHILIB boradi.
 *
 * MUAMMO: mijoz ilovasi HAR DOIM `deliveryFee` ni ko'rsatardi. Kilometrli
 * restoranda bu maydon faqat ZAXIRA narx (masofa noma'lum bo'lganda):
 *   • `deliveryFee = 15 000` — kartochka "15 000 so'm" deb yozardi, aslida
 *     narx 5 000 dan boshlanib km ga qarab o'sadi;
 *   • `deliveryFee = 0` — kartochka "Bepul yetkazish" deb yozardi va qidiruvdagi
 *     "Bepul yetkazish" filtriga tushardi, holbuki mijoz har km uchun to'laydi.
 *
 * Bu modul HAMMA joy uchun (ma'lumot oynasi, kartochka, restoran sahifasi,
 * qidiruv) yagona qoidani beradi. Narx misollari lib/pricing.js dagi AYNAN
 * shu formuladan olinadi (u serverdagi deliveryEngine.js bilan bir xil
 * ekani sinovdan o'tgan) — ekrandagi misol savatdagi narxdan farq qilmaydi.
 */

const num = (x) => {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
};

/**
 * @returns {
 *   { mode: 'off' }                                   — yetkazish o'chirilgan
 * | { mode: 'flat', fee, free, threshold, maxKm }     — bitta narx
 * | { mode: 'perKm', freeKm, basePrice, perKm, hasFirstTier, threshold, maxKm, examples }
 * }
 */
export function deliveryTerms(r) {
  if (r?.deliveryEnabled === false) return { mode: 'off' };

  const maxKm = Math.max(0, num(r?.delivery?.maxDistanceKm));

  if (r?.delivery?.pricingMode !== 'perKm') {
    const fee = Math.max(0, num(r?.deliveryFee));
    return {
      mode: 'flat',
      fee,
      free: fee === 0,
      // Bepul yetkazish chegarasi faqat narx pullik bo'lsa mantiqli
      threshold: fee > 0 ? Math.max(0, num(r?.freeDeliveryThreshold)) : 0,
      maxKm,
    };
  }

  const d = r.delivery;
  const basePrice = Math.max(0, Math.round(num(d.basePrice)));
  const perKm = Math.max(0, Math.round(num(d.perKm)));
  const freeKm = Math.max(0, num(d.freeKm));
  const threshold = Math.max(0, num(r?.freeDeliveryThreshold));

  /*
   * Har km uchun 0 bo'lsa masofa narxga ta'sir qilmaydi — bu aslida
   * BITTA narx (basePrice; 0 bo'lsa hamma joyda bepul). "Kilometrga qarab"
   * deb yozish mijozni chalg'itardi.
   */
  if (perKm === 0) {
    return {
      mode: 'flat',
      fee: basePrice,
      free: basePrice === 0,
      threshold: basePrice > 0 ? threshold : 0,
      maxKm,
    };
  }

  // Misollar: bepul masofadan 2 va 4 km keyin (radiusdan uzoq bo'lmasin)
  const from = Math.ceil(freeKm);
  let kms = [from + 2, from + 4].filter((km) => !maxKm || km <= maxKm);
  if (!kms.length && maxKm > freeKm) kms = [maxKm];
  const examples = kms.map((km) => ({ km, price: calcDeliveryFee(0, r, false, km) }));

  return {
    mode: 'perKm',
    freeKm,
    basePrice,
    perKm,
    // "X km gacha ..." qatori kerakmi (masofa yoki boshlang'ich narx bor)
    hasFirstTier: freeKm > 0 || basePrice > 0,
    threshold,
    maxKm,
    examples,
  };
}

/**
 * Haqiqatan ham HAMMA masofada bepulmi ("Bepul yetkazish" belgisi va
 * qidiruv filtri uchun). Kilometrli restoran — bepul emas (1 km gacha bepul
 * bo'lsa ham keyin pullik); yetkazish o'chirilgan restoran ham emas.
 */
export function isFreeDelivery(r) {
  const t = deliveryTerms(r);
  return t.mode === 'flat' && t.free;
}

/**
 * Kartochkadagi QISQA yozuv uchun tur.
 *   { kind: 'free' }                    — bepul yetkazish
 *   { kind: 'flat', price }             — bitta narx
 *   { kind: 'from', price }             — "5 000 dan" (kilometrli, boshlang'ich narx bor)
 *   { kind: 'freeUpTo', km }            — "1 km gacha bepul" (kilometrli, boshlang'ich narx 0)
 *   { kind: 'perKm', price }            — "har km 2 000" (kilometrli, bepul masofa ham yo'q)
 *   null                                — yetkazish yo'q (ko'rsatilmaydi)
 */
export function cardDeliveryLabel(r) {
  const t = deliveryTerms(r);
  if (t.mode === 'off') return null;
  if (t.mode === 'flat') return t.free ? { kind: 'free' } : { kind: 'flat', price: t.fee };
  if (t.basePrice > 0) return { kind: 'from', price: t.basePrice };
  if (t.freeKm > 0) return { kind: 'freeUpTo', km: t.freeKm };
  return { kind: 'perKm', price: t.perKm };
}

/** Ma'lumot oynasi/havolasi ko'rsatilishi kerakmi (yetkazish haqida aytadigan gap bor). */
export function hasDeliveryTerms(r) {
  const t = deliveryTerms(r);
  return t.mode === 'perKm' || t.mode === 'off' || (t.mode === 'flat' && !t.free);
}

/*
 * ═══════════════════════════════════════════════════════════
 * MANZIL KOORDINATASI — YETKAZISHDA MAJBURIY
 * ═══════════════════════════════════════════════════════════
 *
 * Yetkazishda kuryerga aniq nuqta kerak (xaritada "Yo'l ko'rsatish")
 * va per-km yetkazish narxi ham shunga bog'liq: nuqta bo'lmasa narx
 * 0 yoki qat'iy narxga tushib qolardi.
 *
 * NEGA `Number(x)` + `Number.isFinite` YETARLI EMAS:
 *   Number(null) === 0,  Number('') === 0,  Number(false) === 0
 * va Number.isFinite(0) === true — ya'ni lat/lng `null` yoki bo'sh
 * satr bo'lgan (serverdan koordinatasiz kelgan) manzil tekshiruvdan
 * O'TIB KETARDI. Shuning uchun avval qiymatning TURI tekshiriladi.
 */

/** Son yoki sonli satr → son; qolgan hamma narsa (null, '', undefined, NaN, obyekt) → null. */
export function toCoord(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Manzilda haqiqiy xarita nuqtasi bormi.
 * (0, 0) — "Null Island" — haqiqiy manzil emas, joylashuv olinmagan
 * paytdagi standart qiymat: rad etiladi (lib/location.js ham shunday).
 */
export function hasValidCoords(address) {
  const lat = toCoord(address?.lat);
  const lng = toCoord(address?.lng);
  if (lat === null || lng === null) return false;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

/**
 * Yetkazish buyurtmasidan oldingi manzil tekshiruvi.
 *
 * @returns {{ ok: true } | { ok: false, reason: 'no_address'|'no_point', panel: 'sheet'|'flow' }}
 *   panel — qaysi oyna ochilishi kerak:
 *     'sheet' — manzillar ro'yxati (boshqa, nuqtali manzil tanlash mumkin
 *               yoki ro'yxatdan "qo'shish");
 *     'flow'  — xaritadan yangi manzil qo'shish oqimi (nuqtali manzil
 *               umuman yo'q — ro'yxat ochishning foydasi yo'q, mijoz 1 bosish
 *               tejaydi).
 */
export function deliveryAddressCheck({ isPickup, selectedAddress, addresses = [] }) {
  if (isPickup) return { ok: true };
  if (!selectedAddress) return { ok: false, reason: 'no_address', panel: 'sheet' };
  if (hasValidCoords(selectedAddress)) return { ok: true };
  return { ok: false, reason: 'no_point', panel: addresses.some(hasValidCoords) ? 'sheet' : 'flow' };
}

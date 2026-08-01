/**
 * Buyurtma hisob-kitobi.
 *
 * MUHIM: bu mantiq serverda ham bor (services/orderPricing.js).
 * Ikkalasi AYNAN bir xil ishlashi shart — aks holda mijoz bir
 * summani ko'rib boshqasini to'laydi.
 *
 * O'zgartirsangiz ikkalasini birga o'zgartiring.
 */

/** Yetkazish haqi. */
export function calcDeliveryFee(subtotal, restaurant, isPickup) {
  if (isPickup) return 0;

  const fee = Number(restaurant?.deliveryFee) || 0;
  if (fee <= 0) return 0;

  const threshold = Number(restaurant?.freeDeliveryThreshold) || 0;
  if (threshold > 0 && subtotal >= threshold) return 0;

  return fee;
}

/** Xizmat haqi — foiz, min/max bilan. */
export function calcServiceFee(subtotal, restaurant) {
  const percent = Number(restaurant?.serviceFeePercent) || 0;
  if (percent <= 0) return 0;

  let fee = Math.round(subtotal * percent / 100);

  const min = Number(restaurant?.serviceFeeMin) || 0;
  const max = Number(restaurant?.serviceFeeMax) || 0;
  if (min > 0 && fee < min) fee = min;
  if (max > 0 && fee > max) fee = max;

  return fee;
}

/** Minimal summa yetadimi. */
export function checkMinOrder(subtotal, restaurant, isPickup) {
  if (isPickup) return { ok: true, missing: 0, min: 0 };

  const min = Number(restaurant?.minOrderAmount) || 0;
  if (min <= 0 || subtotal >= min) return { ok: true, missing: 0, min };

  return { ok: false, missing: min - subtotal, min };
}

/** Bepul yetkazishgacha qancha qolgan. null = ko'rsatilmaydi. */
export function freeDeliveryGap(subtotal, restaurant, isPickup) {
  if (isPickup) return null;

  const fee = Number(restaurant?.deliveryFee) || 0;
  const threshold = Number(restaurant?.freeDeliveryThreshold) || 0;

  if (fee <= 0 || threshold <= 0) return null;
  if (subtotal >= threshold) return 0;

  return threshold - subtotal;
}

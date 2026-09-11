/**
 * ═══ CHEGIRMA — YAGONA QOIDA ═══
 *
 * Taom chegirmada = eski narx (oldPrice) joriy narxdan (price)
 * katta. Kartadagi "−N%" belgisi, "Super Chegirmalar" bo'limi va
 * "Tavsiya qilamiz" dan chegirmalilarni chiqarib tashlash — HAMMASI
 * shu bitta funksiyadan foydalanadi. Server ham aynan shu shartni
 * ishlatadi (lakmago-server: constants/dishCategories.js).
 */
export function isDiscountedDish(dish) {
  const price = Number(dish?.price);
  const oldPrice = Number(dish?.oldPrice);
  return Number.isFinite(price) && Number.isFinite(oldPrice) && oldPrice > price && price >= 0;
}

/** Chegirma foizi (butun son). Chegirma bo'lmasa 0. */
export function discountPercent(dish) {
  if (!isDiscountedDish(dish)) return 0;
  return Math.round((1 - Number(dish.price) / Number(dish.oldPrice)) * 100);
}

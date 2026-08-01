/**
 * Restoran ish vaqti.
 *
 * openTime/closeTime "HH:MM" ko'rinishida saqlanadi.
 * Yarim tundan oshadigan vaqt ham to'g'ri hisoblanadi
 * (masalan 10:00–02:00).
 */

/** "HH:MM" → daqiqalarda. Noto'g'ri bo'lsa null. */
function toMinutes(hhmm) {
  if (typeof hhmm !== 'string') return null;
  const m = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Restoran hozir ochiqmi.
 * Ish vaqti ko'rsatilmagan bo'lsa — doim ochiq deb hisoblanadi.
 */
export function isOpenNow(restaurant, now = new Date()) {
  const open = toMinutes(restaurant?.openTime);
  const close = toMinutes(restaurant?.closeTime);

  // Vaqt belgilanmagan — cheklov yo'q
  if (open === null || close === null) return true;
  // Bir xil bo'lsa 24 soat ishlaydi
  if (open === close) return true;

  const cur = now.getHours() * 60 + now.getMinutes();

  // Odatiy holat: 09:00–23:00
  if (open < close) return cur >= open && cur < close;

  // Yarim tundan oshadi: 10:00–02:00
  return cur >= open || cur < close;
}

/** Ish vaqti matni: "09:00 – 23:00". Yo'q bo'lsa null. */
export function workHoursLabel(restaurant) {
  const open = toMinutes(restaurant?.openTime);
  const close = toMinutes(restaurant?.closeTime);
  if (open === null || close === null) return null;
  if (open === close) return '24 soat';
  return `${restaurant.openTime} – ${restaurant.closeTime}`;
}

/**
 * Yopiq bo'lsa qachon ochilishini aytadi.
 * Ochiq bo'lsa null.
 */
export function nextOpenLabel(restaurant, now = new Date()) {
  if (isOpenNow(restaurant, now)) return null;
  const open = toMinutes(restaurant?.openTime);
  if (open === null) return null;

  const cur = now.getHours() * 60 + now.getMinutes();
  // Bugun ochiladimi yoki ertagami
  return cur < open ? `${restaurant.openTime} da ochiladi` : `Ertaga ${restaurant.openTime}`;
}

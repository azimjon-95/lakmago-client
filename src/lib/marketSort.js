import { distanceM } from './gpsCheck.js';

/*
 * Market do'konlarini saralash (sof funksiya — tests/marketSort.test.mjs).
 *   near   — sizga yaqin (joylashuv bo'lsa; bo'lmasa asl tartib)
 *   rating — reyting (teng bo'lsa — sharhlar soni)
 *   fast   — eng tez yetkazish (deliveryMin+Max)
 * Har doim OCHIQ do'konlar oldinda. Barqaror: teng holatda serverdagi tartib saqlanadi.
 * Qaytaradi: [{ store, distanceKm | null }]
 */
export const STORE_SORTS = ['near', 'rating', 'fast'];

export function sortStores(list = [], mode = 'near', origin = null) {
  const hasOrigin = origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lng);
  const rows = list.map((store, i) => ({
    store, i,
    distanceKm: hasOrigin && Number.isFinite(store.lat) && Number.isFinite(store.lng) ? distanceM(origin, { lat: store.lat, lng: store.lng }) / 1000 : null,
  }));
  const open = (r) => (r.store.isOpen === false ? 0 : 1);
  const eta = (r) => (Number(r.store.deliveryMin) || 99) + (Number(r.store.deliveryMax) || 99);
  const by = {
    near: (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
    rating: (a, b) => (Number(b.store.rating) || 0) - (Number(a.store.rating) || 0) || (Number(b.store.reviewCount) || 0) - (Number(a.store.reviewCount) || 0),
    fast: (a, b) => eta(a) - eta(b),
  }[mode] || (() => 0);
  return rows
    .sort((a, b) => open(b) - open(a) || by(a, b) || a.i - b.i)
    .map(({ store, distanceKm }) => ({ store, distanceKm: Number.isFinite(distanceKm) ? distanceKm : null }));
}

/** "Tavsiya etamiz": eng yuqori reytingli OCHIQ do'kon (reyting ≥ 4.5). Yo'q bo'lsa — null (belgi ko'rsatilmaydi). */
export function recommendedStoreId(list = []) {
  let best = null;
  for (const s of list) {
    if (s.isOpen === false || !(Number(s.rating) >= 4.5)) continue;
    if (!best || Number(s.rating) > Number(best.rating) || (Number(s.rating) === Number(best.rating) && (s.reviewCount || 0) > (best.reviewCount || 0))) best = s;
  }
  return best ? String(best._id || best.id) : null;
}

/** Joylashuv manbai: yangi GPS nuqta (≤15 daq) → asosiy (saqlangan) manzil → null. */
export function marketOrigin({ fix, user, now = Date.now() } = {}) {
  if (fix && Number.isFinite(fix.lat) && Number.isFinite(fix.lng) && now - Number(fix.at || 0) <= 15 * 60 * 1000) return { lat: fix.lat, lng: fix.lng, source: 'gps' };
  const list = user?.addresses || [];
  const a = list.find((x) => String(x.id) === String(user?.defaultAddressId)) || list[0];
  if (a && Number.isFinite(Number(a.lat)) && Number.isFinite(Number(a.lng)) && !(Number(a.lat) === 0 && Number(a.lng) === 0)) return { lat: Number(a.lat), lng: Number(a.lng), source: 'address' };
  return null;
}

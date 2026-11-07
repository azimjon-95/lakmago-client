/* Market do'konlarini saralash, "Tavsiya etamiz", joylashuv manbai (src/lib/marketSort.js). npm run test:marketsort */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sortStores, recommendedStoreId, marketOrigin } from '../src/lib/marketSort.js';

const S = (id, o = {}) => ({ _id: id, name: id, isOpen: true, rating: 4, reviewCount: 1, deliveryMin: 30, deliveryMax: 45, ...o });
const me = { lat: 41.0, lng: 71.67 };
const stores = [
  S('uzoq', { lat: 41.2, lng: 71.67, rating: 4.9, deliveryMin: 15, deliveryMax: 25 }),
  S('yaqin', { lat: 41.003, lng: 71.67, rating: 4.2 }),
  S('yopiq', { lat: 41.0, lng: 71.67, isOpen: false, rating: 5 }),
  S('koordsiz', { rating: 4.6 }),
];
const ids = (rows) => rows.map((r) => r.store._id);

test('Sizga yaqin: ochiqlar oldinda, masofa bo\'yicha; koordinatasizlar oxirida; masofa km', () => {
  const r = sortStores(stores, 'near', me);
  assert.deepEqual(ids(r), ['yaqin', 'uzoq', 'koordsiz', 'yopiq']);
  assert.ok(Math.abs(r[0].distanceKm - 0.33) < 0.05 && Math.abs(r[1].distanceKm - 22.2) < 0.3);
  assert.equal(r[2].distanceKm, null);
});

test('joylashuv yo\'q — "Sizga yaqin" asl tartibni saqlaydi (faqat ochiqlar oldinda), hech narsa so\'ramaydi', () => {
  assert.deepEqual(ids(sortStores(stores, 'near', null)), ['uzoq', 'yaqin', 'koordsiz', 'yopiq']);
});

test('reyting va tez yetkazish bo\'yicha', () => {
  assert.deepEqual(ids(sortStores(stores, 'rating', me)), ['uzoq', 'koordsiz', 'yaqin', 'yopiq']);
  assert.deepEqual(ids(sortStores(stores, 'fast', me)), ['uzoq', 'yaqin', 'koordsiz', 'yopiq']);
  assert.deepEqual(ids(sortStores([], 'near', me)), []);
});

test('Tavsiya etamiz: eng yuqori reytingli OCHIQ (≥ 4.5); yo\'q bo\'lsa — belgi yo\'q', () => {
  assert.equal(recommendedStoreId(stores), 'uzoq', 'yopiq 5.0 hisobga olinmaydi');
  assert.equal(recommendedStoreId([S('a', { rating: 4.4 })]), null);
  assert.equal(recommendedStoreId([S('a', { rating: 4.8, reviewCount: 2 }), S('b', { rating: 4.8, reviewCount: 9 })]), 'b', 'teng bo\'lsa sharhlari ko\'pi');
});

test('joylashuv manbai: yangi GPS (≤15 daq) → asosiy manzil → null', () => {
  const now = Date.now();
  const user = { defaultAddressId: 'a2', addresses: [{ id: 'a1', lat: 40, lng: 70 }, { id: 'a2', lat: 41.1, lng: 71.6 }] };
  assert.deepEqual(marketOrigin({ fix: { lat: 41, lng: 71, at: now - 60_000 }, user, now }), { lat: 41, lng: 71, source: 'gps' });
  assert.deepEqual(marketOrigin({ fix: { lat: 41, lng: 71, at: now - 20 * 60_000 }, user, now }), { lat: 41.1, lng: 71.6, source: 'address' }, 'eski GPS — manzil');
  assert.deepEqual(marketOrigin({ user: { addresses: [{ id: 'x', lat: 0, lng: 0 }] }, now }), null, '(0,0) yaroqsiz');
  assert.equal(marketOrigin({ now }), null);
});

/*
 * Manzil ↔ qurilma joylashuvi: 500 m majburiy tanlov (GPS xatosi hisobga olingan) va serverga yuboriladigan dalil.
 * npm run test:device
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { isFarBlock, GPS } from '../src/lib/gpsCheck.js';
import { buildDeviceFields, DEVICE_FIX_MAX_AGE_MS } from '../src/lib/deviceFix.js';
import { useDeviceLocation } from '../src/store/deviceLocation.js';

test('chegara: 500 m (xato ayirilgandan KEYIN)', () => {
  assert.equal(GPS.BLOCK_M, 500);
  const far = (d, acc) => ({ state: 'far', d, acc });
  assert.equal(isFarBlock(far(8200, 20)), true, '8,2 km, aniqlik 20 m');
  assert.equal(isFarBlock(far(520, 20)), true, '520 − 20 = 500 → majburiy');
  assert.equal(isFarBlock(far(519, 20)), false, '499 m — yumshoq ogohlantirish xolos');
  assert.equal(isFarBlock(far(300, 10)), false, '100–500 m: majburlanmaydi');
});

test('aniqlik past bo\'lsa MAJBURLANMAYDI (to\'g\'ri joydagi mijoz soxta "uzoqdasiz" bilan to\'xtamasin)', () => {
  assert.equal(isFarBlock({ state: 'far', d: 900, acc: 150 }), false, 'aniqlik 150 m > 100');
  assert.equal(isFarBlock({ state: 'far', d: 900, acc: 100 }), true, 'aniqlik 100 m — chegarada, ruxsat');
  assert.equal(isFarBlock({ state: 'lowacc', d: 9000, acc: 400 }), false);
  assert.equal(isFarBlock({ state: 'near', d: 400, acc: 30 }), false);
  assert.equal(isFarBlock({ state: 'ok', d: 20, acc: 10 }), false);
  assert.equal(isFarBlock({ state: 'far', d: 9000 }), false, 'aniqlik noma\'lum — majburlanmaydi');
  assert.equal(isFarBlock({ state: 'far', d: NaN, acc: 10 }), false);
  for (const bad of [null, undefined, {}, { state: 'denied' }]) assert.equal(isFarBlock(bad), false);
});

test('buyurtma dalili: yangi nuqta yuboriladi, eskirgan/yo\'q — yuborilmaydi', () => {
  const now = Date.parse('2026-11-05T12:00:00Z');
  const fix = { lat: 40.998312345, lng: 71.672612345, accuracy: 18.4, at: now - 60_000 };
  assert.deepEqual(buildDeviceFields({ fix, now }), { deviceLat: 40.998312, deviceLng: 71.672612, deviceAccuracy: 18, deviceAt: new Date(fix.at).toISOString() });
  assert.deepEqual(buildDeviceFields({ fix: { ...fix, at: now - DEVICE_FIX_MAX_AGE_MS - 1 }, now }), {}, '15 daqiqadan eski — dalil emas');
  assert.deepEqual(buildDeviceFields({ fix: { ...fix, at: now + 60_000 }, now }), {}, 'kelajakdagi vaqt — noto\'g\'ri soat');
  assert.deepEqual(buildDeviceFields({ now }), {});
  assert.deepEqual(buildDeviceFields({ fix: { lat: 0, lng: 0, at: now }, now }), {}, '(0,0) — yaroqsiz');
  assert.deepEqual(buildDeviceFields({ fix: { lat: NaN, lng: 1, at: now }, now }), {});
});

test('uzoq manzilni mijoz o\'zi tasdiqlagan bo\'lsa — belgilanadi (nuqta bo\'lmasa ham)', () => {
  const now = Date.now();
  assert.deepEqual(buildDeviceFields({ confirmedFar: true, now }), { addressConfirmedFar: true });
  const f = buildDeviceFields({ fix: { lat: 40.9, lng: 71.6, accuracy: 9, at: now }, confirmedFar: true, now });
  assert.equal(f.addressConfirmedFar, true); assert.equal(f.deviceLat, 40.9);
  assert.ok(!('addressConfirmedFar' in buildDeviceFields({ fix: { lat: 40.9, lng: 71.6, at: now }, now })), 'tasdiqsiz — maydon yo\'q');
});

test('omborda faqat yaroqli nuqta saqlanadi (xotirada, persist yo\'q)', () => {
  const s = useDeviceLocation.getState();
  s.set({ lat: 0, lng: 0 }); assert.equal(useDeviceLocation.getState().fix, null);
  s.set({ lat: NaN, lng: 1 }); assert.equal(useDeviceLocation.getState().fix, null);
  s.set({ lat: 40.9, lng: 71.6, accuracy: 12, at: 123 });
  assert.deepEqual(useDeviceLocation.getState().fix, { lat: 40.9, lng: 71.6, accuracy: 12, at: 123 });
  s.clear(); assert.equal(useDeviceLocation.getState().fix, null);
});

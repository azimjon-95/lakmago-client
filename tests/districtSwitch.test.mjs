/* Tuman avtomatik almashishi: 2 ta ishonchli o'lchov, gisterezis, tebranish, past aniqlik. npm run test:district */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDistrictTracker, fixProblem, metersBetween } from '../src/lib/districtSwitch.js';

const POP = { lat: 40.8736, lng: 71.1085 };
const CHUST = { lat: 41.0035, lng: 71.2378 };
const fix = (p, at, accuracy = 15, dLat = 0) => ({ lat: p.lat + dLat, lng: p.lng, accuracy, at });
const ok = (id) => ({ matched: true, districtId: id });
const no = (reason) => ({ matched: false, districtId: null, reason });

test('Pop’da: birinchi aniqlash ham 2 ta o‘lchov bilan tasdiqlanadi (bitta tasodifiy natija yetmaydi)', () => {
  const t = createDistrictTracker();
  assert.equal(t.step(fix(POP, 1000), ok('pop'), 1000).status, 'pending');
  const r = t.step(fix(POP, 5000), ok('pop'), 5000);
  assert.equal(r.switched, true); assert.equal(t.current, 'pop');
});

test('Pop → Chust: faqat 2 ta ishonchli o‘lchovdan keyin; qaytganda yana Pop', () => {
  const t = createDistrictTracker({ current: 'pop' });
  assert.equal(t.step(fix(CHUST, 1000), ok('chust'), 1000).switched, false);
  assert.equal(t.current, 'pop', 'bitta o‘lchov — almashmaydi');
  assert.equal(t.step(fix(CHUST, 6000), ok('chust'), 6000).switched, true);
  assert.equal(t.current, 'chust');
  t.step(fix(POP, 9000), ok('pop'), 9000);
  assert.equal(t.step(fix(POP, 14000), ok('pop'), 14000).districtId, 'pop');
});

test('Bitta GPS javobi ikki marta sanalmaydi (minGapMs)', () => {
  const t = createDistrictTracker({ current: 'pop' });
  t.step(fix(CHUST, 1000), ok('chust'), 1000);
  assert.equal(t.step(fix(CHUST, 1200), ok('chust'), 1200).switched, false);
  assert.equal(t.current, 'pop');
});

test('Chegarada (BOUNDARY_UNCERTAIN) va qamrovdan tashqarida — oxirgi tuman saqlanadi, nomzod tozalanadi', () => {
  const t = createDistrictTracker({ current: 'pop' });
  t.step(fix(CHUST, 1000), ok('chust'), 1000);
  assert.match(t.step(fix(CHUST, 5000), no('BOUNDARY_UNCERTAIN'), 5000).status, /^kept:BOUNDARY_UNCERTAIN/);
  assert.equal(t.current, 'pop'); assert.equal(t.candidate, null);
  assert.equal(t.step(fix(CHUST, 9000), ok('chust'), 9000).switched, false, 'nomzod qaytadan sanaladi');
  assert.match(t.step(fix({ lat: 41.31, lng: 69.28 }, 15000), no('OUTSIDE_COVERAGE'), 15000).status, /OUTSIDE/);
  assert.equal(t.current, 'pop');
});

test('Navbatma-navbat Pop/Chust (chegara tebranishi) — almashmaydi', () => {
  const t = createDistrictTracker({ current: 'pop' });
  let at = 0;
  for (let i = 0; i < 10; i += 1) { at += 3000; t.step(fix(CHUST, at), ok(i % 2 ? 'pop' : 'chust'), at); }
  assert.equal(t.current, 'pop');
});

test('Past aniqlik (> 50 m), noma‘lum aniqlik, eskirgan o‘lchov — e‘tiborsiz', () => {
  const t = createDistrictTracker({ current: 'pop' });
  assert.match(t.step(fix(CHUST, 1000, 120), ok('chust'), 1000).status, /LOW_ACCURACY/);
  assert.match(t.step({ ...fix(CHUST, 1000), accuracy: null }, ok('chust'), 1000).status, /LOW_ACCURACY/);
  assert.match(t.step(fix(CHUST, 1000), ok('chust'), 1000 + 5 * 60_000).status, /STALE/);
  assert.equal(t.current, 'pop');
  assert.equal(fixProblem(null), 'NO_FIX');
});

test('30–50 m GPS tebranishi serverga so‘rov ham chiqarmaydi; 150 m+ yoki 10 daqiqadan keyin — so‘raydi', () => {
  const t = createDistrictTracker({ current: 'pop' });
  t.step(fix(POP, 1000), ok('pop'), 1000);
  const jitter = fix(POP, 3000, 20, 0.0004);   // ~45 m
  assert.ok(metersBetween(POP, jitter) > 30 && metersBetween(POP, jitter) < 50);
  assert.equal(t.shouldResolve(jitter, 3000), false);
  assert.equal(t.shouldResolve(fix(POP, 4000, 20, 0.002), 4000), true, '~220 m');
  assert.equal(t.shouldResolve(fix(POP, 1000 + 10 * 60_000, 20), 1000 + 10 * 60_000), true, '10 daqiqa');
  assert.equal(t.shouldResolve(fix(POP, 5000, 200), 5000), false, 'past aniqlik — so‘ramaydi');
});

test('Nomzod bor bo‘lsa — kichik siljishda ham tasdiqlash uchun so‘raydi', () => {
  const t = createDistrictTracker({ current: 'pop' });
  t.step(fix(CHUST, 1000), ok('chust'), 1000);
  assert.equal(t.shouldResolve(fix(CHUST, 5000), 5000), true);
});

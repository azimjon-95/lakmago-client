/*
 * Bir martalik "Hozirgi joy": barqaror GPS nuqta (src/lib/currentFix.js). Soxta GPS manbai va soxta soat.
 * npm run test:once
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { collectStableFix, qualityOf, ONCE } from '../src/lib/currentFix.js';
import { distanceM } from '../src/lib/gpsCheck.js';

const BASE = { lat: 41.3260, lng: 69.2850 };
// BASE dan `n` metr shimolga / `e` metr sharqqa, aniqlik `acc`
const fx = (n, acc, e = 0) => ({ lat: BASE.lat + n / 111320, lng: BASE.lng + e / (111320 * Math.cos(BASE.lat * Math.PI / 180)), accuracy: acc });

// Soxta soat: har next() chaqiruvida `step` ms o'tadi
function run(first, nexts, { step = 1000, ...opts } = {}) {
  let t = 0; const q = [...nexts]; let calls = 0;
  const source = {
    first: async () => { if (first instanceof Error) throw first; return first; },
    next: async () => { calls += 1; t += step; return q.length ? q.shift() : null; },
  };
  return collectStableFix({ source, now: () => t, ...opts }).then((r) => ({ r, calls }));
}

test('barqaror: 2 ta yangi aniq o\'lchov → ok, o\'rtacha nuqta', async () => {
  const { r } = await run(fx(0, 30), [fx(4, 12)]);
  assert.equal(r.state, 'ok');
  assert.equal(r.n, 2);
  assert.ok(distanceM(r.pos, BASE) < 10, `nuqta o'rtacha (${distanceM(r.pos, BASE).toFixed(1)} m)`);
  assert.ok(r.U <= ONCE.GOOD_ACC_M);
});

test('BITTA aniq o\'lchov yetmaydi (eski kesh bo\'lishi mumkin): ikkinchisi kutiladi', async () => {
  const { r, calls } = await run(fx(0, 8), [fx(1, 8)]);
  assert.equal(r.state, 'ok');
  assert.equal(calls, 1, 'ikkinchi o\'lchov so\'raldi');
});

test('birinchi o\'lchov past aniqlikda, keyingilar yaxshilanadi → barqarorlashguncha kutadi', async () => {
  const { r } = await run(fx(0, 400), [fx(60, 120), fx(8, 15), fx(10, 12)]);
  assert.equal(r.state, 'ok');
  assert.ok(r.n >= 3);
  assert.ok(distanceM(r.pos, fx(9, 0)) < 40, 'aniq o\'lchovlarga yaqin (past aniqlikdagisi kam vaznli)');
});

test('aniqlik o\'rtacha (50–100 m) → weak (tasdiqlash mumkin)', async () => {
  const { r } = await run(fx(0, 80), [fx(3, 75), fx(2, 70), fx(1, 72)], { step: 6000 });
  assert.equal(r.state, 'weak');
  assert.ok(r.U > ONCE.GOOD_ACC_M && r.U <= ONCE.USABLE_ACC_M);
});

test('aniqlik past (>100 m), barqarorlashmadi → poor (tasdiqlab bo\'lmaydi)', async () => {
  const { r } = await run(fx(0, 400), [fx(250, 300), fx(-200, 350)], { step: 8000 });
  assert.equal(r.state, 'poor');
  assert.ok(r.U > ONCE.USABLE_ACC_M);
});

test('YANGI o\'lchov kelmasa (turg\'un) — kutmasdan yakunlanadi; yagona yaxshi o\'lchov = ok', async () => {
  const { r, calls } = await run(fx(0, 25), [], { step: 7000 });   // oqim jim: next() null, 7 s o'tadi
  assert.equal(r.state, 'ok');
  assert.equal(r.n, 1);
  assert.equal(calls, 1);
});

test('yagona yomon o\'lchov + jim oqim → poor', async () => {
  const { r } = await run(fx(0, 600), [], { step: 7000 });
  assert.equal(r.state, 'poor');
});

test('aynan bir xil takroriy qiymat yangi o\'lchov hisoblanmaydi (soxta "takroriy tasdiq" yo\'q)', async () => {
  const same = fx(0, 20);
  const { r } = await run(same, [{ ...same }, { ...same }], { step: 7000 });
  assert.equal(r.n, 1, 'takrorlar qo\'shilmadi');
});

test('xato: ruxsat yo\'q yuqoriga chiqadi; (0,0) noto\'g\'ri koordinata → unavailable', async () => {
  await assert.rejects(run(Object.assign(new Error('x'), { code: 'denied' }), []), (e) => e.code === 'denied');
  await assert.rejects(run({ lat: 0, lng: 0, accuracy: 5 }, []), (e) => e.code === 'unavailable');
});

test('bekor qilish: null qaytaradi (eskirgan javob holatni buzmaydi)', async () => {
  let cancelled = false;
  const { r } = await run(fx(0, 200), [fx(1, 200)], { isCancelled: () => { const c = cancelled; cancelled = true; return c; } });
  assert.equal(r, null);
});

test('onUpdate: jarayon davomida joriy baho beriladi', async () => {
  const seen = [];
  await run(fx(0, 300), [fx(2, 200), fx(1, 20), fx(1, 15)], { onUpdate: (u) => seen.push(u) });
  assert.ok(seen.length >= 1 && Number.isFinite(seen[0].U) && seen[0].pos.lat);
});

test('qualityOf chegaralari', () => {
  assert.equal(qualityOf(50), 'ok'); assert.equal(qualityOf(51), 'weak');
  assert.equal(qualityOf(100), 'weak'); assert.equal(qualityOf(101), 'poor');
  assert.equal(qualityOf(NaN), 'poor');
});

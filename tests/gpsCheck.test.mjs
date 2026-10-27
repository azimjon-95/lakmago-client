/*
 * GPS ↔ saqlangan manzil: yumshoq tekshiruv mantiqi (src/lib/gpsCheck.js). Soxta GPS manbai va soxta soat.
 * npm run test:gps
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { GPS, distanceM, estimate, decide, farConfirmed, runGpsCheck } from '../src/lib/gpsCheck.js';

const T = { lat: 41.3260, lng: 69.2850 };                       // saqlangan manzil
// manzildan `n` metr shimolga / `e` metr sharqqa, aniqlik `acc`
const at = (n, acc, e = 0, ts) => ({ lat: T.lat + n / 111320, lng: T.lng + e / (111320 * Math.cos(T.lat * Math.PI / 180)), accuracy: acc, ts });

/** Soxta manba: script = [{ delay, fix } | { delay, err }], birinchisi first() uchun. */
function harness(script) {
  const clock = { t: 1_000_000 };
  let i = 0; const calls = { first: 0, next: 0 };
  const source = {
    async first() { calls.first++; const s = script[i++]; if (!s) throw Object.assign(new Error('yo‘q'), { code: 'timeout' }); clock.t += s.delay ?? 0; if (s.err) throw s.err; return s.fix; },
    async next(ms) {
      calls.next++; const s = script[i];
      if (!s || (s.delay ?? 0) > ms) { clock.t += ms; return null; }
      i++; clock.t += s.delay ?? 0; return s.fix ?? null;
    },
  };
  const updates = [];
  const run = (over = {}) => runGpsCheck({ target: T, source, onUpdate: (u) => updates.push(u), now: () => clock.t, ...over });
  return { run, clock, calls, updates };
}
const steps = (list, gap = 1000) => list.map((fix, k) => ({ delay: k === 0 ? 800 : gap, fix }));

test('masofa formulasi: 1° kenglik ≈ 111.2 km, nol masofa', () => {
  assert.ok(Math.abs(distanceM({ lat: 41, lng: 69 }, { lat: 42, lng: 69 }) - 111195) < 200);
  assert.equal(distanceM(T, T), 0);
});

test('baho: aniqroq o‘lchov og‘irroq, xato = max(eng yaxshi aniqlik, tushuntirilmagan og‘ish)', () => {
  const e = estimate([at(0, 10), at(100, 100)]);
  assert.ok(e.pos.lat < T.lat + 20 / 111320, 'o‘rtacha aniq o‘lchovga yaqin');
  assert.equal(Math.round(e.U), 10, `±100 m li nuqta o‘z xatosi ichida og‘di — noaniqlik oshmaydi (U = ${e.U.toFixed(1)})`);
  const spread = estimate([at(0, 10), at(200, 10)]);
  assert.ok(spread.U > 80, `ikkita aniq nuqta 200 m farq qilsa — noaniqlik katta (U = ${spread.U.toFixed(0)})`);
  assert.equal(estimate([{ lat: 0, lng: 0, accuracy: 5 }, { lat: NaN, lng: 1 }]), null, '0,0 va NaN yaroqsiz');
});

test('qaror: xato ayirilgach 100 m dan uzoq bo‘lsagina "far"', () => {
  assert.equal(decide(850, 25), 'far');
  assert.equal(decide(130, 40), 'near', '130 m, ±40 → 90 m < 100: ogohlantirmaymiz');
  assert.equal(decide(50, 20), 'ok');
  assert.equal(decide(45, 30), 'ok', '30–50 m farq — ogohlantirish yo‘q');
  assert.equal(decide(35, 90), 'near', 'aniqlik 90 m: "manzildasiz" deb da’vo qilmaymiz, lekin ogohlantirmaymiz ham');
  assert.equal(decide(100, 250), 'lowacc', 'xato juda katta — xulosa yo‘q');
  assert.equal(decide(900, 250), 'far', 'xato katta bo‘lsa ham 900 m aniq uzoq');
});

test('manzilda, aniq o‘lchov: darhol "ok", ortiqcha kutmaydi', async () => {
  const h = harness(steps([at(20, 12)]));
  const r = await h.run();
  assert.equal(r.state, 'ok'); assert.equal(r.n, 1); assert.equal(h.calls.next, 0);
});

test('TEBRANISH 30–50 m: hech qachon ogohlantirmaydi', async () => {
  for (const jitter of [[35, 25], [48, 25], [42, 30], [30, 20], [50, 25]]) {
    const h = harness(steps([at(jitter[0], jitter[1]), at(-jitter[0], jitter[1], 20), at(jitter[0] * 0.6, jitter[1], -15), at(-jitter[0] * 0.9, jitter[1])]));
    const r = await h.run();
    assert.notEqual(r.state, 'far', `${jitter} → ${r.state}`);
    assert.ok(h.updates.every((u) => u.state === 'checking'), 'oraliq holatlar ogohlantirish emas');
  }
});

test('PAST ANIQLIK avval, keyin barqarorlashadi → ogohlantirish chiqmaydi, "ok"', async () => {
  const h = harness(steps([at(400, 300), at(250, 200), at(90, 120), at(35, 40), at(30, 25), at(28, 20)]));
  const r = await h.run();
  assert.equal(r.state, 'ok');
  assert.ok(h.updates.length >= 2 && h.updates.every((u) => u.state === 'checking'), 'barqarorlashguncha faqat "kutilmoqda"');
  assert.ok(h.updates.some((u) => u.U > 100), 'ko‘rsatkich avval katta xatoni ko‘rsatdi');
});

test('barqarorlashmasa: "aniqlik past" (ogohlantirish EMAS), vaqt tugagach', async () => {
  const h = harness(steps(Array.from({ length: 10 }, (_, k) => at(60 + (k % 2) * 40, 250)), 2000));
  const r = await h.run();
  assert.equal(r.state, 'lowacc');
  assert.ok(h.clock.t - 1_000_000 <= GPS.BUDGET_MS + 2500, 'cheksiz kutmaydi');
});

test('BITTA SAKRASH (850 m, keyin joyida): ogohlantirish yo‘q', async () => {
  const h = harness(steps([at(850, 25), at(20, 20), at(22, 20), at(21, 20), at(23, 20)]));
  const r = await h.run();
  assert.notEqual(r.state, 'far'); assert.ok(['ok', 'near'].includes(r.state), r.state);
});

test('HAQIQATAN UZOQ (850 m, izchil): ogohlantirish, kamida 2 o‘lchov bilan', async () => {
  const h = harness(steps([at(850, 22), at(845, 18), at(852, 20)]));
  const r = await h.run();
  assert.equal(r.state, 'far'); assert.ok(r.n >= 2, 'bitta o‘lchovga tayanmadi');
  assert.ok(Math.abs(r.d - 850) < 25, `masofa ${Math.round(r.d)} m`);
});

test('xato katta, lekin juda uzoq (2 km, ±250): baribir "far"', async () => {
  const h = harness(steps([at(2000, 250), at(2050, 240)]));
  assert.equal((await h.run()).state, 'far');
});

test('chegarada: 130 m, ±40 → ogohlantirish yo‘q; 130 m, ±15 → ogohlantirish', async () => {
  assert.notEqual((await harness(steps([at(130, 40), at(128, 40), at(132, 40)])).run()).state, 'far');
  assert.equal((await harness(steps([at(130, 15), at(131, 15)])).run()).state, 'far');
});

test('o‘zaro zid o‘lchovlar (uzoq/yaqin almashadi): ogohlantirmaydi', async () => {
  const h = harness(steps([at(300, 20), at(30, 20), at(320, 20), at(25, 20), at(310, 20), at(28, 20)]));
  assert.notEqual((await h.run()).state, 'far');
});

test('GPS sekin — faqat BITTA o‘lchov: 500 m → far; 250 m → ogohlantirmaymiz', async () => {
  assert.equal((await harness([{ delay: 500, fix: at(500, 20) }]).run()).state, 'far');
  assert.equal((await harness([{ delay: 500, fix: at(250, 20) }]).run()).state, 'near');
});

test('farConfirmed: oxirgi ikkisi har biri alohida uzoq bo‘lishi shart', () => {
  assert.equal(farConfirmed([at(300, 20), at(40, 20)], T), false);
  assert.equal(farConfirmed([at(300, 20), at(310, 20)], T), true);
  assert.equal(farConfirmed([at(300, 20)], T), false);
});

test('xatolar: ruxsat yo‘q / vaqt tugadi / noto‘g‘ri koordinata — yuqoriga chiqadi', async () => {
  const denied = Object.assign(new Error('d'), { code: 'denied' });
  await assert.rejects(harness([{ delay: 100, err: denied }]).run(), (e) => e.code === 'denied');
  await assert.rejects(harness([]).run(), (e) => e.code === 'timeout');
  await assert.rejects(harness([{ delay: 50, fix: { lat: 0, lng: 0, accuracy: 5 } }]).run(), (e) => e.code === 'unavailable');
});

test('aniqlik berilmasa (null) — o‘rtacha taxmin, "ok" deb da’vo qilmaydi', async () => {
  const r = await harness(steps([{ ...at(30, null) }, { ...at(35, null) }])).run();
  assert.equal(r.state, 'near');
});

test('bekor qilish: keyingi o‘lchovlar so‘ralmaydi', async () => {
  let cancelled = false;
  const h = harness(steps([at(400, 200), at(30, 20)]));
  const p = h.run({ isCancelled: () => cancelled, onUpdate: () => { cancelled = true; } });
  assert.equal(await p, null);
  assert.ok(h.calls.next <= 1);
});

test('YANGI o‘lchov kelmasa (turg‘un tarmoq joylashuvi) — 6 s da yakunlanadi, 15 s kutmaydi', async () => {
  const near = harness([{ delay: 400, fix: at(110, 30) }]);
  const r = await near.run();
  assert.equal(r.state, 'near'); assert.ok(near.clock.t - 1_000_000 <= 400 + GPS.STALL_MS + 1000, `${near.clock.t - 1_000_000} ms`);
  const far = harness([{ delay: 400, fix: at(850, 30) }]);
  assert.equal((await far.run()).state, 'far');
  assert.ok(far.clock.t - 1_000_000 <= 400 + GPS.STALL_MS + 1000);
});

test('qayta so‘ralgan ESKI (bir xil qiymatli) nuqta vaqt belgisi boshqacha bo‘lsa ham takroriy hisoblanadi', async () => {
  const h = harness([{ delay: 300, fix: at(600, 20, 0, 1000) }, { delay: 1500, fix: at(600, 20, 0, 2600) }, { delay: 1500, fix: at(600, 20, 0, 4200) }]);
  const r = await h.run();
  assert.equal(r.n, 1, 'uchala nuqta bir xil qiymat — bitta o‘lchov');
  assert.equal(r.state, 'far', 'bitta o‘lchov, lekin 580 m ≥ 300 m: yakuniy qoida');
  const h2 = harness([{ delay: 300, fix: at(250, 20, 0, 1000) }, { delay: 1500, fix: at(250, 20, 0, 2600) }]);
  assert.equal((await h2.run()).state, 'near', '250 m, bitta o‘lchov: soxta tasdiq bilan "far" bo‘lmaydi');
});

test('aynan bir xil (keshdagi) o‘lchov ikki marta — takroriy hisoblanmaydi (soxta tasdiq yo‘q)', async () => {
  const a = at(600, 20, 0, 5000);
  const h = harness([{ delay: 300, fix: a }, { delay: 200, fix: { ...a } }, { delay: 200, fix: at(25, 15, 0, 9000) }, { delay: 1000, fix: at(24, 15, 0, 10000) }]);
  const r = await h.run();
  assert.notEqual(r.state, 'far', 'bitta eski nuqta ikki marta "tasdiq" bo‘lmasligi kerak');
});

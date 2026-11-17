// Tez joylashuv yig'uvchisi (src/lib/fixCollector.js) — sun'iy vaqt bilan.
import assert from 'node:assert/strict';
import { collectFix, FIX, rememberFix, recentFix, _resetFixMemory } from '../src/lib/fixCollector.js';

// ── Sun'iy soat ──
function clock() {
  let now = 0; let seq = 0; const q = new Map();
  return {
    timers: { set: (fn, ms) => { const id = ++seq; q.set(id, { at: now + ms, fn }); return id; }, clear: (id) => q.delete(id), now: () => now },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        let next = null;
        for (const [id, t] of q) if (t.at <= end && (!next || t.at < next[1].at)) next = [id, t];
        if (!next) break;
        q.delete(next[0]); now = next[1].at; next[1].fn();
        await Promise.resolve();
      }
      now = end; await Promise.resolve();
    },
  };
}
// Qo'lda boshqariladigan manba
function src() {
  const s = { fix: null, err: null, stopped: false };
  s.start = (onFix, onErr) => { s.fix = onFix; s.err = onErr; return () => { s.stopped = true; }; };
  return s;
}
const P = (acc, extra = {}) => ({ lat: 41.0, lng: 71.2, accuracy: acc, ...extra });
const settle = (p) => { let v = { state: 'pending' }; p.then((r) => { v = { state: 'ok', r }; }, (e) => { v = { state: 'err', e }; }); return () => v; };

let n = 0;
const test = async (name, fn) => { await fn(); n += 1; console.log('  ✓', name); };

await test('aniq GPS (≤30 m) — darhol, manbalar to\'xtatiladi', async () => {
  const c = clock(); const a = src(); const b = src();
  const st = settle(collectFix([a.start, b.start], { timers: c.timers }));
  a.fix(P(12)); await c.advance(0);
  assert.equal(st().state, 'ok'); assert.equal(st().r.accuracy, 12);
  assert.ok(a.stopped && b.stopped);
});

await test('bino ichi: faqat tarmoq (150 m) — 4 s da qaytadi (avval 15 s edi)', async () => {
  const c = clock(); const gps = src(); const net = src();
  const st = settle(collectFix([gps.start, net.start], { timers: c.timers }));
  await c.advance(800); net.fix(P(150));
  await c.advance(FIX.SETTLE_ANY_MS - 1); assert.equal(st().state, 'pending');
  await c.advance(1); assert.equal(st().state, 'ok'); assert.equal(st().r.accuracy, 150);
});

await test('60 m — 1,5 s kutib, GPS aniqlashtirsa yaxshirog\'i olinadi', async () => {
  const c = clock(); const gps = src(); const net = src();
  const st = settle(collectFix([gps.start, net.start], { timers: c.timers }));
  net.fix(P(60)); await c.advance(700); gps.fix(P(35)); await c.advance(799);
  assert.equal(st().state, 'pending');
  await c.advance(1); assert.equal(st().r.accuracy, 35);
});

await test('yomonroq keyingi nuqta yaxshisini almashtirmaydi', async () => {
  const c = clock(); const a = src();
  const st = settle(collectFix([a.start], { timers: c.timers }));
  a.fix(P(40)); a.fix(P(300)); await c.advance(FIX.SETTLE_PRECISE_MS);
  assert.equal(st().r.accuracy, 40);
});

await test('ruxsat rad — darhol denied', async () => {
  const c = clock(); const a = src(); const b = src();
  const st = settle(collectFix([a.start, b.start], { timers: c.timers }));
  a.err('denied'); await c.advance(0);
  assert.equal(st().state, 'err'); assert.equal(st().e.code, 'denied');
});

await test('hamma manba xato — kutmasdan unavailable', async () => {
  const c = clock(); const a = src(); const b = src();
  const st = settle(collectFix([a.start, b.start], { timers: c.timers }));
  a.err('other'); await c.advance(0); assert.equal(st().state, 'pending');
  b.err('other'); await c.advance(0); assert.equal(st().e.code, 'unavailable');
});

await test('hech nuqta yo\'q — TOTAL_MS da timeout', async () => {
  const c = clock(); const a = src();
  const st = settle(collectFix([a.start], { timers: c.timers }));
  await c.advance(FIX.TOTAL_MS - 1); assert.equal(st().state, 'pending');
  await c.advance(1); assert.equal(st().e.code, 'timeout');
});

await test('Telegram taxminiy nuqtasi (initial) — manba yaxshilamasa 4 s da o\'shani qaytaradi', async () => {
  const c = clock(); const a = src();
  const st = settle(collectFix([a.start], { timers: c.timers, initial: P(400, { source: 'telegram' }) }));
  await c.advance(FIX.SETTLE_ANY_MS); assert.equal(st().r.accuracy, 400);
});

await test('noto\'g\'ri koordinata (0,0) e\'tiborsiz', async () => {
  const c = clock(); const a = src();
  const st = settle(collectFix([a.start], { timers: c.timers }));
  a.fix({ lat: 0, lng: 0, accuracy: 5 }); await c.advance(0); assert.equal(st().state, 'pending');
});

await test('bekor qilish (signal) — to\'xtaydi', async () => {
  const c = clock(); const a = src(); const ctl = new AbortController();
  const st = settle(collectFix([a.start], { timers: c.timers, signal: ctl.signal }));
  ctl.abort(); await c.advance(0); assert.equal(st().state, 'err'); assert.ok(a.stopped);
});

await test('oxirgi nuqta xotirasi: yosh/aniqlik chegarasi', async () => {
  _resetFixMemory();
  rememberFix(P(30), 1000);
  assert.ok(recentFix(45_000, 80, 20_000));
  assert.equal(recentFix(45_000, 80, 50_000), null);   // eskirgan
  assert.equal(recentFix(45_000, 20, 20_000), null);   // aniqlik yetmaydi
  rememberFix(P(500), 5000);                            // noaniq yangi — aniq eskisini almashtirmaydi
  assert.equal(recentFix(45_000, Infinity, 6000).accuracy, 30);
  rememberFix(P(500), 200_000);                         // 2 daqiqadan keyin — almashtiradi
  assert.equal(recentFix(45_000, Infinity, 200_000).accuracy, 500);
});

console.log(`fixCollector: ${n} ta test o'tdi`);

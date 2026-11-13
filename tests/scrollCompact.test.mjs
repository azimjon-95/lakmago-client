/* Pastki menyu ixchamlashi (Instagram kabi): toza holat mashinasi. npm run test:scroll-compact */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCompactTracker, COMPACT_AFTER, DOWN_DIST, UP_DIST } from '../src/lib/scrollCompact.js';

const run = (ys, max = 5000) => { const t = createCompactTracker(); return ys.map((y) => t(y, max)); };

test('COMPACT_AFTER gacha ixchamlashmaydi; undan o\'tgach DOWN_DIST yig\'ilsa — ixcham', () => {
  const t = createCompactTracker();
  assert.equal(t(0, 5000), false);
  assert.equal(t(30, 5000), false);
  assert.equal(t(COMPACT_AFTER - 2, 5000), false);            // hali chegaradan quyida
  assert.equal(t(COMPACT_AFTER + DOWN_DIST, 5000), true);
});

test('ixchamlashadi: ketma-ket pastga harakat', () => {
  const r = run([0, 20, 50, 80, 110, 140]);
  assert.equal(r[0], false);
  assert.equal(r.at(-1), true);
});

test('yuqoriga UP_DIST dan kam harakat ixchamlikni QAYTARMAYDI; yetarli bo\'lsa — qaytadi', () => {
  const t = createCompactTracker();
  [0, 40, 90, 140, 300].forEach((y) => t(y, 5000));
  assert.equal(t(300 - (UP_DIST - 6), 5000), true);    // sal qaytish — ixcham
  assert.equal(t(300 - (UP_DIST + 4), 5000), false);   // yetarli — kengayadi
});

test('mayda titrash (±1–3 px) holatni o\'zgartirmaydi', () => {
  const t = createCompactTracker();
  [0, 60, 120, 200].forEach((y) => t(y, 5000));        // ixcham
  for (const y of [201, 199, 202, 200, 198, 201]) assert.equal(t(y, 5000), true);
});

test('iOS bounce: oxiridan oshgan/manfiy qiymatlar holatni buzmaydi', () => {
  const t = createCompactTracker();
  [0, 100, 400, 4900, 4999].forEach((y) => t(y, 5000));  // pastda, ixcham
  assert.equal(t(5000, 5000), true);
  assert.equal(t(5060, 5000), true);                      // oshib ketdi (cho'zilish)
  assert.equal(t(5030, 5000), true);                      // qaytish — chegaraga qisqartirilgan, yuqoriga harakat emas
  assert.equal(t(5000, 5000), true);
});

test('sahifa tepasiga qaytilsa har doim to\'liq; qisqa sahifada ixchamlashmaydi', () => {
  const t = createCompactTracker();
  [0, 100, 200, 300].forEach((y) => t(y, 5000));
  assert.equal(t(5, 5000), false);
  assert.deepEqual(run([0, 30, 60, 90, 120], 100), [false, false, false, false, false]);
});

test('o\'rnatuvchi: faqat hujjat/vertikal konteyner, rAF, gorizontal karusel e\'tiborsiz (statik)', () => {
  const src = readFileSync(new URL('../src/lib/scrollCompact.js', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(src, /isVerticalScroller/);
  assert.match(src, /requestAnimationFrame\(flush\)/);
  assert.match(src, /clientHeight >= 200 && el\.scrollHeight - el\.clientHeight > 40/);
});

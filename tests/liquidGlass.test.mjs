/* Pastki menyu: prujina kadrlari (liquidGlass.js) — boshi/oxiri aniq, ortiqcha sakramaydi, cho'zilish chegaralangan. npm run test:liquid-glass */
import test from 'node:test';
import assert from 'node:assert/strict';
import { springKeyframes, supportsRefraction } from '../src/components/BottomNav/liquidGlass.js';

const px = (k) => Number(/translateX\((-?[\d.]+)%\)/.exec(k.transform)[1]);

test('prujina: boshlanishi = from, oxiri = to (aniq o‘rnashadi)', () => {
  for (const [from, to] of [[0, 1], [3, 0], [1, 3], [2, 1]]) {
    const { move } = springKeyframes(from, to);
    assert.ok(Math.abs(px(move[0]) - from * 100) < 1e-6);
    assert.ok(Math.abs(px(move.at(-1)) - to * 100) < 1.5, `${from}→${to}: ${px(move.at(-1))}`);
  }
});

test('prujina: ortiqcha sakramaydi (oshib ketish ≤ 6% masofa) va yo‘nalishi to‘g‘ri', () => {
  const { move } = springKeyframes(0, 3);
  const vals = move.map(px);
  assert.ok(Math.max(...vals) <= 300 + 0.06 * 300);
  assert.ok(vals[5] > vals[1]);
  const back = springKeyframes(3, 0).move.map(px);
  assert.ok(Math.min(...back) >= -0.06 * 300 && back[5] < back[1]);
});

test('cho‘zilish: scaleX 1…1.25, scaleY 0.9…1 oralig‘ida; boshlanishi va oxirida 1', () => {
  const { stretch } = springKeyframes(0, 2);
  for (const k of stretch) {
    const [sx, sy] = /scale\(([\d.]+), ([\d.]+)\)/.exec(k.transform).slice(1).map(Number);
    assert.ok(sx >= 1 && sx <= 1.25 && sy >= 0.9 && sy <= 1.0001);
  }
  assert.ok(Math.max(...stretch.map((k) => Number(/scale\(([\d.]+)/.exec(k.transform)[1]))) > 1.03, 'harakat paytida cho‘ziladi');
  assert.ok(/scale\(1(\.0+)?, /.test(stretch.at(-1).transform) || Number(/scale\(([\d.]+)/.exec(stretch.at(-1).transform)[1]) < 1.01);
});

test('kadrlar: offset 0…1 o‘sib boradi; Node (brauzersiz) muhitda sinish o‘chiq (xatosiz)', () => {
  const { move } = springKeyframes(0, 1);
  assert.equal(move[0].offset, 0); assert.equal(move.at(-1).offset, 1);
  assert.ok(move.every((k, i) => i === 0 || k.offset > move[i - 1].offset));
  assert.equal(supportsRefraction(), false);
});

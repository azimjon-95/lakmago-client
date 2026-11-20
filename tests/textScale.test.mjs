// Android shrift masshtabi (lib/textScale.js) va PostCSS plagini (build/postcssFontScale.mjs)
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { zoomFromProbe } from '../src/lib/textScale.js';
import fontScale from '../build/postcssFontScale.mjs';

let n = 0; const test = async (name, fn) => { await fn(); n += 1; console.log('  ✓', name); };
const run = async (css) => (await postcss([fontScale()]).process(css, { from: undefined })).css;

await test('masshtab yo\'q (100/100) → 1', () => assert.equal(zoomFromProbe(100, 100), 1));
await test('Samsung katta shrift (130/100) → 1.3', () => assert.equal(zoomFromProbe(130, 100), 1.3));
await test('o\'lchov xatosi (101/100) e\'tiborsiz', () => assert.equal(zoomFromProbe(101, 100), 1));
await test('aqlga sig\'maydigan qiymat (400/100, NaN) → 1', () => { assert.equal(zoomFromProbe(400, 100), 1); assert.equal(zoomFromProbe(NaN, 100), 1); });
await test('plagin: font-size px → calc(/ var(--tz,1))', async () => assert.equal(await run('a{font-size:14px}'), 'a{font-size:calc(14px / var(--tz, 1))}'));
await test('plagin: clamp(px, vw, px) butunlay o\'raladi', async () => assert.match(await run('a{font-size:clamp(12px,3vw,14px)}'), /calc\(clamp\(12px,3vw,14px\) \/ var\(--tz, 1\)\)/));
await test('plagin: em/%/inherit/var tegilmaydi (ikki marta o\'ralmaydi)', async () => {
  for (const v of ['1.2em', '90%', 'inherit', 'var(--x)']) assert.equal(await run(`a{font-size:${v}}`), `a{font-size:${v}}`);
  const once = await run('a{font-size:14px}'); assert.equal(await run(once), once);
});
console.log(`textScale: ${n} ta test o'tdi`);

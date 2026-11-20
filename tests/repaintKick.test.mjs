import assert from 'node:assert/strict';
import { kickRepaint, KICK_DELAYS } from '../src/lib/repaintKick.js';
let n = 0; const test = (name, fn) => { fn(); n += 1; console.log('  ✓', name); };
function env({ scrollY = 300, scrollH = 3000, inner = 800, scrollers = [] } = {}) {
  const calls = []; const q = [];
  const win = { scrollY, innerHeight: inner, scrollTo: (x, y) => calls.push(y), getComputedStyle: (el) => ({ overflowX: el.ox }) };
  const doc = { documentElement: { scrollTop: scrollY, scrollHeight: scrollH }, querySelectorAll: () => ({ forEach: (f) => scrollers.forEach(f) }) };
  return { calls, q, e: { win, doc, raf: (f) => q.push(f) }, flush() { while (q.length) q.shift()(); } };
}
test('1 px siljitadi va aynan avvalgi joyga qaytaradi', () => { const t = env(); kickRepaint(t.e); t.flush(); assert.deepEqual(t.calls, [301, 300]); });
test('skroll qilinmaydigan qisqa sahifada hujjat siljitilmaydi', () => { const t = env({ scrollH: 801 }); kickRepaint(t.e); t.flush(); assert.deepEqual(t.calls, []); });
test('gorizontal skroller: will-change vaqtincha beriladi va olinadi, scrollLeft tegilmaydi', () => {
  const el = { ox: 'auto', scrollWidth: 900, clientWidth: 300, style: {}, scrollLeft: 120 };
  const t = env({ scrollers: [el] }); kickRepaint(t.e);
  assert.equal(el.style.willChange, 'transform'); t.flush(); assert.equal(el.style.willChange, ''); assert.equal(el.scrollLeft, 120);
});
test('sig\'adigan yoki overflow-x yo\'q element e\'tiborsiz', () => {
  const a = { ox: 'auto', scrollWidth: 300, clientWidth: 300, style: {} }; const b = { ox: 'visible', scrollWidth: 900, clientWidth: 300, style: {} };
  const t = env({ scrollers: [a, b] }); kickRepaint(t.e); assert.equal(a.style.willChange, undefined); assert.equal(b.style.willChange, undefined);
});
test('xato ichida ham yiqilmaydi', () => { kickRepaint({ win: { get scrollY() { throw new Error('x'); } }, doc: {}, raf() {} }); });
test('turtki kechikishlari: darhol + lazy/rasm kechiksa ham', () => { assert.ok(KICK_DELAYS[0] === 0 && KICK_DELAYS.at(-1) >= 1000); });
console.log(`repaintKick: ${n} ta test o'tdi`);

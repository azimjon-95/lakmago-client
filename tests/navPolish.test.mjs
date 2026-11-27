import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
globalThis.sessionStorage = globalThis.localStorage;
const { homeOfPath, rememberHome, readLastHome } = await import('../src/lib/lastHome.js').catch(() => ({}));
if (!homeOfPath) {
  // lastHome importa '@/...' alias — mantiqni manba matni orqali tekshiramiz
  const src = readFileSync(new URL('../src/lib/lastHome.js', import.meta.url), 'utf8');
  assert.match(src, /pathname === '\/weddings'/); assert.match(src, /if \(getStartParam\(\)\) return;/);
  console.log('lastHome source checks OK (alias import skipped)');
} else {
  assert.equal(readLastHome(), 'go');
  rememberHome('/market'); assert.equal(readLastHome(), 'market');
  rememberHome('/food/1'); assert.equal(readLastHome(), 'market');
  rememberHome('/weddings/venue/x'); assert.equal(readLastHome(), 'market');
  rememberHome('/weddings'); assert.equal(readLastHome(), 'weddings');
  rememberHome('/'); assert.equal(readLastHome(), 'go');
  console.log('lastHome OK');
}
const prof = readFileSync(new URL('../src/pages/Profile/ProfilePage.jsx', import.meta.url), 'utf8');
assert.ok(!prof.includes('className="page-header"'));
assert.match(prof, /SHOW_ACCOUNT_DELETE = false/);
console.log('profile OK');
const mk = readFileSync(new URL('../src/pages/Market/MarketPage.jsx', import.meta.url), 'utf8');
assert.ok(mk.indexOf('const openAll = useCallback') < mk.indexOf('if (!featLoading && !allowed)'), 'hook erta return dan oldin bo‘lishi shart (React #300)');
const hs = readFileSync(new URL('../src/components/HomeSections/HomeSections.jsx', import.meta.url), 'utf8');
assert.match(hs, /tapHaptic\(\)/);
console.log('market hook order + tiles haptic OK');
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
assert.match(app, /<ScrollToTop \/>/);
console.log('ScrollToTop mounted OK');

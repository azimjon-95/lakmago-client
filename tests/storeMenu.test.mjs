/* Katta do'kon menyusi (2000+ mahsulot): sahifa do'konda butun ro'yxatni so'ramasligi, bo'limlar sahifa-sahifa yuklanishi (statik). npm run test:store-menu */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const noComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('sahifa: restoran dishes faqat do\'kon BO\'LMAGANDA so\'raladi; do\'konda indeks + bo\'lim komponenti', () => {
  const page = noComments(src('src/pages/Restaurant/RestaurantPage.jsx'));
  assert.match(page, /useDishes\(restaurant && !isStore \? id : ''\)/);
  assert.match(page, /useStoreMenuIndex\(id, isStore\)/);
  assert.match(page, /<StoreMenuSection/);
  // ulashilgan mahsulot — butun ro'yxatsiz, bittalab
  assert.match(page, /api\.getDish\(targetId\)/);
});

test('prefetch: do\'konda minglab mahsulot oldindan yuklanmaydi (faqat bo\'limlar ro\'yxati)', () => {
  const q = noComments(src('src/hooks/queries.js'));
  const fn = q.slice(q.indexOf('export function usePrefetchRestaurant'));
  assert.match(fn, /isStoreRestaurant\(r\)/);
  assert.match(fn, /api\.getMenuIndex/);
  assert.ok(fn.indexOf('getMenuIndex') < fn.indexOf('api.getDishes'), 'do\'kon tarmog\'i getDishes dan oldin');
});

test('bo\'lim komponenti: kursor-sahifa, skeleton, xatoda qayta urinish, takrorsiz (id)', () => {
  const c = noComments(src('src/components/RestaurantPage/StoreMenuSection.jsx'));
  assert.match(c, /useStoreMenuSection\(restaurantId, sectionKey, near\)/);   // ekranga yaqinlashguncha so'rov yo'q
  assert.match(c, /IntersectionObserver/);
  assert.match(c, /rest-row__sk/);
  assert.match(c, /Qayta urinish/);
  assert.match(c, /seen\.has\(id\)/);
  const hook = noComments(src('src/hooks/queries.js'));
  assert.match(hook, /getNextPageParam: \(last\) => \(last\?\.hasMore && last\?\.nextCursor \? last\.nextCursor : undefined\)/);
  assert.match(src('src/api/index.js'), /menu\/items\?/);
});

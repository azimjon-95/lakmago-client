/* "Orqaga" qoidasi (src/lib/backRoute.js): bo'limlar, havola orqali kirish, do'kon/restoran. npm run test:backroute */
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveBack, homeOf } from '../src/lib/backRoute.js';
import { isStoreRestaurant } from '../src/lib/storeKind.js';

const R = (pathname, prev = null, section = 'go') => resolveBack({ pathname, prev, section });

test('bosh sahifa — yopish', () => {
  assert.deepEqual(R('/'), { action: 'close' });
});

test('Market → Lokma Go: har doim `/`, bo‘lim go ga o‘tadi (bosh sahifa qaytib Marketga sakramasin)', () => {
  assert.deepEqual(R('/market', '/', 'market'), { action: 'history', section: 'go' });           // Go dan kirgan
  assert.deepEqual(R('/market', null, 'market'), { action: 'replace', to: '/', section: 'go' }); // birinchi ochilgan / havola
  assert.deepEqual(R('/market', '/orders', 'market'), { action: 'replace', to: '/', section: 'go' }); // menyudan kelgan
});

test('To‘yxonalar → Lokma Go (ichki sahifa ham)', () => {
  assert.deepEqual(R('/weddings', '/', 'go'), { action: 'history', section: 'go' });
  assert.deepEqual(R('/weddings', '/market', 'market'), { action: 'replace', to: '/', section: 'go' });
  assert.deepEqual(R('/weddings/venue/gulshan', null), { action: 'replace', to: '/', section: 'go' });
});

test('Market ichidagi barcha mahsulotlar → /market', () => {
  assert.deepEqual(R('/market/products', '/market', 'market'), { action: 'history', section: 'market' });
  assert.deepEqual(R('/market/products', null, 'market'), { action: 'replace', to: '/market', section: 'market' });
});

test('DO‘KON sahifasi: havola orqali kirilgan (prev yo‘q) → Market bosh sahifasi', () => {
  assert.deepEqual(R('/restaurant/abc', null, 'market'), { action: 'replace', to: '/market' });
});

test('RESTORAN sahifasi: havola orqali kirilgan → Lokma Go bosh sahifasi', () => {
  assert.deepEqual(R('/restaurant/abc', null, 'go'), { action: 'replace', to: '/' });
});

test('Restoran/do‘kon: ro‘yxat sahifasidan kelingan → tarix bo‘yicha orqaga', () => {
  for (const prev of ['/', '/market', '/market/products', '/search', '/favorites', '/orders', '/discover/hit']) {
    assert.deepEqual(R('/restaurant/abc', prev, prev.startsWith('/market') ? 'market' : 'go'), { action: 'history' }, prev);
  }
});

test('Restoran/do‘kon: bron/taom/savat tarixi chalkashmasin → bo‘lim bosh sahifasi', () => {
  assert.deepEqual(R('/restaurant/abc', '/restaurant/abc/reserve', 'go'), { action: 'replace', to: '/' });
  assert.deepEqual(R('/restaurant/abc', '/food/x', 'market'), { action: 'replace', to: '/market' });
  assert.deepEqual(R('/restaurant/abc', '/cart', 'market'), { action: 'replace', to: '/market' });
});

test('Bron sahifasi → shu restoran', () => {
  assert.deepEqual(R('/restaurant/abc/reserve', '/restaurant/abc'), { action: 'history', section: undefined });
  assert.deepEqual(R('/restaurant/abc/reserve', null), { action: 'replace', to: '/restaurant/abc', section: undefined });
});

test('Boshqa sahifalar: tarix bo‘lsa orqaga; yo‘q bo‘lsa o‘z bo‘limining bosh sahifasi — hech qachon yopmaydi', () => {
  assert.deepEqual(R('/cart', '/market', 'market'), { action: 'history' });
  assert.deepEqual(R('/cart', null, 'market'), { action: 'replace', to: '/market' });
  assert.deepEqual(R('/food/x', null, 'go'), { action: 'replace', to: '/' });
  assert.deepEqual(R('/orders', null, 'go'), { action: 'replace', to: '/' });
});

test('homeOf va do‘kon aniqlash', () => {
  assert.equal(homeOf('market'), '/market');
  assert.equal(homeOf('go'), '/');
  assert.equal(homeOf(undefined), '/');
  assert.equal(isStoreRestaurant({ kind: 'shop' }), true);
  assert.equal(isStoreRestaurant({ isStore: true }), true);
  assert.equal(isStoreRestaurant({ category: 'magazin_oziq' }), true);
  assert.equal(isStoreRestaurant({ kind: 'restaurant', category: 'osh' }), false);
  assert.equal(isStoreRestaurant(undefined), false);
});

/* ── Simlar (statik): hamma joy yagona qoidaga ulangan ── */
import { readFileSync } from 'node:fs';
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('Telegram "Назад" yagona qoida (useBack) orqali ishlaydi; navigate(-1) to‘g‘ridan-to‘g‘ri emas', () => {
  const h = src('src/hooks/useTelegramBack.js').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(h.includes('useBack()') && h.includes('useTrackTrail()'));
  assert.ok(!h.includes('navigate(-1)'), 'eski navigate(-1) qolgan');
  const b = src('src/hooks/useBack.js');
  assert.ok(b.includes('resolveBack(') && b.includes('window.history.state?.idx') && b.includes('setSection(r.section)'));
});

test('Restoran/do‘kon sahifasi: pastki menyu, bo‘lim do‘kon turiga qarab, orqaga o‘qi yagona qoida', () => {
  const p = src('src/pages/Restaurant/RestaurantPage.jsx');
  assert.ok(p.includes("<BottomNav />") && p.includes("import { BottomNav }"));
  assert.ok(p.includes('useSyncSection(restaurant ? isStore : undefined)') && p.includes('isStoreRestaurant(restaurant)'));
  assert.ok(/onClick=\{goBack\}[^>]*rest-banner__btn--back/.test(p) && !/navigate\('\/'\)\} className="rest-banner__btn--back/.test(p));
});

test('Orqaga o‘qlari tarixsiz (havola) ochilganda ham ishlaydi: navigate(-1) o‘rniga useBack', () => {
  for (const f of ['src/pages/Food/FoodPage.jsx', 'src/pages/OrderTrack/OrderTrackPage.jsx', 'src/pages/Favorites/FavoritesPage.jsx',
    'src/pages/Market/MarketProductsPage.jsx', 'src/pages/Cart/CartPage.jsx', 'src/pages/Reservation/MyReservationsPage.jsx']) {
    const s = src(f);
    assert.ok(s.includes('useBack()') && s.includes('onClick={goBack}'), f);
    assert.ok(!s.includes('onClick={() => navigate(-1)}'), `${f}: eski o'q qolgan`);
  }
});

/* Restoran/do'kon sahifasi — yagona dizayn: sof yordamchilar + simlar (statik). npm run test:restaurant */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { monogram, nameFontSize, sectionIcon, startsWithEmoji } from '../src/lib/restaurantUi.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const noComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

test('monogramma: har restoran o\'z nomining bosh harflari', () => {
  assert.equal(monogram('Ziynat Restaurant'), 'ZR');
  assert.equal(monogram('Tutti'), 'TU');
  assert.equal(monogram('Samarqand Milliy Taomlar Markazi'), 'SM');
  assert.equal(monogram("O'zbegim"), 'O\'');
  assert.equal(monogram('  '), '🍽');
  assert.equal(monogram(undefined), '🍽');
  assert.equal(monogram('x'), 'X');
});

test('nom shrifti: uzun nom kichikroq, hammasi 18–26 px oralig\'ida', () => {
  assert.equal(nameFontSize('Tutti'), 26);
  assert.equal(nameFontSize('Ziynat Restaurant'), 23);
  assert.equal(nameFontSize('Samarqand Milliy Taomlar'), 20);
  assert.equal(nameFontSize('Samarqand Milliy Taomlar Markazi'), 18);
  assert.ok(nameFontSize('') >= 18 && nameFontSize('x'.repeat(200)) >= 18);
});

test('bo\'lim ikonkasi nomdan: shashlik, sho\'rva, salat, milliy, ichimlik, non, shirinlik, burger; boshqa — umumiy', () => {
  assert.equal(sectionIcon('Shashlik'), 'skewer');
  assert.equal(sectionIcon("Sho'rva"), 'soup');
  assert.equal(sectionIcon('Sho‘rvalar'), 'soup');   // typografik apostrof ham
  assert.equal(sectionIcon('Salatlar'), 'leaf');
  assert.equal(sectionIcon('Milliy taom'), 'bowl');
  assert.equal(sectionIcon('Ichimlik'), 'cup');
  assert.equal(sectionIcon('Nonlar'), 'bread');
  assert.equal(sectionIcon('Shirinlik'), 'cake');
  assert.equal(sectionIcon('Burger'), 'burger');
  assert.equal(sectionIcon('Gazaklar'), 'utensils');
  assert.equal(sectionIcon('Chegirmalar', 'sale'), 'percent');
  assert.equal(sectionIcon('Sharhlar', 'reviews'), 'star');
  assert.equal(sectionIcon(undefined), 'utensils');
});

test('emoji bilan boshlangan nom (do\'kon bo\'limi) — ikonka qo\'yilmaydi', () => {
  assert.equal(startsWithEmoji('🥛 Sut mahsulotlari'), true);
  assert.equal(startsWithEmoji('🍎 Mevalar'), true);
  assert.equal(startsWithEmoji('Shashlik'), false);
  assert.equal(startsWithEmoji(''), false);
});

test('sahifa: yagona dizayn komponentlari ulangan; gridLayout (restoranlar orasida nomuvofiqlik) yo\'q', () => {
  const p = src('src/pages/Restaurant/RestaurantPage.jsx');
  for (const c of ['<RestaurantHero', '<RestaurantIdentity', '<RestaurantStats', '<ReserveBanner', '<SectionChips']) assert.ok(p.includes(c), c);
  assert.ok(!p.includes('gridLayout'));
  assert.ok(p.includes('const [expanded, setExpanded] = useState({})') && p.includes('defaultExpanded') && p.includes('toggleSection'));
  assert.ok(p.includes('const canReserve = restaurant.reservationEnabled !== false && !isStore'));
  assert.ok(p.includes('showFav') && p.includes('showCurrency') && p.includes('photoHeight={100}'));
});

test('nom har restoranning O\'ZIDAN olinadi — komponentlarda qattiq yozilgan restoran nomi yo\'q', () => {
  const header = src('src/components/RestaurantPage/RestaurantHeader.jsx');
  assert.ok(header.includes('{restaurant.name}'));
  for (const f of ['RestaurantHeader.jsx', 'SectionChips.jsx']) assert.ok(!/ziynat/i.test(noComments(src(`src/components/RestaurantPage/${f}`))), f);
});

test('stol bron banneri: foydalanuvchi rasmi (webp + png zaxira) mavjud', () => {
  assert.ok(existsSync(new URL('../public/restaurant/reserve-table.webp', import.meta.url)));
  assert.ok(existsSync(new URL('../public/restaurant/reserve-table.png', import.meta.url)));
  const h = src('src/components/RestaurantPage/RestaurantHeader.jsx');
  assert.ok(h.includes('/restaurant/reserve-table.webp') && h.includes('/restaurant/reserve-table.png'));
});

test('ranglar bo\'limga qarab: Go to\'q sariq (--brand), Market yashil; faol chip va "+" shu rangda', () => {
  const css = noComments(src('src/components/RestaurantPage/RestaurantHeader.css'));
  assert.ok(css.includes('--rp-accent: var(--brand'));
  assert.ok(/:root\[data-section='market'\] \.restaurant \{[^}]*--rp-accent: #1F9D55/.test(css));
  assert.ok(/\.rp-chip\.is-active \{[^}]*var\(--rp-accent\)/.test(css));
  assert.ok(/\.rp-sheet \{[^}]*margin-top: -28px/.test(css));
  const page = noComments(src('src/pages/Restaurant/Restaurant.css'));
  assert.ok(/\.restaurant \.dscard__add \{[^}]*var\(--rp-accent/.test(page) && page.includes('.restaurant .dscard__fav'));
});

test('umumiy DishScrollCard: yangi proplar ixtiyoriy (standart xatti-harakat o\'zgarmaydi)', () => {
  const c = src('src/components/DishScrollCard.jsx');
  assert.ok(c.includes('photoHeight = 112') && c.includes('showFav = false') && c.includes('showCurrency = false'));
});

test('tarjimalar: yangi kalitlar uz/uzc/ru uchun', () => {
  const tr = src('src/i18n/translations.js');
  for (const k of ['restOpenNow', 'restClosedNow', 'restOffToday', 'restDelivery', 'restRating', 'restCollapse', 'restVerified', 'restMore']) {
    assert.equal((tr.match(new RegExp(`${k}:`, 'g')) || []).length, 3, k);
  }
});

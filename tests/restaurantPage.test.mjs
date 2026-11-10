/* Restoran/do'kon sahifasi — yagona dizayn: sof yordamchilar + simlar (statik). npm run test:restaurant */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { monogram, brandHex, brandVars, sectionIcon, startsWithEmoji } from '../src/lib/restaurantUi.js';

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

test('brend rangi: faqat #RRGGBB; o\'zgaruvchilar JS da hisoblanadi (color-mix kerak emas)', () => {
  assert.equal(brandHex('#B8341E'), '#B8341E');
  assert.equal(brandHex(' #17803f '), '#17803f');
  for (const bad of ['red', '#fff', '#GGGGGG', '', undefined, null, 'javascript:alert(1)', '#B8341E;x']) assert.equal(brandHex(bad), '', String(bad));
  assert.deepEqual(brandVars('nope'), {});
  const v = brandVars('#B8341E');
  assert.equal(v['--rp-accent'], '#B8341E');
  assert.equal(v['--rp-accent-rgb'], '184, 52, 30');
  assert.equal(v['--rp-accent-dark'], 'rgb(107, 30, 17)');   // 58%
  assert.equal(v['--rp-accent-deep'], 'rgb(74, 21, 12)');    // 40%
  assert.equal(v['--rp-accent-soft'], 'rgb(246, 229, 226)'); // 13% + oq
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
  assert.ok(p.includes('style={brandVars(restaurant.brandColor)}') && p.includes('restaurant-page'));
  // statistika HAR DOIM 4 ta (ma'lumot yo'q bo'lsa xiralashadi)
  assert.equal((p.match(/key: '(time|rating|route|info)'/g) || []).length, 4);
  assert.ok(p.includes('showFav') && p.includes('showCurrency') && p.includes('photoAspect="1 / 0.85"') && p.includes("addLabel={t('addToCart')}"));
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

test('ТЗ qiymatlari: fluid clamp() tokenlari, 4 teng ustun, bron 76–90, chip 44–50, kenglik cheklovi, safe-area/a11y', () => {
  const css = noComments(src('src/components/RestaurantPage/RestaurantHeader.css'));
  const has = (s) => assert.ok(css.includes(s), s);
  has('--rp-accent: #17803F');                                   // standart yashil (ZIYNAT eталon); brendniki — brandVars
  has('--rp-pad: clamp(14px, 4vw, 24px)'); has('--rp-hero-h: clamp(190px, 52vw, 230px)');
  has('width: clamp(72px, 21vw, 88px); aspect-ratio: 1 / 1');   // logotip
  has('font-size: clamp(23px, 6.6vw, 27px)');                    // nom 23–27
  has('font-size: clamp(14px, 3.9vw, 16px)');                    // tur 14–16
  has('grid-template-columns: repeat(4, minmax(0, 1fr))');       // statistika: 4 teng ustun
  has('width: clamp(52px, 14.5vw, 64px)');                       // ikonka doirasi 52–64
  has('min-height: clamp(76px, 21vw, 90px)');                    // bron banneri 76–90
  has('aspect-ratio: 640 / 413');                                // stol rasmi deformatsiyalanmaydi
  has('min-height: clamp(44px, 12vw, 50px)');                    // chip 44–50
  has('scrollbar-width: none');                                  // chip scrollbar yashirin
  has('overflow-x: clip');                                       // gorizontal overflow yo'q
  for (const bp of ['(max-width: 359px)', '(min-width: 431px)', '(min-width: 601px)', '(min-width: 769px)']) has(bp);
  has('prefers-reduced-motion');
  assert.ok(/\.rp-chip\.is-active \{[^}]*var\(--rp-accent-dark\)/.test(css));
  assert.ok(/\.rp-sheet \{[^}]*margin-top: calc\(-1 \* clamp\(22px, 7vw, 30px\)\)/.test(css));
  assert.ok(/\.rp-hbtn \{[^}]*width: 44px; height: 44px/.test(css));    // touch target
  const page = noComments(src('src/pages/Restaurant/Restaurant.css'));
  const pg = (s) => assert.ok(page.includes(s), s);
  pg('grid-auto-columns: calc((100% - var(--rp-gaps) * var(--rp-gap)) / var(--rp-cols))');
  pg('scroll-snap-type: x mandatory'); pg('overscroll-behavior-inline: contain');
  pg('grid-template-rows: auto 1.25em');                         // narxlar bir xil qatorda
  pg('-webkit-line-clamp: 2');                                   // nom maks. 2 qator
  assert.ok(/\.restaurant \.dscard__add \{[^}]*var\(--rp-accent\)/.test(page) && page.includes('.restaurant .dscard__fav'));
  assert.ok(page.includes('inset: -9px'));                       // kichik tugmalar: bosish maydoni ≥44
  assert.ok(/\.rp-sec__all \{[^}]*min-height: 44px/.test(page));
});

test('umumiy DishScrollCard: yangi proplar ixtiyoriy (standart xatti-harakat o\'zgarmaydi)', () => {
  const c = src('src/components/DishScrollCard.jsx');
  assert.ok(c.includes('photoHeight = 112') && c.includes('photoAspect = null') && c.includes('showFav = false') && c.includes('showCurrency = false'));
  const ph = src('src/components/DishPhoto.jsx');
  assert.ok(ph.includes('aspect = null') && ph.includes('aspectRatio: aspect') && ph.includes('objectPosition'));
});

test('tarjimalar: yangi kalitlar uz/uzc/ru uchun', () => {
  const tr = src('src/i18n/translations.js');
  for (const k of ['restOpenNow', 'restClosedNow', 'restOffToday', 'restDelivery', 'restRating', 'restCollapse', 'restVerified', 'restMore', 'restFavAdd', 'restFavRemove', 'restNoRating', 'restNoRoute']) {
    assert.equal((tr.match(new RegExp(`${k}:`, 'g')) || []).length, 3, k);
  }
});

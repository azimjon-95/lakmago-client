/* Market qayta dizayni: banner, do'kon kartasi, saralash tugmasi, savat paneli varianti, sahifa tartibi (Vite SSR). npm run test:market-redesign */
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync, statSync } from 'node:fs';

globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const server = await createServer({ root: process.cwd(), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
let failed = 0;
const check = (name, cond, extra = '') => { console.log((cond ? '  ✓ ' : '  ✗ FAIL: ') + name + (cond ? '' : ` ${extra}`)); if (!cond) failed += 1; };
try {
  const h = React.createElement;
  // Vite SSR tashqi paketlarni Node importi bilan yuklaydi — kontekst bir xil nusxadan bo'lishi uchun shu yo'l bilan
  const { MemoryRouter } = await import('react-router-dom');
  const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
  const { I18nProvider } = await server.ssrLoadModule('/src/i18n/index.jsx');
  const { MarketHero } = await server.ssrLoadModule('/src/components/MarketHero/MarketHero.jsx');
  const { MarketStoreCard } = await server.ssrLoadModule('/src/components/MarketStoreCard/MarketStoreCard.jsx');
  const { MarketStoreSort } = await server.ssrLoadModule('/src/components/MarketStoreSort/MarketStoreSort.jsx');
  const wrap = (el) => renderToString(h(QueryClientProvider, { client: new QueryClient() }, h(MemoryRouter, null, h(I18nProvider, null, el)))).replace(/<!-- -->/g, '');

  let html = wrap(h(MarketHero));
  check('banner: belgi, ikki qatorli sarlavha (sariq urg‘u), 3 afzallik', html.includes('LOKMA MARKET') && html.includes('Do&#x27;kondan uyingizgacha —') && html.includes('mhero__accent') && html.includes('tez va qulay!') && ['Tez yetkazib berish', 'Aksiyalar va chegirmalar', 'Ishonchli do&#x27;konlar'].every((x) => html.includes(x)));
  check('banner: fon va kuryer rasmlari mavjud va yengil', html.includes('/sections/market-courier.webp') && statSync('public/sections/market-courier.webp').size < 70 * 1024 && statSync('public/sections/market-hero-bg.webp').size < 40 * 1024);
  const css = readFileSync('src/components/MarketHero/MarketHero.css', 'utf8');
  check('banner: kuryer o‘ngdan chapga yumshoq yurib kiradi, yozuvlar yumshoq paydo bo‘ladi; harakat kamaytirilsa animatsiyasiz', css.includes('@keyframes mhero-ride-in') && css.includes('@keyframes mhero-in') && css.includes('prefers-reduced-motion'));

  const r = { _id: 's1', name: 'ANOR MARKET', cuisine: 'Oziq-ovqat', isOpen: true, openTime: '00:00', closeTime: '23:59', deliveryMin: 25, deliveryMax: 40, deliveryFee: 0 };
  html = wrap(h(MarketStoreCard, { restaurant: r, recommended: true, distanceKm: 1.24 }));
  check('do‘kon kartasi: nom, tur · masofa, «Tavsiya etamiz», 25–40 daq, Ochiq', html.includes('ANOR MARKET') && html.includes('Oziq-ovqat · 1,2 km') && html.includes('Tavsiya etamiz') && html.includes('25–40') && html.includes('mchip--open'));
  html = wrap(h(MarketStoreCard, { restaurant: { ...r, isOpen: false }, distanceKm: 0.31 }));
  check('yopiq do‘kon: «Yopiq», belgi yo‘q; 300 m', html.includes('mchip--closed') && !html.includes('Tavsiya etamiz') && html.includes('300 m'));
  html = wrap(h(MarketStoreSort, { mode: 'near', onChange() {} }));
  check('saralash tugmasi: «Sizga yaqin do‘konlar»', html.includes('Sizga yaqin do&#x27;konlar') && html.includes('aria-haspopup="dialog"'));

  const cart = readFileSync('src/components/CartBar.jsx', 'utf8');
  check("savat paneli: bitta dizayn barcha bo'limlarda (variant yo'q), ichki tuzilma: belgi+son, ajratgich, summa, strelka", cart.includes('export function CartBar()') && !cart.includes("variant === 'market'") && cart.includes('cart-bar__badge') && cart.includes('cart-bar__div') && cart.includes('className="cart-bar"'));
  const cbCss = readFileSync('src/components/cards/CartBar.css', 'utf8');
  check("savat paneli rangi bo'limga qarab: Market yashil #148A43, Go — brend (to'q sariq); balandlik --cap-h (58 px, scroll'da 46 px — hammasi bir xil)", cbCss.includes(':root[data-section=\'market\'] .cart-bar-wrap') && cbCss.includes('#148A43') && /\.cart-bar \{[^}]*height: var\(--cap-h, 58px\)/.test(cbCss) && !cbCss.includes('cart-bar--market'));
  const page = readFileSync('src/pages/Market/MarketPage.jsx', 'utf8');
  const order = ['<MarketHero />', '<MarketCategories', 'market-stores-head', '<HomeSections', '<MarketStoreCard', '<CartBar />'].map((x) => page.indexOf(x));
  check('sahifa tartibi maketdagidek: banner → kategoriyalar → Do‘konlar + Sizga yaqin → bo‘lim kartalari → do‘konlar → savat', order.every((i, n) => i > 0 && (n === 0 || i > order[n - 1])), JSON.stringify(order));
  check('sarlavhada chap tomondagi kichik savat YO‘Q, faqat o‘ngdagi bezakli savat (yuborilgan rasm, 116 px)', !page.includes('market-header__logo') && (page.match(/market-basket-hero\.webp/g) || []).length === 1 && page.includes('width="116" height="63"') && statSync('public/sections/market-basket-hero.webp').size < 40 * 1024);
  const surf = /market:\s*'(#[0-9a-fA-F]{6})'/.exec(readFileSync('src/lib/telegram.js', 'utf8').split('SECTION_SURFACE =')[1])?.[1];
  const mcss = readFileSync('src/pages/Market/Market.css', 'utf8');
  const hdr = /\.market-header\s*\{[^}]*?background:\s*(#[0-9a-fA-F]{6})/s.exec(mcss)?.[1];
  const mc = readFileSync('src/pages/Market/Market.css', 'utf8');
  const px = (re) => Number((re.exec(mc) || [])[1]);
  check("Do'konlar qatori ixcham: tepa oraliq ≤ 10 px, sarlavha ≤ 18 px, bo'lim kartalari balandligi ≤ 92 px (bo'sh joy kam)", px(/\.market-stores-head\s*\{[^}]*padding:\s*(\d+)px/) <= 10 && px(/\.market-stores-head h2\s*\{[^}]*font-size:\s*(\d+)px/) <= 18 && Number((/\.home-section-tile\s*\{[^}]*?min-height:\s*(\d+)px/.exec(readFileSync('src/components/HomeSections/HomeSections.css', 'utf8')) || [])[1]) <= 92);
  check("savat tepadan pastroqda joylashgan (top: 8px) va oq varaq pastki qismini yopadi", /\.market-header__deco\s*\{[^}]*top:\s*8px/.test(mc));
  check('Telegram sarlavhasi va sahifa sarlavhasi rangi AYNAN bir xil (maket: #016029), gradient yo‘q', Boolean(surf) && surf.toLowerCase() === '#016029' && hdr?.toLowerCase() === surf.toLowerCase() && !/\.market-header\s*\{[^}]*gradient/s.test(mcss), `${surf} / ${hdr}`);
  check("kuryer O'NGDAN chapga yuradi: boshlanish o'ng tashqarida (translateX(130%)), tezlik chiziqlari orqasida", css.includes('transform: translateX(130%)') && css.includes('0% { transform: translateX(130%)') && !css.includes('translateX(-120%)'));
  check('sarlavhada katta bezakli savat (avvalgi bannerdagi)', page.includes('market-header__deco') && page.includes('/sections/market-basket-hero.webp'));
  check('joylashuv faqat «Sizga yaqin» tanlanganda so‘raladi (ochilishda emas)', page.includes("if (mode !== 'near' || origin) return;") && !/useEffect\([^)]*getCurrentPosition/.test(page));
  const { translations: T } = await server.ssrLoadModule('/src/i18n/translations.js');
  const n = [T.uz, T.uzc, T.ru].map((o) => Object.keys(o).length);
  check(`tarjimalar uch tilda teng (${n.join('/')})`, n[0] === n[1] && n[1] === n[2] && ['marketHeroTop', 'marketFeatFast', 'storeSortNear', 'marketRecommended', 'marketOtherCats'].every((k) => T.uz[k] && T.uzc[k] && T.ru[k]));
} finally { await server.close(); }
if (failed) { console.log(`\n${failed} ta xato`); process.exit(1); }
console.log('\nHammasi o‘tdi');

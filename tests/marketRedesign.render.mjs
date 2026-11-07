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
  check('banner: kuryer chapdan yumshoq kirib keladi, yozuvlar yumshoq paydo bo‘ladi; harakat kamaytirilsa animatsiyasiz', css.includes('@keyframes mhero-ride-in') && css.includes('@keyframes mhero-in') && css.includes('prefers-reduced-motion'));

  const r = { _id: 's1', name: 'ANOR MARKET', cuisine: 'Oziq-ovqat', isOpen: true, openTime: '00:00', closeTime: '23:59', deliveryMin: 25, deliveryMax: 40, deliveryFee: 0 };
  html = wrap(h(MarketStoreCard, { restaurant: r, recommended: true, distanceKm: 1.24 }));
  check('do‘kon kartasi: nom, tur · masofa, «Tavsiya etamiz», 25–40 daq, Ochiq', html.includes('ANOR MARKET') && html.includes('Oziq-ovqat · 1,2 km') && html.includes('Tavsiya etamiz') && html.includes('25–40') && html.includes('mchip--open'));
  html = wrap(h(MarketStoreCard, { restaurant: { ...r, isOpen: false }, distanceKm: 0.31 }));
  check('yopiq do‘kon: «Yopiq», belgi yo‘q; 300 m', html.includes('mchip--closed') && !html.includes('Tavsiya etamiz') && html.includes('300 m'));
  html = wrap(h(MarketStoreSort, { mode: 'near', onChange() {} }));
  check('saralash tugmasi: «Sizga yaqin do‘konlar»', html.includes('Sizga yaqin do&#x27;konlar') && html.includes('aria-haspopup="dialog"'));

  const cart = readFileSync('src/components/CartBar.jsx', 'utf8');
  check('savat paneli: Market varianti (belgi + son, ajratgich, summa, strelka); boshqa bo‘limlar o‘zgarmagan', cart.includes("variant === 'market'") && cart.includes('cart-bar__badge') && cart.includes('className="cart-bar"'));
  const page = readFileSync('src/pages/Market/MarketPage.jsx', 'utf8');
  const order = ['<MarketHero />', '<MarketCategories', 'market-stores-head', '<HomeSections', '<MarketStoreCard', '<CartBar variant="market" />'].map((x) => page.indexOf(x));
  check('sahifa tartibi maketdagidek: banner → kategoriyalar → Do‘konlar + Sizga yaqin → bo‘lim kartalari → do‘konlar → savat', order.every((i, n) => i > 0 && (n === 0 || i > order[n - 1])), JSON.stringify(order));
  check('sarlavhada katta bezakli savat (avvalgi bannerdagi)', page.includes('market-header__deco') && page.includes('/sections/market-basket.webp'));
  check('joylashuv faqat «Sizga yaqin» tanlanganda so‘raladi (ochilishda emas)', page.includes("if (mode !== 'near' || origin) return;") && !/useEffect\([^)]*getCurrentPosition/.test(page));
  const { translations: T } = await server.ssrLoadModule('/src/i18n/translations.js');
  const n = [T.uz, T.uzc, T.ru].map((o) => Object.keys(o).length);
  check(`tarjimalar uch tilda teng (${n.join('/')})`, n[0] === n[1] && n[1] === n[2] && ['marketHeroTop', 'marketFeatFast', 'storeSortNear', 'marketRecommended', 'marketOtherCats'].every((k) => T.uz[k] && T.uzc[k] && T.ru[k]));
} finally { await server.close(); }
if (failed) { console.log(`\n${failed} ta xato`); process.exit(1); }
console.log('\nHammasi o‘tdi');

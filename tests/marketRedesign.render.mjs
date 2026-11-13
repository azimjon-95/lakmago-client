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
  check("savat paneli rangi bo'limga qarab: Market yashil #148A43, Go — brend (to'q sariq); balandlik --cart-h (50 px, scroll'da 40 px)", cbCss.includes(':root[data-section=\'market\'] .cart-bar-wrap') && cbCss.includes('#148A43') && /\.cart-bar \{[^}]*height: var\(--cart-h, 50px\)/.test(cbCss) && !cbCss.includes('cart-bar--market'));
  // /market/products ("Barchasi"): mahsulot oynasi FAQAT tanlangan mahsulot bo'lganda chiziladi (dish=null bo'lsa 'n.id' xatosi)
  const prodPage = readFileSync('src/pages/Market/MarketProductsPage.jsx', 'utf8');
  check("MarketProductsPage: DishModal faqat modalDish bor bo'lganda; yopiq do'kon ogohlantirishi ulangan", /\{modalDish && \(\s*<DishModal dish=\{modalDish\}/.test(prodPage) && !prodPage.includes('onClosedAlert={() => {}}') && prodPage.includes('<ClosedAlert'));
  // "Barchasi" sahifasi: scroll bo'yicha avtomatik yuklash (IntersectionObserver qayta quriladi), pastda skeleton, takrorsiz, xatoda qayta urinish
  check("MarketProductsPage: IntersectionObserver + sahifa yuklangach qayta ulanadi (deps: items.length); oldindan yuklash", prodPage.includes('new IntersectionObserver') && /useNearEnd\(\{[^}]*deps: \[items\.length\]/.test(prodPage) && prodPage.includes("rootMargin: PRELOAD_MARGIN"));
  check("MarketProductsPage: keyingi sahifa yuklanganda pastda skeleton; dastlab skeleton; mahsulotlar takrorlanmaydi", prodPage.includes('isFetchingNextPage && Array.from({ length: MORE_SKELETON })') && prodPage.includes('SKELETON_COUNT') && prodPage.includes('seen.has(id)'));
  check("MarketProductsPage: xatoda qayta urinish (isFetchNextPageError), IntersectionObserver yo'q brauzerda tugma; Home.css import", prodPage.includes('isFetchNextPageError') && prodPage.includes("typeof IntersectionObserver === 'undefined'") && prodPage.includes("import '@/pages/Home/Home.css'"));
  const gridCard = readFileSync('src/components/DishGridCard.jsx', 'utf8');
  check("DishGridCard: photoHeight standart 104 (boshqa sahifalar o'zgarmaydi); sahifada 88 + contain", gridCard.includes('photoHeight = 104') && gridCard.includes("photoFit = 'cover'") && prodPage.includes('photoHeight={88} photoFit="contain"'));
  const mppCss = readFileSync('src/pages/Market/MarketProducts.css', 'utf8');
  check("MarketProducts.css: yopishqoq sarlavha va 2 ustun setka; skeleton umumiy ProductCardSkeleton.css da", /\.mpp-head \{[^}]*position: sticky/.test(mppCss) && mppCss.includes('repeat(2, minmax(0, 1fr))') && readFileSync('src/components/Skeleton/ProductCardSkeleton.css', 'utf8').includes('.pcskel'));
  const tr = readFileSync('src/i18n/translations.js', 'utf8');
  check("marketAllShown — uz/uzc/ru", (tr.match(/marketAllShown:/g) || []).length === 3);
  const mpage = readFileSync('src/pages/Market/MarketPage.jsx', 'utf8');
  // Tanlangan kategoriya: mahsulotlar BARCHA do'konlardan, "Super narxlar" TEPASIDA; slayderda faqat shu kategoriyaning chegirmalilari
  check("MarketPage: market-catprods bo'limi DiscountSlider'dan OLDIN (kategoriya mahsulotlari tepada)", mpage.indexOf('data-testid="market-catprods"') > 0 && mpage.indexOf('data-testid="market-catprods"') < mpage.indexOf('<DiscountSlider'));
  check("MarketPage: kategoriya tanlanganda Super narxlar faqat chegirmalilar (takrorlanmaydi); 'Barchasi'da chegirma + barcha mahsulotlar", mpage.includes("if (category !== 'all') return discShown;"));
  check("MarketPage: tanlangan kategoriya — MarketCatSlider (kalit bo'yicha qayta o'rnatiladi, keyingi sahifa onNeedMore bilan, 'Barchasini ko'rish' → /market/products?category=)", mpage.includes('<MarketCatSlider') && mpage.includes('key={category}') && mpage.includes('onNeedMore=') && mpage.includes('/market/products?category=') && mpage.includes("t('marketViewAll')"));
  const slider = readFileSync('src/components/MarketCatSlider/MarketCatSlider.jsx', 'utf8');
  const sliderCss = readFileSync('src/components/MarketCatSlider/MarketCatSlider.css', 'utf8');
  check("MarketCatSlider: 2 qator × gorizontal ustunlar, ‹ nuqtalar ›, oxirida avtomatik yuklash, skeleton ustunlar, sevimli (yurakcha), chegirma belgisi", /grid-template-rows: repeat\(2, auto\)/.test(sliderCss) && sliderCss.includes('grid-auto-flow: column') && slider.includes('mcs__arrow') && slider.includes('mcs__dots') && slider.includes('NEAR_END_PAGES') && slider.includes('fetchingNext && Array.from') && slider.includes("toggleFavorite('dish'") && slider.includes('discountPercent(dish)'));
  // Sarlavha: uzun nomlar sig'adi, son kesilmaydi, tugma joy yetmasa pastga o'tadi; nom bloki -webkit-box EMAS (ichidagi son alohida qatorga tushardi)
  const cssNoComments = sliderCss.replace(/\/\*[\s\S]*?\*\//g, '');
  const titleBlock = (/\.mcs__title \{[^}]*\}/.exec(cssNoComments) || [''])[0];
  check("MarketCatSlider sarlavhasi: flex-wrap (tugma sig'masa pastga), nom 18 px, nom bloki -webkit-box emas, 3.5em gacha ko'rinadi (son kesilmaydi)", /\.mcs__head \{[^}]*flex-wrap: wrap/.test(cssNoComments) && titleBlock.includes('font-size: 18px') && !titleBlock.includes('-webkit-box') && titleBlock.includes('max-height: 3.5em') && /\.mcs__main \{[^}]*flex: 1 1 178px/.test(cssNoComments));
  // Narx nishoni: "so'm" sig'masa pastki qatorga tushib yashiriladi (yarim kesilmaydi)
  const priceBlock = (/\.mcs-card__price \{[^}]*\}/.exec(cssNoComments) || [''])[0];
  check("MarketCatSlider narx nishoni: flex-wrap + qat'iy balandlik + overflow hidden — 'so'm' sig'masa toza yashiriladi", priceBlock.includes('flex-wrap: wrap') && priceBlock.includes('height: 20px') && priceBlock.includes('overflow: hidden') && slider.includes("<b>{priceText}</b><small>so'm</small>"));
  check("MarketCatSlider: karta bosilsa modal (onOpen), yurakcha va + bosilganda to'xtatiladi (stopPropagation); 3+ ustun ko'rinadi (3.25)", slider.includes('e.stopPropagation(); onToggleFav') && slider.includes('onOpen(dish)') && sliderCss.includes('(100% - 24px) / 3.25'));
  const prodPage2 = readFileSync('src/pages/Market/MarketProductsPage.jsx', 'utf8');
  check("MarketProductsPage: ?category= bilan ochilsa sarlavha — kategoriya nomi", prodPage2.includes('catTitle || t(\'all\')') && prodPage2.includes("params.get('category')"));
  check("marketViewAll — uz/uzc/ru", (readFileSync('src/i18n/translations.js', 'utf8').match(/marketViewAll:/g) || []).length === 3);
  const qhooks = readFileSync('src/hooks/queries.js', 'utf8');
  check("Market kategoriyalari keshi ≤ 60 soniya (admin faol/nofaol tez ko'rinadi)", /queryKey: \['market', 'categories'\][\s\S]{0,300}staleTime: 60_000/.test(qhooks));
  // "Rasm yo'q": rasm bo'lmasa yoki yuklanmasa aniq belgi (bo'sh joy emas); DishPhoto va slayder kartalari shuni ishlatadi
  const npl = readFileSync('src/components/ProductImage/NoImage.jsx', 'utf8');
  check("NoImage: 'Rasm yo'q' belgisi (aria-label, data-testid), kamera ikonkasi", npl.includes("Rasm yo'q") && npl.includes('data-testid="no-image"') && npl.includes('name="camera"'));
  const pimg = readFileSync('src/components/ProductImage/ProductImg.jsx', 'utf8');
  check("ProductImg: yuklanmasa (onError) yoki manzil bo'sh bo'lsa NoImage", pimg.includes('onError={() => setFailed(true)}') && pimg.includes('if (!src || failed) return <NoImage'));
  const dph = readFileSync('src/components/DishPhoto.jsx', 'utf8');
  check("DishPhoto: haqiqiy rasm ProductImg orqali, rasm yo'q bo'lsa NoImage (eski tint-ikonka olib tashlangan)", dph.includes('<ProductImg') === false || dph.includes('ImgOrNoImage') && dph.includes('<NoImage compact') && !/return \(\s*<div style=\{\{ \.\.\.sz, borderRadius: radius, background: dish\.tint, display: 'flex'/.test(dph.split('eski ko\'rinish')[0]));
  const mcs = readFileSync('src/components/MarketCatSlider/MarketCatSlider.jsx', 'utf8');
  check("MarketCatSlider kartasi: rasm ProductImg orqali (to'g'ridan-to'g'ri <img> yo'q)", mcs.includes('<ProductImg src=') && !mcs.includes("? <img src={optimizeCloudinary(real, 240, 'contain')}"));
  // server vaqti kelmasa/yaroqsiz bo'lsa client soatiga tayanadi (NaN → yaroqsiz sana → Intl yiqiladi)
  const openSt = readFileSync('src/hooks/useOpenStatus.js', 'utf8');
  check("useOpenStatus: serverOffset yaroqsiz (NaN) bo'lsa 0", openSt.includes('Number.isFinite(offset) ? offset : 0'));
  const page = readFileSync('src/pages/Market/MarketPage.jsx', 'utf8');
  const order = ['<MarketHero />', '<HomeSections', '<MarketCategories', '<DiscountSlider', 'market-stores-head', '<MarketStoreCard', '<CartBar />'].map((x) => page.indexOf(x));
  check('sahifa tartibi: banner → Lokma kartalari → kategoriyalar → chegirmalar → do‘konlar → savat', order.every((i, n) => i > 0 && (n === 0 || i > order[n - 1])), JSON.stringify(order));
  check('sarlavhada chap tomondagi kichik savat YO‘Q, faqat o‘ngdagi bezakli savat (yuborilgan rasm, 116 px)', !page.includes('market-header__logo') && (page.match(/market-basket-hero\.webp/g) || []).length === 1 && page.includes('width="116" height="63"') && statSync('public/sections/market-basket-hero.webp').size < 40 * 1024);
  // Skrolda yashil "chaqnash" bo'lmasin: WebView orqa foni har doim sahifa foni (oq), sarlavha esa bo'lim rangida
  const tgSrc = readFileSync('src/lib/telegram.js', 'utf8');
  check("Telegram: setBackgroundColor — har doim PAGE_BACKGROUND (oq), bo'lim rangi emas; setHeaderColor — bo'lim rangi", tgSrc.includes("export const PAGE_BACKGROUND = '#FFFFFF'") && tgSrc.includes('tg.setBackgroundColor?.(PAGE_BACKGROUND)') && !tgSrc.includes('tg.setBackgroundColor?.(color)') && tgSrc.includes('tg.setHeaderColor?.(color)'));
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

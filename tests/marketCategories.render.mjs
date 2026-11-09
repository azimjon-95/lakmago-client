/*
 * Market bosh sahifasi kategoriyalari (data/marketHomeCategories.js + components/MarketCategories): 21 kalit va tartibi, nomlar (3 til),
 * rasmlar (yumaloq, kichik, shaffof chekka), yo'q rasmlar ro'yxati, komponent chizilishi, MarketPage ulanishi, tarjimalar.
 * Vite SSR orqali. npm run test:marketcats
 */
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync, readdirSync, statSync } from 'node:fs';

globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const server = await createServer({ root: process.cwd(), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
let failed = 0;
const check = (name, cond, extra = '') => { console.log((cond ? '  ✓ ' : '  ✗ FAIL: ') + name + (cond ? '' : ` ${extra}`)); if (!cond) failed += 1; };

// Foydalanuvchi bergan 21 kalit — AYNAN shu tartibda
const WANTED = 'shaxsiy_gigiyena maishiy_kimyo bolalar_oziq_ovqatlari choy shokolad uy_rozgor_mahsulotlari pechenye konserva_mahsulotlari bolalar_gigiyena konfetlar sut_mahsulotlari shirinliklar gazli_ichimliklar makaron_mahsulotlari chips_snacklar muzqaymoq yangi_meva souslar qahva tozalash_vositalari ichimliklar'.split(' ');
// Rasmi YUBORILMAGAN kalitlar (mijoz yuborganda shu ro'yxat qisqaradi; hozircha emoji doira ko'rinadi)
const NO_IMAGE = ['choy', 'shokolad', 'pechenye', 'konfetlar', 'makaron_mahsulotlari', 'chips_snacklar', 'muzqaymoq', 'yangi_meva', 'souslar', 'qahva'];

try {
  const M = await server.ssrLoadModule('/src/data/marketHomeCategories.js');
  const { MarketCategories } = await server.ssrLoadModule('/src/components/MarketCategories/MarketCategories.jsx');
  const h = React.createElement;
  const clean = (x) => x.replace(/<!-- -->/g, '');

  check('21 kalit, AYNAN berilgan tartibda, takrorsiz', JSON.stringify(M.MARKET_HOME_KEYS) === JSON.stringify(WANTED) && new Set(M.MARKET_HOME_KEYS).size === 21);
  check('har bir kategoriyada 3 tilda nom va emoji bor', M.MARKET_HOME_CATEGORIES.every((c) => c.uz && c.uzc && c.ru && c.emoji));
  check('nomlar tilga qarab: lotin / kirill / ruscha', M.homeCatLabel(M.MARKET_HOME_CATEGORIES[3], 'uz') === 'Choy' && M.homeCatLabel(M.MARKET_HOME_CATEGORIES[3], 'uzc') === 'Чой' && M.homeCatLabel(M.MARKET_HOME_CATEGORIES[3], 'ru') === 'Чай' && M.homeCatLabel(M.MARKET_HOME_CATEGORIES[3], 'xx') === 'Choy');
  check("serverdagi katalogda barcha 21 kalit mavjud (to'g'ri yozilgan)", (() => {
    const src = readFileSync('../lakmago-server/src/constants/catalogCategories.js', 'utf8');
    return WANTED.every((k) => new RegExp(`['"]${k}['"]`).test(src) || k === 'ichimliklar');
  })());

  // Rasmlar
  const missing = M.missingImages();
  check(`rasmi yo'q kalitlar aynan kutilgan 10 ta: ${missing.join(', ')}`, JSON.stringify([...missing].sort()) === JSON.stringify([...NO_IMAGE].sort()), JSON.stringify(missing));
  check('rasmi bor 11 ta kalitga rasm ulangan (gazli va ichimliklar bitta rasmdan)', WANTED.filter((k) => M.catImage(k)).length === 11 && M.catImage('gazli_ichimliklar') && M.catImage('ichimliklar'));
  check('«Hammasi» rasmi bor', Boolean(M.catImage('all')));
  const dir = 'src/assets/market-cats';
  const files = readdirSync(dir).filter((f) => f.endsWith('.webp'));
  check('tayyorlab qo‘yilgan, ro‘yxatda yo‘q rasmlar (kolbasa, qog‘oz, guruch, sabzavot, non, ziravor)', ['kolbasa_sosiska', 'qogoz_salfetka', 'guruch_don', 'yangi_sabzavot', 'non_mahsulotlari', 'ziravorlar'].every((k) => files.includes(`${k}.webp`)));
  check('har bir rasm kichik (≤ 30 KB) — telefon uchun yengil', files.every((f) => statSync(`${dir}/${f}`).size <= 30 * 1024), files.filter((f) => statSync(`${dir}/${f}`).size > 30 * 1024).join(','));
  const dims = files.map((f) => { const b = readFileSync(`${dir}/${f}`); const vp8x = b.toString('ascii', 12, 16); return { f, ok: b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP', vp8x, w: vp8x === 'VP8X' ? 1 + b.readUIntLE(24, 3) : null, h: vp8x === 'VP8X' ? 1 + b.readUIntLE(27, 3) : null, alpha: vp8x === 'VP8X' ? Boolean(b[20] & 0x10) : false }; });
  check('hammasi haqiqiy WebP, 160×160, shaffoflik (yumaloq chekka) bilan', dims.every((d) => d.ok && d.w === 160 && d.h === 160 && d.alpha), JSON.stringify(dims.filter((d) => !(d.ok && d.w === 160 && d.alpha))));

  // Komponent
  const row = (p = {}) => clean(renderToString(h(MarketCategories, { value: 'all', onChange() {}, available: null, lang: 'uz', allLabel: 'Hammasi', ariaLabel: 'Mahsulot kategoriyalari', ...p })));
  let html = row();
  check('slayder: «Barchasi» + barcha kategoriyalar (tugmasiz, tasodifiy tartib); «Boshqa» yo‘q', (html.match(/<button/g) || []).length === WANTED.length + 1 && !html.includes('mcat-more') && html.includes('data-testid="mcat-all"') && WANTED.every((k) => html.includes(`data-testid="mcat-${k}"`)));
  check('«Barchasi» tanlangan; qolganlari aria-pressed=false', html.includes('data-testid="mcat-all"') && (html.match(/aria-pressed="true"/g) || []).length === 1);
  check('«Boshqa kategoriyalar» varaq va tugmasi olib tashlangan (slayder)', !html.includes('aria-haspopup="dialog"') && !html.includes('mcat-more'));
  check('rasmi bor kategoriyada <img> (yumaloq 64×64), rasmi yo\'qda emoji', /data-testid="mcat-shaxsiy_gigiyena"[^>]*>(?:(?!<\/button>).)*<img/s.test(html) && /data-testid="mcat-choy"[^>]*>(?:(?!<\/button>).)*mcat__emoji[^>]*>🍵/s.test(html));
  check('rasmlar ekran tashqarisida kechiktirib yuklanadi (lazy) va to‘g‘ri o‘lchamli (CLS yo‘q)', html.includes('loading="lazy"') && html.includes('width="64"') && html.includes('height="64"'));
  html = row({ value: 'konfetlar' });
  check('slayderda har qanday kategoriya tanlansa belgilanadi (aria-pressed)', /aria-pressed="true"[^>]*data-testid="mcat-konfetlar"/.test(html) && (html.match(/<button/g) || []).length === WANTED.length + 1);
  html = row({ available: new Set(['choy', 'konfetlar']) });
  html = row({ available: null });
  check('server eski (available=null) — hech narsa xiralashmaydi', !html.includes('is-empty'));
  html = row({ lang: 'ru' });
  check('ruscha nomlar', html.includes('Чай') && html.includes('Личная гигиена'));
  check('kirill (o‘zbekcha) nomlar', row({ lang: 'uzc' }).includes('Шахсий гигиена'));
  check('ekran o‘qiydigan dasturlar uchun: group + aria-label', html.includes('role="group"') && html.includes('aria-label="Mahsulot kategoriyalari"'));

  // MarketPage ulanishi
  const page = readFileSync('src/pages/Market/MarketPage.jsx', 'utf8');
  check('MarketPage: yangi qator, do‘konlar va mahsulotlar aniq katalog kaliti bo‘yicha', page.includes('<MarketCategories items={catItems} value={category}') && page.includes('productCatalogCategories') && page.includes('catalogCategory: category'));
  check("MarketPage: qator admin ro'yxatidan (catItems.length); mahsulotlar bo'limi HAR DOIM (Barchasi ham); do'konlar filtri saqlanadi", page.includes('{catItems.length > 0 && (\n        <MarketCategories items={catItems}') && page.includes('catalogCategory: category === \'all\' ? undefined : category') && page.includes('!Array.isArray(s.productCatalogCategories) ||'));
  check('MarketPage: tanlangan kategoriya mahsulotlari (slayder) — bo‘sh holat slayder ichida, keyingi sahifa avtomatik (onNeedMore)', page.includes('data-testid="market-catprods"') && page.includes('<MarketCatSlider') && page.includes('onNeedMore=') && readFileSync('src/components/MarketCatSlider/MarketCatSlider.jsx', 'utf8').includes('market-catempty'));
  // API: HAQIQIY chaqiruv (fetch ushlanadi) — parametr to'g'ri funksiyada va boshqa funksiyalar (bosh sahifa lentasi) BUZILMAGAN
  const { api } = await server.ssrLoadModule('/src/api/index.js');
  const urls = [];
  globalThis.fetch = async (u) => { urls.push(String(u)); return new Response(JSON.stringify({ items: [], hasMore: false }), { status: 200, headers: { 'Content-Type': 'application/json' } }); };
  let threw = null;
  try {
    await api.getMarketProducts({ catalogCategory: 'konfetlar', limit: 24 });
    await api.getMarketProducts({ catalogCategory: 'all' });
    await api.getMarketProducts({ category: 'sut', discounted: true });
    await api.getDishesFeed({ category: 'milliy', fair: true, seed: 5 });      // bosh sahifa lentasi — catalogCategory'siz ishlashi SHART
  } catch (e) { threw = e; }
  check("API: getMarketProducts va getDishesFeed xatosiz ishlaydi (ReferenceError yo'q)", threw === null, String(threw));
  check('API: kategoriya ?category=konfetlar bilan yuboriladi; "all" yuborilmaydi; eski ?category=sut o\'zgarmagan', urls[0]?.includes('/market/products') && urls[0].includes('category=konfetlar') && !urls[1].includes('category=') && urls[2].includes('category=sut') && urls[2].includes('discounted=1'), urls.slice(0, 3).join(' | '));
  check('API: bosh sahifa lentasiga catalogCategory QO\'SHILMAGAN', urls[3]?.includes('/dishes') && !urls[3].includes('catalogCategory'), urls[3]);
  const apiSrc = readFileSync('src/api/index.js', 'utf8');
  const feedFn = apiSrc.slice(apiSrc.indexOf('getDishesFeed:'), apiSrc.indexOf('getMarketCategories:'));
  const marketFn = apiSrc.slice(apiSrc.indexOf('getMarketProducts:'), apiSrc.indexOf('// ===== Auth ====='));
  check("kategoriya faqat getMarketProducts ichida (bosh sahifa lentasida YO'Q)", !feedFn.includes('catalogCategory') && marketFn.includes("params.set('category', catalogCategory)"));

  // Tarjimalar
  const { translations: T } = await server.ssrLoadModule('/src/i18n/translations.js');
  const n = [T.uz, T.uzc, T.ru].map((o) => Object.keys(o).length);
  check(`tarjima kalitlari uch tilda teng (${n.join('/')}) va yangi kalitlar bor`, n[0] === n[1] && n[1] === n[2] && ['marketCategoryEmpty', 'marketCategories', 'marketShowMore'].every((k) => T.uz[k] && T.uzc[k] && T.ru[k]));
} finally { await server.close(); }
if (failed) { console.log(`\n${failed} ta xato`); process.exit(1); }
console.log('\nHammasi o‘tdi');

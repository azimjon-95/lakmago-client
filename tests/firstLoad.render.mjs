/*
 * RESTORAN / DO'KON SAHIFASI — BIRINCHI KIRISH TEZLIGI (2026-11-23).
 *
 *  [1] Qurilmadagi kesh (lib/queryPersist.js): faqat ommaviy katalog saqlanadi
 *      (restoran, menyu, do'kon bo'limlari, market kategoriyalari); foydalanuvchi
 *      ma'lumoti, bosh sahifa tasmalari SAQLANMAYDI; yangi build/1 sutkadan eski — tashlanadi;
 *      tiklangan ma'lumot "eskirgan" (fonda yangilanadi); hajm chegarasi.
 *  [2] Do'kon indeksi + preview: kelgan bo'lim sahifalari o'sha bo'lim keshiga 1-sahifa
 *      bo'lib yoziladi (alohida so'rov kerak emas); eski server preview bermasa — avvalgidek.
 *  [3] Kartadan o'tishda restoran ma'lumoti darhol (placeholder), menyu parallel.
 *  [4] Rasm: birinchi kartalar ustuvor yuklanadi; Cloudinary'ga oldindan ulanish.
 * Vite SSR orqali. npm run test:first-load
 */
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(k, String(v)); },
  removeItem: (k) => { mem.delete(k); },
};
globalThis.window = globalThis.window || { localStorage: globalThis.localStorage };
globalThis.window.localStorage = globalThis.localStorage;

const server = await createServer({ root: process.cwd(), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
let failed = 0;
const check = (name, cond, extra = '') => { console.log((cond ? '  ✓ ' : '  ✗ FAIL: ') + name + (cond ? '' : ` ${extra}`)); if (!cond) failed += 1; };
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

try {
  const { QueryClient } = await server.ssrLoadModule('@tanstack/react-query');
  const P = await server.ssrLoadModule('/src/lib/queryPersist.js');
  const RID = '6a5ff4869a705be4489f06b6';

  console.log('\n[1] Qurilmadagi katalog keshi');
  check('restoran, menyu, do‘kon bo‘limlari, market kategoriyalari — saqlanadi',
    ['restaurant', RID].length && P.isPersistedKey(['restaurant', RID]) && P.isPersistedKey(['dishes', RID])
    && P.isPersistedKey(['store-menu', RID, 'index']) && P.isPersistedKey(['store-menu', RID, 'items', 'meva'])
    && P.isPersistedKey(['market', 'categories']));
  check('foydalanuvchi ma‘lumoti va bosh sahifa tasmalari — SAQLANMAYDI',
    !P.isPersistedKey(['orders']) && !P.isPersistedKey(['me']) && !P.isPersistedKey(['addresses'])
    && !P.isPersistedKey(['dishes', 'feed', 'regular', 'all', 50, 'fair']) && !P.isPersistedKey(['dishes', 'trending'])
    && !P.isPersistedKey(['market', 'products', 'x']) && !P.isPersistedKey('restaurant'));

  const a = new QueryClient();
  a.setQueryData(['restaurant', RID], { name: 'Totli', isStore: false });
  a.setQueryData(['dishes', RID], [{ _id: 'd1', name: 'Tort', price: 140000 }]);
  a.setQueryData(['orders'], [{ secret: 1 }]);
  a.setQueryData(['dishes', 'feed', 'regular'], { items: [1] });
  const snap = P.snapshot(a);
  const keys = snap.state.queries.map((q) => JSON.stringify(q.queryKey));
  check('snapshot: faqat ruxsat etilgan 2 ta so‘rov', keys.length === 2 && !keys.some((k) => k.includes('orders') || k.includes('feed')), keys.join(' '));
  mem.set('lokma_qc_catalog_v1', JSON.stringify(snap));

  const b = new QueryClient();
  const n = P.restorePersistedQueries(b);
  check('qayta ochilishda tiklanadi (2 ta)', n === 2 && b.getQueryData(['dishes', RID])?.[0]?.name === 'Tort');
  const st = b.getQueryState(['restaurant', RID]);
  check('tiklangan ma‘lumot asl vaqtini saqlaydi → sahifa ochilganda fonda yangilanadi', st && st.dataUpdatedAt <= Date.now() && st.dataUpdatedAt > 0);

  const old = JSON.parse(JSON.stringify(snap));
  old.state.queries.forEach((q) => { q.state.dataUpdatedAt = Date.now() - 25 * 3600_000; });
  mem.set('lokma_qc_catalog_v1', JSON.stringify(old));
  check('1 sutkadan eski — tiklanmaydi', P.restorePersistedQueries(new QueryClient()) === 0);

  mem.set('lokma_qc_catalog_v1', JSON.stringify({ ...snap, buster: 'boshqa-build' }));
  check('boshqa build — kesh tashlanadi', P.restorePersistedQueries(new QueryClient()) === 0 && !mem.has('lokma_qc_catalog_v1'));

  mem.set('lokma_qc_catalog_v1', '{buzilgan json');
  check('buzilgan yozuv — xatosiz tashlanadi', P.restorePersistedQueries(new QueryClient()) === 0 && !mem.has('lokma_qc_catalog_v1'));

  const big = new QueryClient();
  const huge = 'x'.repeat(600_000);
  for (let i = 0; i < 5; i += 1) big.setQueryData(['store-menu', RID, 'items', `s${i}`], { pages: [{ items: [{ name: huge }] }], pageParams: [''] });
  const bigSnap = P.snapshot(big);
  check('hajm chegarasi (~1.5 MB): ortiqchasi tashlanadi', JSON.stringify(bigSnap).length < 1_700_000 && bigSnap.state.queries.length < 5, String(bigSnap.state.queries.length));

  console.log('\n[2] Do‘kon indeksi + preview → bo‘limlar keshi');
  const { api } = await server.ssrLoadModule('/src/api/index.js');
  const Q = await server.ssrLoadModule('/src/hooks/queries.js');
  const pageMeva = { items: [{ _id: 'p1', name: 'Olma' }], hasMore: true, nextCursor: 'p1' };
  let asked = null;
  api.getMenuIndex = async (id, opts) => { asked = opts; return { total: 40, sale: 0, sections: [{ key: 'meva', count: 30 }, { key: 'sut', count: 10 }], preview: { meva: pageMeva }, previewLimit: 24 }; };
  const c = new QueryClient();
  const idx = await c.fetchQuery(Q.storeMenuIndexQuery(c, RID));
  check('indeks preview=3 bilan so‘raladi', asked?.preview === Q.STORE_MENU_PREVIEW && Q.STORE_MENU_PREVIEW === 3);
  check('indeks javobi avvalgi shaklda (preview ichida qolmaydi)', idx.total === 40 && idx.sections.length === 2 && !('preview' in idx));
  const seeded = c.getQueryData(['store-menu', RID, 'items', 'meva']);
  check('“meva” bo‘limi keshida 1-sahifa tayyor (alohida so‘rov kerak emas)', seeded?.pages?.[0]?.items?.[0]?.name === 'Olma' && seeded.pageParams[0] === '');
  check('preview kelmagan bo‘lim — bo‘sh (o‘zi so‘raydi)', c.getQueryData(['store-menu', RID, 'items', 'sut']) === undefined);

  const more = { pages: [pageMeva, { items: [{ _id: 'p2' }] }], pageParams: ['', 'p1'] };
  c.setQueryData(['store-menu', RID, 'items', 'meva'], more);
  await c.fetchQuery({ ...Q.storeMenuIndexQuery(c, RID), staleTime: 0 });
  check('bo‘limda ko‘proq sahifa bo‘lsa — preview uni QAYTA YOZMAYDI', c.getQueryData(['store-menu', RID, 'items', 'meva']).pages.length === 2);

  api.getMenuIndex = async () => ({ total: 1, sale: 0, sections: [{ key: 'meva', count: 1 }] });
  const d = new QueryClient();
  const oldIdx = await d.fetchQuery(Q.storeMenuIndexQuery(d, RID));
  check('eski server (preview yo‘q) — avvalgidek ishlaydi', oldIdx.total === 1 && d.getQueryData(['store-menu', RID, 'items', 'meva']) === undefined);

  api.getMenuIndex = async () => ({ total: 1, sale: 0, sections: [], preview: { meva: pageMeva }, previewLimit: 12 });
  const e = new QueryClient();
  await e.fetchQuery(Q.storeMenuIndexQuery(e, RID));
  check('sahifa o‘lchami mos kelmasa — keshga yozilmaydi (kursorlar aralashmasin)', e.getQueryData(['store-menu', RID, 'items', 'meva']) === undefined);

  console.log('\n[3] Kartadan o‘tish: darhol chizish va parallel menyu');
  const card = src('src/components/RestaurantCard.jsx');
  const mcard = src('src/components/MarketStoreCard/MarketStoreCard.jsx');
  check('kartalar restoran ma‘lumotini sahifaga uzatadi', /state: \{ preview: r \}/.test(card) && /state: \{ preview: r \}/.test(mcard));
  check('kartalar oldindan yuklashga do‘kon/restoran belgisini beradi', /prefetch\(rid, r\)/.test(card) && /prefetch\(rid, r\)/.test(mcard));
  const page = src('src/pages/Restaurant/RestaurantPage.jsx');
  check('sahifa preview bilan useRestaurant (spinnersiz)', /useRestaurant\(id, previewRestaurant\)/.test(page) && /location\.state\?\.preview/.test(page));
  check('preview paytida "sharh yo‘q" va "(0)" ko‘rsatilmaydi', /restIsPreview \? null/.test(page) && /restIsPreview \? t\('reviewsLabel'\)/.test(page));
  check('restoran menyusi kelguncha skeleton', /data-testid="menu-loading"/.test(page));

  console.log('\n[4] Rasmlar');
  const { ProductImg } = await server.ssrLoadModule('/src/components/ProductImage/ProductImg.jsx');
  const h = React.createElement;
  const hi = renderToString(h(ProductImg, { src: 'https://res.cloudinary.com/x/image/upload/a.jpg', priority: true }));
  const lo = renderToString(h(ProductImg, { src: 'https://res.cloudinary.com/x/image/upload/a.jpg' }));
  check('ustuvor rasm: loading=eager + fetchpriority=high', /loading="eager"/.test(hi) && /fetchpriority="high"/i.test(hi), hi);
  check('qolganlari lazy (trafik tejaladi)', /loading="lazy"/.test(lo) && !/fetchpriority/i.test(lo));
  const html = src('index.html');
  check('Cloudinary’ga oldindan ulanish (preconnect)', /rel="preconnect" href="https:\/\/res\.cloudinary\.com"/.test(html));
  const photo = src('src/components/DishPhoto.jsx');
  check('Cloudinary o‘lcham/transformatsiyasi o‘zgarmagan (yangi variant = kvota sarfi yo‘q)', /f_auto,q_auto,w_\$\{width\},\$\{crop\}/.test(photo) && /const w = fit === 'contain' \? 800 : 400;/.test(photo));
} catch (e) {
  console.error(e);
  failed += 1;
} finally {
  await server.close();
}
console.log(failed ? `\n✗ ${failed} ta xato` : '\n✓ hammasi o‘tdi');
process.exit(failed ? 1 : 0);

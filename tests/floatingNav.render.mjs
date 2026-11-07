/* Suzuvchi pastki menyu (BottomNav + floating-nav.css) va To'yxonalar uchun dizayn paketi. Vite SSR. npm run test:floating-nav */
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';

globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const server = await createServer({ root: process.cwd(), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
let failed = 0;
const check = (name, cond, extra = '') => { console.log((cond ? '  ✓ ' : '  ✗ FAIL: ') + name + (cond ? '' : ` ${extra}`)); if (!cond) failed += 1; };
try {
  const h = React.createElement;
  const { MemoryRouter } = await import('react-router-dom');
  const { I18nProvider } = await server.ssrLoadModule('/src/i18n/index.jsx');
  const { BottomNav, BOTTOM_NAV_H } = await server.ssrLoadModule('/src/components/BottomNav/BottomNav.jsx');
  const { useSection } = await server.ssrLoadModule('/src/store/section.js');
  const { useCart } = await server.ssrLoadModule('/src/store/cart.js');
  const { useUser } = await server.ssrLoadModule('/src/store/user.js');
  const render = (path) => renderToString(h(MemoryRouter, { initialEntries: [path] }, h(I18nProvider, null, h(BottomNav)))).replace(/<!-- -->/g, '');

  let html = render('/orders');
  check('4 ta tab, faqat ikonkalar (ko‘rinadigan matn yo‘q), nomlari aria-label/title da', (html.match(/<button/g) || []).length === 4 && ['Bosh', 'Qidiruv', 'Buyurtmalar', 'Profil'].every((x) => html.includes(`aria-label="${x}"`) && html.includes(`title="${x}"`)) && !/<span>(Bosh|Qidiruv|Buyurtmalar|Profil)<\/span>/.test(html));
  check('faol tab (Buyurtmalar) belgilanadi: aria-current, pill 3-o‘rinda (--fn-i: 2)', html.includes('aria-current="page"') && html.includes('--fn-i:2') && html.includes('data-active="true"') && (html.match(/aria-current="page"/g) || []).length === 1);
  html = render('/restaurant/abc');
  check('menyuda yo‘q sahifada pill yashirin (data-active=false)', html.includes('data-active="false"') && !html.includes('aria-current'));
  html = render('/');
  check('Lokma Go: «Bosh» = / (faol, pill 1-o‘rinda)', html.includes('--fn-i:0') && /aria-label="Bosh"[^>]*aria-current="page"|aria-current="page"[^>]*aria-label="Bosh"/.test(html));
  // zustand SSR'da boshlang'ich holatni o'qiydi (setState ta'sir qilmaydi) — shu obyektning o'zini o'zgartiramiz
  const initSection = useSection.getInitialState(); const prevSection = initSection.section;
  initSection.section = 'market';
  check('Market: «Bosh» = /market (faol)', render('/market').includes('--fn-i:0') && render('/').includes('data-active="false"'));
  initSection.section = prevSection;
  useCart.getState().clear?.();
  useCart.getState().addItem({ _id: 'd1', id: 'd1', name: 'Tort', price: 1000, restaurantId: 's1', restaurant: { id: 's1', _id: 's1', name: 'X' } }, 3, [], '');
  check('buyurtmalar ikonkasida savat soni nishoni', render('/').includes('fnav__badge">3<'));
  useUser.getInitialState().user.photoUrl = 'https://example.com/me.jpg';
  check('Profil: Telegram rasmi (bo‘lsa) ikonka o‘rniga', render('/').includes('class="fnav__photo"') && render('/').includes('example.com/me.jpg'));

  const css = readFileSync('src/components/BottomNav/floating-nav.css', 'utf8');
  const nav = readFileSync('src/components/BottomNav/BottomNav.css', 'utf8');
  const px = (re, s = css) => Number((re.exec(s) || [])[1]);
  check('Instagram uslubi: kapsula 58 px, to‘liq yumaloq, shisha (blur 22px), max-kenglik 420 px', px(/--fn-h:\s*(\d+)px/) === 58 && css.includes('border-radius: 999px') && css.includes('backdrop-filter: blur(22px)') && px(/max-width:\s*(\d+)px/) === 420);
  check('faol "pill" silliq suriladi (transform + 360 ms), harakat kamaytirilsa animatsiyasiz', css.includes('translateX(calc(var(--fn-i, 0) * 100%))') && css.includes('transform 360ms') && css.includes('prefers-reduced-motion'));
  const padTop = px(/padding:\s*(\d+)px 20px calc\((\d+)px/, nav); const padBot = Number((/padding:\s*\d+px 20px calc\((\d+)px/.exec(nav) || [])[1]);
  check(`menyu balandligi izchil: ${padTop} + 58 + ${padBot} = ${padTop + 58 + padBot} px = BOTTOM_NAV_H (${BOTTOM_NAV_H}) — savat paneli va tugmalar shunga tayanadi`, padTop + 58 + padBot === BOTTOM_NAV_H);
  check('rang faqat 2 o‘zgaruvchida; Market yashil, Go to‘q sariq (brend)', css.includes('--fn-accent: #FF5C00') && /data-section='market'\] \.bottom-nav \.fnav\s*\{[^}]*#148A43/.test(nav));

  // To'yxonalar uchun paket: nusxa AYNAN bir xil (tarqalib ketmasin), rang va ulanish yo'riqnomasi
  const dir = 'docs/wedding-floating-nav';
  check("To'yxonalar paketidagi floating-nav.css Go/Market faylining AYNAN nusxasi (dizayn bir xil)", readFileSync(`${dir}/floating-nav.css`, 'utf8') === css);
  const th = readFileSync(`${dir}/theme-wedding.css`, 'utf8');
  check("To'yxonalar rangi: #A61E4D (to‘q qizil), nishon oltin #D1A65E; faqat rang o‘zgaradi", th.includes('--fn-accent: #A61E4D') && th.includes('#D1A65E') && !/(height|width|radius|blur)/.test(th.replace(/\/\*[\s\S]*?\*\//g, '')));
  const comp = readFileSync(`${dir}/FloatingNav.jsx`, 'utf8');
  check('React komponent bog‘liqliksiz va Go bilan bir xil tuzilma (fnav, fnav__pill, fnav__tab, --fn-i)', !/from '@\//.test(comp) && ['fnav__pill', 'fnav__tab', '--fn-i', '--fn-n', 'aria-current'].every((x) => comp.includes(x)));
  const rd = readFileSync(`${dir}/README.md`, 'utf8');
  check("yo‘riqnoma: 3 bo‘lim ranglari, 76 px joy, sticky o‘rovchi", ['#FF5C00', '#148A43', '#A61E4D', '76 px', 'position: sticky'].every((x) => rd.includes(x)));
} finally { await server.close(); }
if (failed) { console.log(`\n${failed} ta xato`); process.exit(1); }
console.log('\nHammasi o‘tdi');

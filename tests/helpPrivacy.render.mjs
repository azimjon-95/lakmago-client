/*
 * PROFIL: «Ko'p beriladigan savollar», maxfiylik siyosati, ishga tushirish ekrani (native → veb o'tish)
 *  [1] FAQ: Lokma Go + Market, 3 til, kirill avtomatik (teglar buzilmaydi), har savolda javob + maslahat
 *  [2] Maxfiylik: 14 bo'lim, 3 til, rekvizit bo'sh bo'lsa ko'rsatilmaydi, kartaning saqlanmasligi aytilgan
 *  [3] Profil: ikkala havola; marshrutlar; i18n 3 til muvozanati
 *  [4] Splash: iOS/Android/veb/boot bir xil fon va logo o'lchami; MainActivity; capacitor fon rangi
 * npm run test:help-privacy
 */
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync, existsSync } from 'node:fs';

const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
globalThis.sessionStorage = globalThis.localStorage;
globalThis.window = globalThis.window || { localStorage: globalThis.localStorage, addEventListener() {}, removeEventListener() {} };
globalThis.window.localStorage = globalThis.localStorage;

const server = await createServer({ root: process.cwd(), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
let failed = 0;
const check = (name, cond, extra = '') => { console.log((cond ? '  ✓ ' : '  ✗ FAIL: ') + name + (cond ? '' : ` ${extra}`)); if (!cond) failed += 1; };
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const dec = (h) => h.replace(/<!-- -->/g, '').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');

try {
  const { HELP_RAW } = await server.ssrLoadModule('/src/data/helpContent.js');
  const { PRIVACY_RAW } = await server.ssrLoadModule('/src/data/privacyContent.js');
  const { localized } = await server.ssrLoadModule('/src/lib/localizedContent.js');
  const { translations } = await server.ssrLoadModule('/src/i18n/translations.js');
  const { LEGAL } = await server.ssrLoadModule('/src/config/legal.js');

  console.log('[1] FAQ');
  for (const lang of ['uz', 'uzc', 'ru']) {
    const f = localized(HELP_RAW, lang, 'help');
    check(`${lang}: Lokma Go ≥ 9 va Market ≥ 7 savol`, f.go.length >= 9 && f.market.length >= 7, `${f.go.length}/${f.market.length}`);
    check(`${lang}: har savolda javob va maslahat`, [...f.go, ...f.market].every((x) => x.q && x.a.length > 40 && x.tip));
  }
  check('uz va ru savollar soni teng', HELP_RAW.uz.go.length === HELP_RAW.ru.go.length && HELP_RAW.uz.market.length === HELP_RAW.ru.market.length);
  const cy = localized(HELP_RAW, 'uzc', 'help');
  check('kirill: lotin harf qolmagan (brend nomidan tashqari)', ![...cy.go, ...cy.market].some((x) => /[A-Za-z]/.test((x.q + x.a + x.tip).replace(/Lokma Go|Lokma Market|Lokma/g, ''))));
  check('FAQ: pul yechilmaguncha restoranga bormaydi (CLAUDE.md 1-qoida bilan mos)', /pul yechilmaguncha/.test(HELP_RAW.uz.go.map((x) => x.a).join(' ')));

  console.log('[2] Maxfiylik');
  for (const lang of ['uz', 'uzc', 'ru']) {
    const c = localized(PRIVACY_RAW, lang, 'privacy');
    check(`${lang}: 14 bo'lim, 4 qisqacha, 4 huquq`, c.sections.length === 14 && c.summary.length === 4 && c.rights.length === 4);
    const all = JSON.stringify(c);
    check(`${lang}: teglar buzilmagan (<b>…</b> juft)`, (all.match(/<b>/g) || []).length === (all.match(/<\/b>/g) || []).length && !/<[^>]*[а-яА-Я]/.test(all));
  }
  const texts = (v) => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(texts) : v && typeof v === 'object' ? Object.entries(v).filter(([k]) => k !== 'id').flatMap(([, x]) => texts(x)) : []);
  const cyp = texts(localized(PRIVACY_RAW, 'uzc', 'privacy').sections).join(' ').replace(/<\/?b>/g, '');
  check('kirill matnda lotin harf yo‘q (brend/qonun raqamidan tashqari)', !/[A-Za-z]/.test(cyp.replace(/Lokma Go|Lokma Market|Lokma|HTTPS|GPS|Telegram|Apple|Google|Click|Payme|iOS|Android|CVV|O‘RQ|ЎРҚ|-547|lokma\.uz|Telegram Mini App/g, '')), cyp.match(/[A-Za-z]+/g)?.slice(0, 8)?.join(','));
  const txt = JSON.stringify(PRIVACY_RAW.uz.sections);
  check('karta raqami/CVV saqlanmasligi aytilgan', /CVV/.test(txt) && /saqlanmaydi/.test(txt));
  check('bola/rozilik/o‘chirish/huquqlar bo‘limlari bor', ['children', 'rights', 'retention', 'push', 'location', 'fraud'].every((id) => PRIVACY_RAW.uz.sections.some((s) => s.id === id)));
  check('rekvizit: soxta qiymat yo‘q (bo‘sh yoki haqiqiy)', ['stir', 'address', 'email'].every((k) => typeof LEGAL[k] === 'string'));
  check('amal qilish sanasi va tahrir bor', /^\d{4}-\d{2}-\d{2}$/.test(LEGAL.effective) && LEGAL.version);

  const { I18nProvider } = await server.ssrLoadModule('/src/i18n/index.jsx');
  const { MemoryRouter } = await import('react-router-dom');
  const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
  const qc = new QueryClient();
  const wrap = (el) => renderToString(React.createElement(QueryClientProvider, { client: qc }, React.createElement(MemoryRouter, null, React.createElement(I18nProvider, null, el))));
  const { HelpPage } = await server.ssrLoadModule('/src/pages/Help/HelpPage.jsx');
  const { PrivacyPage, formatDate } = await server.ssrLoadModule('/src/pages/Legal/PrivacyPage.jsx');
  const h = dec(wrap(React.createElement(HelpPage)));
  check('HelpPage: sarlavha, ikki bo‘lim, 11 savol', /Ko‘p beriladigan savollar/.test(h) && /Lokma Go/.test(h) && /Market/.test(h) && (h.match(/class="help-item /g) || []).length === 11);
  const pr = dec(wrap(React.createElement(PrivacyPage)));
  check('PrivacyPage: 14 bo‘lim + mundarija + «Lokma Go» MChJ', (pr.match(/class="lg-sec lg-reveal/g) || []).length === 14 && /lg-toc/.test(pr) && /«Lokma Go» MChJ/.test(pr));
  check('PrivacyPage: bo‘sh rekvizit (STIR/manzil/e-pochta) ko‘rsatilmaydi', LEGAL.stir || !/>STIR</.test(pr));
  check('sana formati 3 tilda', formatDate('2026-11-26', 'uz') === '2026-yil 26-noyabr' && formatDate('2026-11-26', 'ru') === '26 ноября 2026 г.' && /ноябрь/.test(formatDate('2026-11-26', 'uzc')));

  console.log('[3] Profil, marshrut, i18n');
  const prof = src('src/pages/Profile/ProfilePage.jsx');
  check('Profil: /help va /privacy havolalari', /navigate\('\/help'\)/.test(prof) && /navigate\('\/privacy'\)/.test(prof));
  const app = src('src/App.jsx');
  check('App: /help va /privacy marshrutlari (guest bloklanmaydi)', /path="\/help"/.test(app) && /path="\/privacy"/.test(app));
  const n = ['uz', 'uzc', 'ru'].map((k) => Object.keys(translations[k]).length);
  check('i18n 3 til teng', n[0] === n[1] && n[1] === n[2], n.join('/'));

  console.log('[4] Ishga tushirish ekrani');
  const css = src('src/components/Splash/Splash.css');
  const html = src('index.html');
  const sb = src('ios/App/App/Base.lproj/LaunchScreen.storyboard');
  const styles = src('android/app/src/main/res/values/styles.xml');
  const act = src('android/app/src/main/java/uz/lokmago/app/MainActivity.java');
  const cap = src('capacitor.config.ts');
  check('veb Splash va index.html #boot: logo 15.37vh', /15\.37vh/.test(css) && /15\.37vh/.test(html));
  check('fon rangi #032a37 hamma joyda (veb, boot, Android, capacitor, iOS storyboard)',
    /#032a37/i.test(css) && /#032a37/i.test(html) && /#032A37/.test(src('android/app/src/main/res/values/colors.xml')) && /#032A37/.test(cap) && /red="0\.0117/.test(sb));
  check('Android: tema (fon, ikonka, postSplashScreenTheme) + MainActivity installSplashScreen', /windowSplashScreenBackground/.test(styles) && /postSplashScreenTheme/.test(styles) && /installSplashScreen/.test(act) && /setOnExitAnimationListener/.test(act));
  check('Android ikonka 5 zichlikda', ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'].every((d) => existsSync(new URL(`../android/app/src/main/res/drawable-${d}/splash_logo.png`, import.meta.url))));
  check('veb logo fayli bor', existsSync(new URL('../public/brand/splash-logo.png', import.meta.url)));
  check('boot kadr sessiyada bir marta (lokmago_splash_seen) va React olib tashlaydi', /lokmago_splash_seen/.test(html) && /getElementById\('boot'\)/.test(src('src/components/Splash/Splash.jsx')));
  check('reduced-motion hurmat qilinadi (Help, Legal, Splash, Profil)', [css, src('src/pages/Help/Help.css'), src('src/pages/Legal/Legal.css'), src('src/pages/Profile/Profile.css')].every((x) => /prefers-reduced-motion/.test(x)));
} finally { await server.close(); }
console.log(failed ? `\n✗ ${failed} ta xato` : '\n✓ hammasi o‘tdi');
process.exit(failed ? 1 : 0);

/*
 * TAOM TAKLIFLARI PUSH'I (ilova tomoni, 2026-11-26)
 *  [1] Rozilik oynasi: bildirishnoma namunasi, aniq rozilik matni (Apple 4.5.4), "Ha" / "Hozir emas"
 *  [2] Xavfsizlik: bildirishnomadagi url — faqat ilova ichidagi taom/restoran yo'li
 *  [3] Ulanish: pushBoot render'dan oldin; App'da ko'prik; profil tugmasi; native sozlamalar (iOS/Android)
 *  [4] i18n 3 til muvozanati
 * npm run test:promo-push
 */
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync, existsSync } from 'node:fs';

const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
globalThis.window = globalThis.window || { localStorage: globalThis.localStorage };
globalThis.window.localStorage = globalThis.localStorage;

const server = await createServer({ root: process.cwd(), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
let failed = 0;
const check = (name, cond, extra = '') => { console.log((cond ? '  ✓ ' : '  ✗ FAIL: ') + name + (cond ? '' : ` ${extra}`)); if (!cond) failed += 1; };
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

try {
  const { I18nProvider } = await server.ssrLoadModule('/src/i18n/index.jsx');
  const { translations } = await server.ssrLoadModule('/src/i18n/translations.js');
  const { PushConsentSheet } = await server.ssrLoadModule('/src/components/PromoPush/PromoPush.jsx');
  const { PushToggle } = await server.ssrLoadModule('/src/components/PromoPush/PushToggle.jsx');
  const lib = await server.ssrLoadModule('/src/lib/promoPush.js');
  const wrap = (el) => renderToString(React.createElement(I18nProvider, null, el));

  console.log('\n[1] Rozilik oynasi');
  const html = wrap(React.createElement(PushConsentSheet, { onDone() {} }));
  const text = html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  check('dialog (aria-modal) va sarlavha', html.includes('role="dialog"') && html.includes('aria-modal="true"') && text.includes(translations.uz.pushAskTitle));
  check('namuna bildirishnoma: ilova nomi, sarlavha, matn', text.includes('Lokma Go') && text.includes(translations.uz.pushPreviewTitle) && text.includes('35 000'));
  check('aniq rozilik: chastota (2 marta) va o‘chirish joyi aytilgan', /2 marta/.test(text) && /Profilda o'chirasiz/.test(text));
  check('"Ha, yuboring" va "Hozir emas" tugmalari', text.includes('Ha, yuboring') && text.includes('Hozir emas'));
  check('vebda profil tugmasi chizilmaydi', wrap(React.createElement(PushToggle)) === '');

  console.log('\n[2] Bildirishnoma url xavfsizligi');
  check('taom va restoran yo‘li qabul qilinadi', lib.safePushUrl('/food/6a5ff4869a705be4489f06b6') && lib.safePushUrl('/restaurant/6a5ff4869a705be4489f06b6'));
  for (const bad of ['https://evil.uz', '//evil.uz/food/1', '/cart', '/food/../admin', 'javascript:alert(1)', '/food/', null, 42]) {
    check(`rad etiladi: ${String(bad)}`, lib.safePushUrl(bad) === null);
  }
  check('vebda rozilik so‘ralmaydi', (await lib.shouldAskConsent()) === false);
  check('vebda yoqish — o‘chiq qoladi', (await lib.setOptIn(true)) === 'off');

  console.log('\n[3] Ulanish');
  const main = src('src/main.jsx');
  check('pushBoot() render’dan OLDIN (sovuq ochilishda bosilgan bildirishnoma yo‘qolmaydi)', main.indexOf('pushBoot();') > 0 && main.indexOf('pushBoot();') < main.indexOf('createRoot('));
  const app = src('src/App.jsx');
  check('App: <PromoPush /> splash’dan keyin', /\{!showSplash && <PromoPush \/>\}/.test(app));
  check('Profil: <PushToggle />', src('src/pages/Profile/ProfilePage.jsx').includes('<PushToggle />'));
  const libSrc = src('src/lib/promoPush.js');
  check('OS ruxsati faqat "Ha"/profil tugmasidan (requestPermissions boshqa joyda yo‘q)', (libSrc.match(/requestPermissions\(/g) || []).length === 1 && /export async function acceptConsent/.test(libSrc));
  check('token faqat rozilik bo‘lsa serverga', /if \(read\(OPTIN_KEY\) !== '1' \|\| !token\) return;/.test(libSrc));
  check('Android kanal id = server (promo)', libSrc.includes("id: 'promo'"));
  const delegate = src('ios/App/App/AppDelegate.swift');
  check('iOS: APNs token plaginga uzatiladi', delegate.includes('capacitorDidRegisterForRemoteNotifications') && delegate.includes('capacitorDidFailToRegisterForRemoteNotifications'));
  check('iOS: aps-environment entitlement', src('ios/App/App/App.entitlements').includes('aps-environment'));
  const manifest = src('android/app/src/main/AndroidManifest.xml');
  check('Android 13+: POST_NOTIFICATIONS ruxsati', manifest.includes('android.permission.POST_NOTIFICATIONS'));
  check('Android: bildirishnoma ikonkasi (oq siluet) va rang', manifest.includes('@drawable/ic_stat_lokma') && existsSync(new URL('../android/app/src/main/res/drawable/ic_stat_lokma.xml', import.meta.url)) && existsSync(new URL('../android/app/src/main/res/values/colors.xml', import.meta.url)));
  check('plagin o‘rnatilgan (native)', src('package.json').includes('"@capacitor/push-notifications"') && src('ios/App/CapApp-SPM/Package.swift').includes('CapacitorPushNotifications') && src('android/capacitor.settings.gradle').includes('capacitor-push-notifications'));

  console.log('\n[4] i18n');
  const keys = Object.keys(translations.uz).filter((k) => k.startsWith('push'));
  const miss = keys.filter((k) => !(k in translations.uzc) || !(k in translations.ru));
  check('push* kalitlari uchala tilda', keys.length >= 10 && miss.length === 0, miss.join(','));
  check('uch til kalitlari soni teng', Object.keys(translations.uz).length === Object.keys(translations.uzc).length && Object.keys(translations.uz).length === Object.keys(translations.ru).length);
} finally {
  await server.close();
}
console.log(failed ? `\n✗ ${failed} ta xato` : '\n✓ hammasi o‘tdi');
process.exit(failed ? 1 : 0);

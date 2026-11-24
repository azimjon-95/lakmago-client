/*
 * ILOVA KANALI, YANGILANISH, "ILOVANI YUKLAB OLISH" (2026-11-24).
 *  [1] Kanal aniqlash va har so'rovga header (api/index.js → lib/clientInfo.js)
 *  [2] Yangilanish qarori (lib/appUpdate.js decide): majburiy / Android fonda / iOS taklif / kechiktirish
 *  [3] Aksiya oynasi: "Ilovani yuklab olish" qurilmaga mos do'kon, ilova ichida ko'rinmaydi
 *  [4] Tarjimalar uch tilda teng
 * npm run test:app-channel
 */
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };

const server = await createServer({ root: process.cwd(), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
let failed = 0;
const check = (name, cond, extra = '') => { console.log((cond ? '  ✓ ' : '  ✗ FAIL: ') + name + (cond ? '' : ` ${extra}`)); if (!cond) failed += 1; };
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

try {
  console.log('\n[1] Kanal va header');
  const C = await server.ssrLoadModule('/src/lib/clientInfo.js');
  check('brauzerda (Telegram emas) — web', C.detectChannel() === 'web');
  globalThis.window = { Telegram: { WebApp: { initData: 'query_id=1&user=...' } } };
  check('Telegram ichida (initData bor) — telegram', C.detectChannel() === 'telegram');
  globalThis.window = { Telegram: { WebApp: { initData: '' } } };
  check('Telegram SDK bor, lekin Telegram emas — web', C.detectChannel() === 'web');
  delete globalThis.window;
  check('saytda faqat kanal header’i (versiya/qurilma yo‘q)', JSON.stringify(C.clientHeaders()) === JSON.stringify({ 'X-Lokma-Client': 'web' }), JSON.stringify(C.clientHeaders()));
  const api = src('src/api/index.js');
  check('har so‘rovga header (doFetch) va native ma‘lumot kutiladi', /\.\.\.clientHeaders\(\)/.test(api) && /await clientReady;/.test(api));
  const cfg = { ios: { storeUrl: 'https://apps.apple.com/uz/app/lokma-go/id1234567890' }, android: { storeUrl: 'https://play.google.com/store/apps/details?id=lokma.uz' } };
  check('iPhone brauzeri → App Store', C.storeUrlFor(cfg, 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)').includes('apps.apple.com'));
  check('Android brauzeri → Google Play', C.storeUrlFor(cfg, 'Mozilla/5.0 (Linux; Android 14)').includes('play.google.com'));
  check('App Store havolasi yo‘q bo‘lsa iPhone’ga ham Google Play emas, bor havola', C.storeUrlFor({ android: cfg.android }, 'iPhone').includes('play.google'));

  console.log('\n[2] Yangilanish qarori');
  const U = await server.ssrLoadModule('/src/lib/appUpdate.js');
  const conf = { ios: { minVersion: '1.2.0', storeUrl: cfg.ios.storeUrl }, android: { minVersion: '', storeUrl: cfg.android.storeUrl } };
  check('iOS 1.1.9 < min 1.2.0 → majburiy', U.decide({ platform: 'ios', current: '1.1.9', cfg: conf }).action === 'force');
  check('iOS 1.2.0 = min, do‘konda 1.3.0 → taklif', U.decide({ platform: 'ios', current: '1.2.0', store: { available: true, version: '1.3.0' }, cfg: conf }).action === 'prompt');
  check('iOS do‘konda shu versiya → hech narsa', U.decide({ platform: 'ios', current: '1.3.0', store: { available: true, version: '1.3.0' }, cfg: conf }).action === 'none');
  check('iOS "Keyinroq" bosilgan (muddat tugamagan) → hech narsa',
    U.decide({ platform: 'ios', current: '1.2.0', store: { available: true, version: '1.3.0' }, cfg: conf, snooze: { version: '1.3.0', until: Date.now() + 1e6 } }).action === 'none');
  check('iOS kechiktirilgandan keyin yanada yangi versiya → yana taklif',
    U.decide({ platform: 'ios', current: '1.2.0', store: { available: true, version: '1.4.0' }, cfg: conf, snooze: { version: '1.3.0', until: Date.now() + 1e6 } }).action === 'prompt');
  check('Android yangisi bor → fonda yuklash (flexible)', U.decide({ platform: 'android', current: '1.0', store: { available: true, flexibleAllowed: true }, cfg: conf }).action === 'flexible');
  const af = U.decide({ platform: 'android', current: '1.0', store: { available: true, immediateAllowed: true }, cfg: { android: { minVersion: '1.1' } } });
  check('Android min dan eski → majburiy, Play orqali darhol', af.action === 'force' && af.immediate === true);
  check('minVersion bo‘sh va yangilanish yo‘q → hech narsa', U.decide({ platform: 'android', current: '1.0', store: { available: false }, cfg: conf }).action === 'none');
  check('versiya solishtirish 1.10 > 1.9', U.compareVersions('1.10', '1.9') === 1);
  check('App Store havolasidan Apple ID', U.appleIdFromUrl(cfg.ios.storeUrl) === '1234567890');
  U.writeSnooze('1.3.0', 3, 1000);
  check('kechiktirish saqlanadi (3 kun)', U.readSnooze()?.until === 1000 + 3 * 86_400_000);

  console.log('\n[3] Ilovani yuklab olish oynasi');
  const P = await server.ssrLoadModule('/src/components/PromoModals/PromoModals.jsx');
  const list = [{ id: 'a', cta: 'link', link: '/market' }, { id: 'b', cta: 'install_app', link: '' }];
  const web = await P.resolveInstallPromos(list, { native: false, getConfig: async () => cfg, label: 'Ilovani yuklab olish' });
  check('saytda: havola do‘konga, tugma matni', web.length === 2 && web[1].link.startsWith('https://') && web[1].actionLabel === 'Ilovani yuklab olish');
  const app = await P.resolveInstallPromos(list, { native: true, getConfig: async () => cfg });
  check('ilova ichida: "yuklab olish" oynasi ko‘rsatilmaydi', app.length === 1 && app[0].id === 'a');
  const none = await P.resolveInstallPromos(list, { native: false, getConfig: async () => ({}) });
  check('do‘kon havolasi sozlanmagan — oyna o‘tkaziladi', none.length === 1);
  check('oddiy oynalar o‘zgarmaydi', (await P.resolveInstallPromos([list[0]], { native: false, getConfig: async () => { throw new Error('x'); } })).length === 1);

  console.log('\n[5] Jim yangilanish (veb-qism)');
  const L = await server.ssrLoadModule('/src/lib/liveUpdate.js');
  const files = [{ file_name: 'index.html', file_hash: 'a'.repeat(64) }, { file_name: 'assets/app.js', file_hash: 'b'.repeat(64) }];
  const m = { version: 'abc1234def5678', native: 'fp1', files };
  check('yangi versiya, native bir xil → yuklash', L.decideLive({ manifest: m, current: 'old1234567', nativeFp: 'fp1' }) === 'download');
  check('shu versiya → hech narsa', L.decideLive({ manifest: m, current: 'abc1234def5678', nativeFp: 'fp1' }) === 'none');
  check('native izi boshqa (yangi plagin) → do‘kon orqali', L.decideLive({ manifest: m, current: 'old1234567', nativeFp: 'fp2' }) === 'native_required');
  check('2 marta ishga tushmagan versiya → tashlab qo‘yiladi', L.decideLive({ manifest: m, current: 'old1234567', nativeFp: 'fp1', failed: { version: m.version, attempts: 2 } }) === 'none');
  check('1 marta xato — yana urinadi', L.decideLive({ manifest: m, current: 'old1234567', nativeFp: 'fp1', failed: { version: m.version, attempts: 1 } }) === 'download');
  check('index.html yo‘q / buzuq manifest → hech narsa', L.decideLive({ manifest: { ...m, files: [files[1]] }, current: 'x', nativeFp: 'fp1' }) === 'none' && L.decideLive({ manifest: { version: '../../x' }, nativeFp: 'fp1' }) === 'none' && L.decideLive({ manifest: null }) === 'none');
  const pm = L.toPluginManifest({ files: [...files, { file_name: '../etc/passwd', file_hash: 'c'.repeat(64) }, { file_name: '/abs', file_hash: 'd'.repeat(64) }, { file_name: 'x.js', file_hash: 'bad' }, { file_name: 'img/a b.png', file_hash: 'e'.repeat(64) }] }, 'https://lokma.uz');
  check('manifest: yo‘l chetga chiqa olmaydi, xesh sha256', pm.length === 3 && !pm.some((x) => x.file_name.includes('..') || x.file_name.startsWith('/')));
  check('manifest: to‘liq https URL (bo‘shliq kodlangan)', pm[0].download_url === 'https://lokma.uz/index.html' && pm[2].download_url === 'https://lokma.uz/img/a%20b.png');
  check('qo‘llash: fonda 10+ daqiqa va bosh sahifa sharti', L.APPLY_AFTER_BACKGROUND_MS === 600000 && (await L.applyIfIdle({ backgroundMs: 9e9, onHome: true })) === false /* veb — no-op */);

  const { buildOta } = await import(new URL('../scripts/build-ota.mjs', import.meta.url).href);
  const fs = await import('node:fs'); const os = await import('node:os'); const path = await import('node:path');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ota-'));
  fs.mkdirSync(path.join(tmp, 'assets')); fs.writeFileSync(path.join(tmp, 'index.html'), '<html></html>'); fs.writeFileSync(path.join(tmp, 'assets', 'a.js'), 'x');
  const skip = await buildOta({ dist: tmp, env: { VITE_API_URL: '/api', VERCEL_GIT_COMMIT_SHA: 'abcdef123456' }, nativeFp: 'fp' });
  check('build: VITE_API_URL nisbiy → manifest YARATILMAYDI (ilova serverga ulana olmay qolmasin)', Boolean(skip.skipped) && !fs.existsSync(path.join(tmp, 'ota')));
  const ok = await buildOta({ dist: tmp, env: { VITE_API_URL: 'https://api.lokma.uz/api', VERCEL_GIT_COMMIT_SHA: 'abcdef123456' }, nativeFp: 'fp' });
  const again = await buildOta({ dist: tmp, env: { VITE_API_URL: 'https://api.lokma.uz/api', VERCEL_GIT_COMMIT_SHA: 'abcdef123456' }, nativeFp: 'fp' });
  check('build: manifest (sha256, native izi), ota/ o‘zini qo‘shmaydi', ok.manifest?.files.length === 2 && again.manifest.files.length === 2 && /^[a-f0-9]{64}$/.test(ok.manifest.files[0].file_hash) && ok.manifest.native === 'fp');
  const cap = src('capacitor.config.ts');
  check('plagin: avtomatik rejim va Capgo serverlari O‘CHIQ, avtomatik qaytish 10 s', /autoUpdate: false/.test(cap) && /statsUrl: ''/.test(cap) && /updateUrl: ''/.test(cap) && /appReadyTimeout: 10000/.test(cap) && /resetWhenUpdate: true/.test(cap));
  check('ochilishda notifyAppReady + tayyor versiya (main.jsx)', /liveUpdateBoot\(\);/.test(src('src/main.jsx')));
  check('npm run build manifestni ham yaratadi', /"build": "vite build && node scripts\/build-ota\.mjs"/.test(src('package.json')));
  const upd = src('src/components/AppUpdate/AppUpdate.jsx');
  check('tartib: jim yangilanish tayyor bo‘lsa — mijozga taklif yo‘q', /if \(live === 'ready'\) return;/.test(upd));

  console.log('\n[4] Tarjimalar');
  const { translations: T } = await server.ssrLoadModule('/src/i18n/translations.js');
  const n = [T.uz, T.uzc, T.ru].map((b) => Object.keys(b).length);
  check(`uch tilda kalitlar teng (${n.join(' / ')})`, n[0] === n[1] && n[1] === n[2]);
  check('yangilanish matnlari uch tilda', ['updateForceTitle', 'updateNow', 'updateLater', 'updateRestart', 'installAppCta'].every((k) => T.uz[k] && T.uzc[k] && T.ru[k]));
  const appSrc = src('src/App.jsx');
  check('App: yangilanish oynasi splash’dan keyin', /\{!showSplash && <AppUpdate \/>\}/.test(appSrc));
} catch (e) {
  console.error(e);
  failed += 1;
} finally {
  await server.close();
}
console.log(failed ? `\n✗ ${failed} ta xato` : '\n✓ hammasi o‘tdi');
process.exit(failed ? 1 : 0);

/* Sign in with Apple (faqat iOS): oqim mantig'i, platforma cheklovi, Telegram kirishidan mustaqillik. npm run test:apple */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { AppleAuthError, canUseApple, classifyNativeError, runAppleSignIn } from '../src/lib/appleAuthCore.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const noComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// ── soxta tarmoq va native ──
const mk = ({ challenge, login, authorize }) => {
  const calls = [];
  return {
    calls,
    deps: {
      deviceId: 'dev-1',
      post: async (path, body) => { calls.push({ path, body }); return path === '/auth/apple/challenge' ? challenge() : login(); },
      authorize: async (nonce) => { calls.push({ authorize: nonce }); return authorize(nonce); },
    },
  };
};
const okChallenge = () => ({ http: 200, data: { challengeId: 'c1', nonce: 'N-123', expiresIn: 300 } });

test('platforma cheklovi: faqat iOS + native + plugin; Android/Web/Telegram Mini App — yo\'q', () => {
  assert.equal(canUseApple({ platform: 'ios', isNative: true, hasPlugin: true }), true);
  for (const c of [
    { platform: 'android', isNative: true, hasPlugin: true }, { platform: 'web', isNative: false, hasPlugin: false },
    { platform: 'ios', isNative: false, hasPlugin: true },     // Safari/Telegram Mini App iOS'da
    { platform: 'ios', isNative: true, hasPlugin: false },      // plugin yo'q (eski native build)
    { platform: undefined, isNative: undefined, hasPlugin: undefined },
  ]) assert.equal(canUseApple(c), false, JSON.stringify(c));
});

test('muvaffaqiyatli oqim: challenge → native(nonce) → server; nonce serverdan keladi, ism uzatiladi', async () => {
  const m = mk({ challenge: okChallenge, login: () => ({ http: 200, data: { accessToken: 'A', refreshToken: 'R', user: { firstName: 'Ali' }, isNewUser: true } }), authorize: () => ({ identityToken: 'ID.TOKEN.JWT', givenName: 'Ali', familyName: 'V' }) });
  const out = await runAppleSignIn(m.deps);
  assert.equal(out.accessToken, 'A'); assert.equal(out.refreshToken, 'R');
  assert.deepEqual(m.calls.map((c) => c.path || 'native'), ['/auth/apple/challenge', 'native', '/auth/apple']);
  assert.equal(m.calls[1].authorize, 'N-123');                                       // Apple'ga aynan server nonce'i beriladi
  assert.deepEqual(m.calls[0].body, { platform: 'ios', deviceId: 'dev-1' });
  const login = m.calls[2].body;
  assert.equal(login.challengeId, 'c1'); assert.equal(login.identityToken, 'ID.TOKEN.JWT'); assert.equal(login.givenName, 'Ali'); assert.equal(login.platform, 'ios');
});

test('FOYDALANUVCHI BEKOR QILDI: jim "cancelled" xato, serverga kirish so\'rovi YUBORILMAYDI', async () => {
  for (const err of [{ code: '1001', message: 'x' }, { message: 'The operation couldn\'t be completed. (com.apple.AuthenticationServices.AuthorizationError error 1001.)' }, { message: 'User canceled' }]) {
    const m = mk({ challenge: okChallenge, login: () => assert.fail('login chaqirilmasligi kerak'), authorize: () => { throw err; } });
    await assert.rejects(() => runAppleSignIn(m.deps), (e) => e instanceof AppleAuthError && e.kind === 'cancelled');
    assert.ok(!m.calls.some((c) => c.path === '/auth/apple'));
  }
});

test('Apple xatolari: native xato / token yo\'q / challenge xatosi / server xatosi — "failed"; bloklangan — "blocked"', async () => {
  const cases = [
    ['native 1000', mk({ challenge: okChallenge, login: () => ({}), authorize: () => { throw { code: '1000', message: 'unknown' }; } }), 'failed'],
    ['token yo\'q', mk({ challenge: okChallenge, login: () => ({}), authorize: () => ({}) }), 'failed'],
    ['challenge 500', mk({ challenge: () => ({ http: 500, data: {} }), login: () => ({}), authorize: () => ({ identityToken: 't' }) }), 'failed'],
    ['challenge 404 (server o\'chirgan)', mk({ challenge: () => ({ http: 404, data: {} }), login: () => ({}), authorize: () => ({ identityToken: 't' }) }), 'failed'],
    ['tarmoq yo\'q', mk({ challenge: () => { throw new Error('net'); }, login: () => ({}), authorize: () => ({ identityToken: 't' }) }), 'failed'],
    ['server 401 (noto\'g\'ri nonce)', mk({ challenge: okChallenge, login: () => ({ http: 401, data: { code: 'NONCE_MISMATCH' } }), authorize: () => ({ identityToken: 't' }) }), 'failed'],
    ['server 410 (challenge eskirdi)', mk({ challenge: okChallenge, login: () => ({ http: 410, data: { code: 'CHALLENGE_EXPIRED' } }), authorize: () => ({ identityToken: 't' }) }), 'failed'],
    ['bloklangan 403', mk({ challenge: okChallenge, login: () => ({ http: 403, data: { code: 'BLOCKED' } }), authorize: () => ({ identityToken: 't' }) }), 'blocked'],
  ];
  for (const [name, m, kind] of cases) await assert.rejects(() => runAppleSignIn(m.deps), (e) => e instanceof AppleAuthError && e.kind === kind, name);
});

test('classifyNativeError: 1001 — bekor; boshqa kodlar — failed', () => {
  assert.equal(classifyNativeError({ code: '1001' }).kind, 'cancelled');
  assert.equal(classifyNativeError({ code: 1001 }).kind, 'cancelled');
  assert.equal(classifyNativeError({ code: '1000' }).kind, 'failed');
  assert.equal(classifyNativeError({ code: '1004', message: 'failed' }).kind, 'failed');
  assert.equal(classifyNativeError(undefined).kind, 'failed');
});

test('Android/Web: serverga so\'rov ham, tugma ham, native chaqiruv ham YO\'Q (statik kafolat)', () => {
  const a = noComments(src('src/lib/appleAuth.js'));
  // config so'rovi va signIn faqat canUse() dan keyin
  assert.ok(/export function isAppleLoginAvailable\(\) \{\s*if \(!canUse\(\)\) return Promise\.resolve\(false\);/.test(a));
  assert.ok(/export async function signInWithApple\(\) \{\s*if \(!canUse\(\)\) throw new AppleAuthError\('unsupported'\);/.test(a));
  assert.ok(a.includes("Capacitor.getPlatform() === 'ios'") && a.includes('Capacitor.isNativePlatform()') && a.includes('isPluginAvailable'));
  const btn = noComments(src('src/components/AuthGate/AppleSignInButton.jsx'));
  assert.ok(/if \(!available\) return null;/.test(btn));
  // Android loyihasida Apple yo'q; npm bog'liqlik qo'shilmagan
  const andr = (function walk(d) { let out = ''; for (const f of readdirSync(d, { withFileTypes: true })) { const p = `${d}/${f.name}`; if (f.isDirectory()) { if (!['build', '.gradle', 'node_modules'].includes(f.name)) out += walk(p); } else if (/\.(java|kt|gradle|xml|json)$/.test(f.name)) out += readFileSync(p, 'utf8'); } return out; })(new URL('../android', import.meta.url).pathname);
  assert.ok(!/AppleSignIn|applesignin|sign_in_with_apple/i.test(andr), 'Android loyihasida Apple izi bor');
  const pkg = JSON.parse(src('package.json'));
  assert.ok(!Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).some((k) => /apple/i.test(k)), 'Apple uchun npm bog\'liqlik qo\'shilmasligi kerak');
});

test('Apple moduli Telegram auth modullariga BOG\'LIQ EMAS (faqat getDeviceId o\'qiladi); faqat 2 joyda ishlatiladi', () => {
  const files = ['src/lib/appleAuth.js', 'src/lib/appleAuthCore.js', 'src/components/AuthGate/AppleSignInButton.jsx'];
  for (const f of files) {
    const imports = [...src(f).matchAll(/^import .*? from '([^']+)'/gm)].map((m) => m[1]);
    for (const spec of imports) for (const bad of ['tgLinkAuth', 'lib/telegram\'', 'lib/telegram', 'telegramWebAuth']) {
      if (bad === 'telegramWebAuth' && f === 'src/lib/appleAuth.js') continue;   // getDeviceId — faqat qurilma identifikatori (demoLogin ham shuni ishlatadi)
      if (bad === 'lib/telegram\'' || bad === 'lib/telegram') { if (spec === '@/lib/telegram' && f.endsWith('AppleSignInButton.jsx')) continue; }   // haptic()
      else assert.ok(!spec.includes(bad), `${f} → ${spec}`);
    }
  }
  const users = [];
  (function walk(d) { for (const e of readdirSync(d, { withFileTypes: true })) { const p = `${d}/${e.name}`; if (e.isDirectory()) walk(p); else if (/\.(jsx?|mjs)$/.test(e.name) && /lib\/appleAuth|AppleSignInButton/.test(readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')) && !/apple/i.test(e.name)) users.push(p.split('/src/')[1]); } })(new URL('../src', import.meta.url).pathname);
  assert.deepEqual(users.sort(), ['components/AuthGate/LokmaSignIn.jsx'], `Apple modulini kutilmagan joy import qiladi: ${users}`);
});

test('LokmaSignIn: Telegram kirish oqimi saqlangan; Apple faqat QO\'SHIMCHA (tugma idle holatda, Telegram CTA va demo tugmasidan keyin/oldin)', () => {
  const s = src('src/components/AuthGate/LokmaSignIn.jsx');
  for (const k of ['prefetchTgLogin', 'pollTgLogin', 'openExternal(r.appLink)', 'applyLoginTokens(data)', "fail('cancelled')", 'onOtherMethod', 'DemoLoginForm', 'const go = async () =>']) assert.ok(s.includes(k), `Telegram/demo oqimi o'zgargan: ${k}`);
  assert.equal((s.match(/<AppleSignInButton/g) || []).length, 1);
  // tugma boshlang'ich (idle) ko'rinishda, Telegram CTA'dan keyin
  const idle = s.slice(s.lastIndexOf("/* ───"), s.indexOf('export function GuestHero'));
  assert.ok(idle.indexOf('onClick={go}') < idle.indexOf('<AppleSignInButton'));
});

test('tarjimalar: apple_* kalitlari uz/uzc/ru', () => {
  const tr = src('src/i18n/translations.js');
  for (const k of ['apple_cta', 'apple_busy', 'apple_err', 'apple_err_blocked']) assert.equal((tr.match(new RegExp(`${k}:`, 'g')) || []).length, 3, k);
});

test('iOS native: plugin, ro\'yxatdan o\'tkazish, entitlements, Xcode loyihasi, JS bilan nom mosligi', () => {
  const swift = noComments(src('ios/App/App/AppleSignInPlugin.swift'));
  assert.ok(swift.includes('@objc(AppleSignInPlugin)') && swift.includes('CAPBridgedPlugin'));
  assert.ok(swift.includes('public let jsName = "AppleSignIn"'));
  assert.ok(src('src/lib/appleAuth.js').includes("PLUGIN_NAME = 'AppleSignIn'"));              // JS ↔ Swift nomi bir xil
  assert.ok(swift.includes('request.nonce = nonce') && swift.includes('guard let nonce = call.getString("nonce"), !nonce.isEmpty'));   // nonce MAJBURIY
  assert.ok(swift.includes('request.requestedScopes = [.fullName]') && !/\.email/.test(swift), 'email so\'ralmaydi');
  assert.ok(!/identityToken!|authorizationCode!|as! /.test(swift), 'majburiy ochish (!) bo\'lmasligi kerak');
  assert.ok(swift.includes('String(nsError.code)') && swift.includes('presentationAnchor'));
  assert.ok(src('ios/App/App/MainViewController.swift').includes('registerPluginInstance(AppleSignInPlugin())'));
  assert.ok(src('ios/App/App/MainViewController.swift').includes('registerPluginInstance(AppIconPlugin())'));   // mavjud plugin saqlangan
  const ent = src('ios/App/App/App.entitlements');
  assert.ok(ent.includes('<key>com.apple.developer.applesignin</key>') && ent.includes('<string>Default</string>'));
  const proj = src('ios/App/App.xcodeproj/project.pbxproj');
  assert.equal((proj.match(/AppleSignInPlugin\.swift/g) || []).length, 6);                      // fileRef(1)+buildFile(1)+group(1)+sources(1) + 2 izoh ichidagi
  assert.equal((proj.match(/CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements;/g) || []).length, 2);   // ilova target: Debug + Release
  assert.ok(proj.includes('App.entitlements */ = {isa = PBXFileReference; lastKnownFileType = text.plist.entitlements'));
  assert.ok(proj.includes('PRODUCT_BUNDLE_IDENTIFIER = uz.lokmago.app;'));
  assert.ok(existsSync(new URL('../ios/App/App/App.entitlements', import.meta.url)));
  // SPM paket ro'yxati (Capacitor boshqaradigan) o'zgarmagan — Apple uchun paket qo'shilmagan
  assert.ok(!/apple/i.test(src('ios/App/CapApp-SPM/Package.swift')));
});

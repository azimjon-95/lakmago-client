/*
 * Mavsumiy ikonka: JS ro'yxati ↔ iOS ↔ Android ↔ generator BIR XIL ekanini tekshiradi (biri unutilsa — ikonka jimgina almashmay qoladi).
 * Haqiqiy qurilmasiz tekshirib bo'ladigan hamma narsa: manifest, Swift/Java matnlari, pbxproj, rasm fayllari. npm run test:icons
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { ICON_THEMES } from '../src/lib/appIconSchedule.js';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const has = (p) => existsSync(new URL(p, root));
const cap = (t) => t[0].toUpperCase() + t.slice(1);
const IOS = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', ramadan: 'Ramadan', newyear: 'NewYear' };
const seasonal = ICON_THEMES.filter((t) => t !== 'default');
const RES = 'android/app/src/main/res/';

test('manba rasmlar va generator mavzulari', () => {
  const py = read('scripts/make-seasonal-icons.py');
  const list = py.match(/^THEMES = \[(.*?)\]/m)[1].match(/'(\w+)'/g).map((s) => s.slice(1, -1));
  assert.deepEqual(list, ICON_THEMES, 'make-seasonal-icons.py THEMES');
  for (const t of ICON_THEMES) assert.ok(has(`resources/app-icons/${t}.jpg`), `resources/app-icons/${t}.jpg`);
});

test('Android: har mavzuga activity-alias; faqat IconDefault yoqiq; MainActivity LAUNCHER emas', () => {
  const m = read('android/app/src/main/AndroidManifest.xml');
  const aliases = [...m.matchAll(/<activity-alias[\s\S]*?<\/activity-alias>/g)].map((x) => x[0]);
  assert.equal(aliases.length, ICON_THEMES.length);
  for (const t of ICON_THEMES) {
    const a = aliases.find((x) => x.includes(`android:name=".Icon${cap(t)}"`));
    assert.ok(a, `alias Icon${cap(t)}`);
    assert.ok(a.includes('android:targetActivity=".MainActivity"'), `${t}: targetActivity`);
    assert.ok(a.includes('android.intent.category.LAUNCHER'), `${t}: LAUNCHER filtri`);
    assert.ok(a.includes(`android:enabled="${t === 'default'}"`), `${t}: enabled faqat default uchun true`);
    const base = t === 'default' ? 'ic_launcher' : `ic_launcher_${t}`;
    assert.ok(a.includes(`android:icon="@mipmap/${base}"`) && a.includes(`android:roundIcon="@mipmap/${base}_round"`), `${t}: icon/roundIcon`);
  }
  const main = m.match(/<activity\s[^>]*android:name="\.MainActivity"[\s\S]*?(\/>|<\/activity>)/)[0];
  assert.ok(!main.includes('LAUNCHER'), 'MainActivity\'da LAUNCHER filtri qolmasligi kerak (aks holda ikkita ikonka chiqadi)');
});

test('Android: rasm resurslari (legacy, round, foreground, adaptive xml)', () => {
  for (const t of ICON_THEMES) {
    const base = t === 'default' ? 'ic_launcher' : `ic_launcher_${t}`;
    for (const d of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
      for (const suf of ['', '_round', '_foreground']) assert.ok(has(`${RES}mipmap-${d}/${base}${suf}.png`), `${d}/${base}${suf}.png`);
    }
    for (const suf of ['', '_round']) assert.ok(has(`${RES}mipmap-anydpi-v26/${base}${suf}.xml`), `anydpi ${base}${suf}.xml`);
  }
});

test('Android plagin: THEMES ro\'yxati bir xil, alias prefiksi manifest bilan mos, MainActivity ro\'yxatga oladi', () => {
  const j = read('android/app/src/main/java/uz/lokmago/app/AppIconPlugin.java');
  const list = j.match(/THEMES = \{(.*?)\}/)[1].match(/"(\w+)"/g).map((s) => s.slice(1, -1));
  assert.deepEqual(list, ICON_THEMES);
  assert.ok(j.includes('ALIAS_PREFIX = "uz.lokmago.app.Icon"'));
  assert.ok(j.includes('@CapacitorPlugin(name = "AppIcon")'));
  assert.ok(read('android/app/src/main/java/uz/lokmago/app/MainActivity.java').includes('registerPlugin(AppIconPlugin.class)'));
  assert.match(read('android/app/build.gradle'), /namespace = "uz\.lokmago\.app"/, 'alias klass nomlari namespace bo\'yicha');
});

test('iOS: har mavzuga appiconset, Swift xaritasi va pbxproj nomlari bir xil', () => {
  const swift = read('ios/App/App/AppIconPlugin.swift');
  const map = Object.fromEntries([...swift.matchAll(/"(\w+)":\s*"(AppIcon-\w+)"/g)].map((x) => [x[1], x[2]]));
  const pbx = read('ios/App/App.xcodeproj/project.pbxproj');
  const alt = [...pbx.matchAll(/ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES = "([^"]+)"/g)];
  assert.equal(alt.length, 2, 'Debug va Release');
  for (const a of alt) assert.deepEqual(a[1].split(' ').sort(), seasonal.map((t) => `AppIcon-${IOS[t]}`).sort(), 'pbxproj ALTERNATE_APPICON_NAMES');
  for (const t of seasonal) {
    assert.equal(map[t], `AppIcon-${IOS[t]}`, `Swift xaritasi: ${t}`);
    const set = `ios/App/App/Assets.xcassets/AppIcon-${IOS[t]}.appiconset`;
    const c = JSON.parse(read(`${set}/Contents.json`));
    assert.equal(c.images[0].size, '1024x1024');
    assert.ok(has(`${set}/${c.images[0].filename}`), `${t}: 1024 rasm`);
  }
  assert.deepEqual(Object.keys(map).sort(), [...seasonal].sort(), 'Swift xaritasida ortiqcha/yetishmayotgan mavzu yo\'q');
  assert.ok(has('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'));
});

test('iOS: plagin ildiz kontrollerda ro\'yxatga olinadi va loyihaga qo\'shilgan', () => {
  assert.ok(read('ios/App/App/SceneDelegate.swift').includes('window?.rootViewController = MainViewController()'));
  assert.ok(read('ios/App/App/MainViewController.swift').includes('registerPluginInstance(AppIconPlugin())'));
  assert.ok(read('ios/App/App/AppIconPlugin.swift').includes('jsName = "AppIcon"'));
  const pbx = read('ios/App/App.xcodeproj/project.pbxproj');
  for (const f of ['AppIconPlugin.swift', 'MainViewController.swift']) {
    assert.ok(pbx.includes(`/* ${f} in Sources */`), `${f}: Sources`);
    assert.ok(pbx.includes(`path = ${f};`), `${f}: fayl havolasi`);
  }
});

test('JS: plagin nomi native bilan bir xil, main.jsx ishga tushiradi', () => {
  assert.ok(read('src/lib/appIcon.js').includes("registerPlugin('AppIcon')"));
  assert.ok(read('src/main.jsx').includes('startAppIconSync()'));
});

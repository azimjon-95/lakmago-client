/*
 * Mavsumiy ilova ikonkasi: sana → mavzu (src/lib/appIconSchedule.js). Toshkent vaqti va hijriy taqvim (Ramazon/hayit).
 * npm run test:icons
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { iconThemeForDate, iconPlanForDate, ICON_THEMES, OVERRIDES } from '../src/lib/appIconSchedule.js';

// Toshkent peshin (UTC 07:00) — kun chegarasi masalalaridan xoli
const at = (iso) => new Date(`${iso}T07:00:00Z`);
const theme = (iso, opts) => iconThemeForDate(at(iso), opts);

test('fasllar: bahor / yoz / kuz', () => {
  assert.equal(theme('2026-03-25'), 'spring');     // Navro'z
  assert.equal(theme('2026-04-15'), 'spring');
  assert.equal(theme('2026-07-10'), 'summer');
  assert.equal(theme('2026-08-31'), 'summer');
  assert.equal(theme('2026-09-01'), 'autumn');
  assert.equal(theme('2026-11-30'), 'autumn');
});

test('Yangi yil: 15-dekabr … 14-yanvar; qolgan qish — asosiy logotip', () => {
  assert.equal(theme('2026-12-14'), 'default');   // 14-dekabr: kuz tugagan, Yangi yil hali boshlanmagan
  assert.equal(theme('2026-12-15'), 'newyear');
  assert.equal(theme('2026-12-31'), 'newyear');
  assert.equal(theme('2027-01-01'), 'newyear');
  assert.equal(theme('2027-01-14'), 'newyear');
  assert.equal(theme('2027-01-15'), 'default');
  assert.equal(theme('2027-02-01'), 'default');
});

test('Ramazon va Ro\'za hayit (2026): 1 Ramazon = 18-fev … 4 Shavvol = 23-mart', () => {
  assert.equal(theme('2026-02-17'), 'default');    // Sha'bon oxiri
  assert.equal(theme('2026-02-18'), 'ramadan');
  assert.equal(theme('2026-03-10'), 'ramadan');    // bahor boshi bo'lsa ham Ramazon ustun
  assert.equal(theme('2026-03-20'), 'ramadan');    // 1 Shavvol — Ro'za hayit
  assert.equal(theme('2026-03-23'), 'ramadan');
  assert.equal(theme('2026-03-24'), 'spring');
});

test('Qurbon hayit (2026): 9–13 Zulhijja = 26–30 may', () => {
  assert.equal(theme('2026-05-25'), 'spring');
  assert.equal(theme('2026-05-26'), 'ramadan');
  assert.equal(theme('2026-05-27'), 'ramadan');    // 10 Zulhijja
  assert.equal(theme('2026-05-30'), 'ramadan');
  assert.equal(theme('2026-05-31'), 'spring');
});

test('Ramazon 2027: 8-fevraldan (qish "default" ustidan)', () => {
  assert.equal(theme('2027-02-07'), 'default');
  assert.equal(theme('2027-02-08'), 'ramadan');
});

test('Toshkent vaqti: UTC kechqurun — Toshkentda ertasi kun', () => {
  // 2026-05-31 20:00 UTC = 2026-06-01 01:00 Toshkent → yoz boshlandi (va Qurbon hayit tugagan)
  assert.equal(iconThemeForDate(new Date('2026-05-31T20:00:00Z')), 'summer');
  // 2026-12-31 20:00 UTC = 2027-01-01 01:00 Toshkent
  assert.equal(iconThemeForDate(new Date('2026-12-31T20:00:00Z')), 'newyear');
  // 2026-08-31 20:00 UTC = 2026-09-01 01:00 Toshkent → kuz
  assert.equal(iconThemeForDate(new Date('2026-08-31T20:00:00Z')), 'autumn');
});

test('OVERRIDES: qo\'lda belgilangan sana hamma narsadan ustun; noma\'lum mavzu e\'tiborsiz', () => {
  const ov = [{ from: '2026-07-01', to: '2026-07-03', theme: 'ramadan' }, { from: '2026-07-10', to: '2026-07-12', theme: 'nomalum' }];
  assert.deepEqual(iconPlanForDate(at('2026-07-02'), { overrides: ov }), { theme: 'ramadan', reason: 'override' });
  assert.equal(iconPlanForDate(at('2026-07-03'), { overrides: ov }).theme, 'ramadan');   // chegara kiradi
  assert.equal(iconPlanForDate(at('2026-07-04'), { overrides: ov }).theme, 'summer');
  assert.equal(iconPlanForDate(at('2026-07-11'), { overrides: ov }).theme, 'summer');    // noma'lum mavzu o'tkazib yuboriladi
  assert.ok(Array.isArray(OVERRIDES));
});

test('yil bo\'yi: har kun faqat ma\'lum mavzu qaytadi, va 6 ta mavzuning HAMMASI uchraydi', () => {
  const seen = new Set();
  for (let d = Date.UTC(2026, 0, 1); d < Date.UTC(2028, 0, 1); d += 86400000) {
    const t = iconThemeForDate(new Date(d + 7 * 3600000));
    assert.ok(ICON_THEMES.includes(t), t);
    seen.add(t);
  }
  assert.deepEqual([...seen].sort(), [...ICON_THEMES].sort());
});

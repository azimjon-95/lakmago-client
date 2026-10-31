/**
 * Mavsumiy ilova ikonkasi: SANAGA qarab qaysi mavzu bo'lishi kerakligi (toza mantiq — Capacitor/DOM kerak emas).
 * Natijani native plagin (AppIcon: iOS alternate icon / Android activity-alias) qo'llaydi — src/lib/appIcon.js.
 *
 * Sana — TOSHKENT vaqti bo'yicha (qurilma vaqt mintaqasidan mustaqil, lib/tashkentTime.js bilan bir xil qoida).
 *
 * Ustuvorlik (yuqoridan pastga, birinchi mos kelgani):
 *   1. OVERRIDES            — qo'lda belgilangan aniq sanalar (pastda)
 *   2. 'ramadan'            — Ramazon oyi + Ro'za hayit (1–4 Shavvol) hamda Qurbon hayit (9–13 Zulhijja) — hijriy taqvim
 *   3. 'newyear'            — 15-dekabr … 14-yanvar
 *   4. fasllar              — 'spring' mart–may · 'summer' iyun–avgust · 'autumn' sentabr–noyabr
 *   5. 'default'            — 15-yanvar … fevral oxiri (asosiy logotip)
 *
 * Hijriy sana Intl 'islamic-umalqura' (Umm al-Qura) bo'yicha: O'zbekistonda Ramazon/hayit bir kun farq qilishi mumkin.
 * Shu sababli oynalar biroz kengroq (hayit 4 kun) — xato ko'pi bilan 1 kunlik erta/kech almashish. Aniq sanani belgilash:
 * OVERRIDES ga { from, to, theme } qo'shing (masalan Muftiyat e'lon qilgan Ramazon sanalari).
 *
 * MAVZULAR RO'YXATI native tomon bilan BIR XIL bo'lishi shart (tests/appIconNative.test.mjs tekshiradi):
 * AppIconPlugin.java, AppIconPlugin.swift, AndroidManifest.xml, pbxproj, scripts/make-seasonal-icons.py.
 */
import { tashkentParts } from './tashkentTime.js';

export const ICON_THEMES = ['default', 'spring', 'summer', 'autumn', 'ramadan', 'newyear'];

/** Qo'lda belgilangan sanalar (ikkala chegara ham KIRADI), 'YYYY-MM-DD' (Toshkent). Hozircha bo'sh. */
export const OVERRIDES = [
  // { from: '2027-02-08', to: '2027-03-12', theme: 'ramadan' },
];

let hijriFmt;
function hijriParts(date) {
  try {
    hijriFmt = hijriFmt || new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'Asia/Tashkent', day: 'numeric', month: 'numeric', year: 'numeric' });
    const parts = hijriFmt.formatToParts(date);
    const get = (t) => Number(parts.find((p) => p.type === t)?.value);
    const month = get('month'); const day = get('day');
    return month >= 1 && month <= 12 && day >= 1 && day <= 30 ? { month, day } : null;
  } catch {
    return null;                       // Intl hijriy taqvimni bilmasa — faqat grigorian qoidalar ishlaydi
  }
}

const pad = (n) => String(n).padStart(2, '0');

/** { theme, reason } — reason: 'override' | 'ramadan' | 'eid-al-adha' | 'newyear' | 'spring' | 'summer' | 'autumn' | 'winter'. */
export function iconPlanForDate(date = new Date(), { overrides = OVERRIDES } = {}) {
  const { year, month, day } = tashkentParts(date);
  const iso = `${year}-${pad(month)}-${pad(day)}`;

  const o = overrides.find((x) => iso >= x.from && iso <= x.to && ICON_THEMES.includes(x.theme));
  if (o) return { theme: o.theme, reason: 'override' };

  const h = hijriParts(date);
  if (h) {
    if (h.month === 9 || (h.month === 10 && h.day <= 4)) return { theme: 'ramadan', reason: 'ramadan' };
    if (h.month === 12 && h.day >= 9 && h.day <= 13) return { theme: 'ramadan', reason: 'eid-al-adha' };
  }

  if (month === 12 && day >= 15) return { theme: 'newyear', reason: 'newyear' };
  if (month === 1 && day <= 14) return { theme: 'newyear', reason: 'newyear' };
  if (month >= 3 && month <= 5) return { theme: 'spring', reason: 'spring' };
  if (month >= 6 && month <= 8) return { theme: 'summer', reason: 'summer' };
  if (month >= 9 && month <= 11) return { theme: 'autumn', reason: 'autumn' };
  return { theme: 'default', reason: 'winter' };
}

export const iconThemeForDate = (date, opts) => iconPlanForDate(date, opts).theme;

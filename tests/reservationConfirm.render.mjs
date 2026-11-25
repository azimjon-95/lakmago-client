/*
 * BRON TASDIQLASH OYNASI (2026-11-25): "Tasdiqlash" serverga DARHOL yubormaydi — avval tekshiruv oynasi.
 *  [1] Oyna: restoran, qachon, mehmonlar, kim nomiga, taomlar + jami, tavsif maydoni (≤300), hisob eslatmasi.
 *  [2] Sinov: PreOrderScreen asosiy tugmasi onConfirm'ni chaqirmaydi; yuborish faqat oynadagi tugma orqali.
 *  [3] ReservationPage izohni serverga yuboradi; i18n 3 til muvozanatda.
 * Vite SSR orqali. npm run test:reservation-confirm
 */
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';

const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: (k) => { mem.delete(k); } };
globalThis.window = globalThis.window || { localStorage: globalThis.localStorage };
globalThis.window.localStorage = globalThis.localStorage;

const server = await createServer({ root: process.cwd(), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
let failed = 0;
const check = (name, cond, extra = '') => { console.log((cond ? '  ✓ ' : '  ✗ FAIL: ') + name + (cond ? '' : ` ${extra}`)); if (!cond) failed += 1; };
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

try {
  const { translations } = await server.ssrLoadModule('/src/i18n/translations.js');
  const { ReservationConfirmSheet, NOTE_MAX } = await server.ssrLoadModule('/src/pages/Reservation/ReservationConfirmSheet.jsx');
  const t = (k, p) => (translations.uz[k] ?? k).replace(/\{(\w+)\}/g, (m, n) => (p && n in p ? p[n] : m));
  const selected = [
    { dish: { id: 'd1', name: 'Tovuqli pide', price: 40000 }, qty: 2 },
    { dish: { id: 'd2', name: 'Kanada hot-dog', price: 15000 }, qty: 1 },
  ];
  const props = {
    restaurantName: 'Ziynat Restaurant', dateLabel: '25-noyabr', time: '20:00', guests: 6, name: 'Xumora', phone: '+998 50 188 74 14',
    selected, total: 95000, note: 'Tort bor', onNoteChange() {}, onClose() {}, onEditForm() {}, onSend() { throw new Error('render paytida yuborilmasin'); },
    sending: false, error: '', t,
  };

  console.log('\n[1] Tekshiruv oynasi');
  const html = renderToString(React.createElement(ReservationConfirmSheet, props));
  const text = html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  check('restoran, sana-vaqt, mehmonlar', text.includes('Ziynat Restaurant') && text.includes('25-noyabr') && text.includes('20:00') && /6\s*kishi/.test(text));
  check('kim nomiga: ism va telefon', text.includes('Xumora') && text.includes('+998 50 188 74 14'));
  check('taomlar, soni, qator summasi va jami', text.includes('Tovuqli pide') && text.includes('2×') && text.includes('80') && text.includes('Kanada hot-dog') && text.includes('95'));
  check('uchta "O‘zgartirish" tugmasi (vaqt, mehmon, mijoz)', (html.match(/rcs-row__edit/g) || []).length === 3);
  check('tavsif maydoni: textarea, maxLength=300, to‘ldirilgan matn va hisoblagich', html.includes('maxLength="300"') && html.includes('>Tort bor</textarea>') && text.includes('8/300') && NOTE_MAX === 300);
  check('tezkor tanlov (chip) tugmalari', (html.match(/class="rcs-chip"/g) || []).length === 4);
  check('"Tasdiqlash va yuborish" va "Tahrirlash" tugmalari', text.includes('Tasdiqlash va yuborish') && text.includes('Tahrirlash'));
  const empty = renderToString(React.createElement(ReservationConfirmSheet, { ...props, selected: [], total: 0 }));
  check('taom tanlanmagan bo‘lsa — aniq yozuv, jami qatori yo‘q', empty.includes('Taom tanlanmagan') && !empty.includes('rcs-dish--total'));
  const busy = renderToString(React.createElement(ReservationConfirmSheet, { ...props, sending: true, error: 'Xato matni' }));
  check('yuborilayotganda tugmalar o‘chiq, xato ko‘rinadi', busy.includes('Yuborilmoqda...') && busy.includes('Xato matni') && (busy.match(/disabled=""/g) || []).length >= 6);

  console.log('\n[2] Oqim (manba tekshiruvi)');
  const pre = src('src/pages/Reservation/PreOrderScreen.jsx');
  const mainBtn = pre.slice(pre.indexOf('resv-preorder-actions'));
  check('asosiy "Tasdiqlash" tugmasi oynani ochadi (onConfirm to‘g‘ridan-to‘g‘ri emas)', /onClick=\{\(\) => \{ haptic\(\); setConfirmOpen\(true\); \}\}/.test(mainBtn));
  check('onConfirm faqat oynadagi onSend ichida', (pre.match(/onConfirm\(/g) || []).length === 1 && /onSend=\{\(\) => onConfirm\(selected, note\)\}/.test(pre));
  check('"O‘zgartirish" formaga qaytaradi (onBack)', /onEditForm=\{onBack\}/.test(pre));

  console.log('\n[3] Izoh serverga, i18n');
  const page = src('src/pages/Reservation/ReservationPage.jsx');
  check('izoh createReservation payload\'ida (note)', /note: String\(noteText \|\| ''\)\.trim\(\)/.test(page) && !/note: '',/.test(page));
  check('izoh va taomlar formaga qaytganda saqlanadi', page.includes('initialSelections={selectionsRef.current}') && page.includes('onNoteChange={setNote}'));
  const keys = Object.keys(translations.uz).filter((k) => k.startsWith('resv') && !['reservationSent'].includes(k));
  const miss = keys.filter((k) => !(k in translations.uzc) || !(k in translations.ru));
  check('resv* kalitlari uchala tilda', keys.length >= 18 && miss.length === 0, miss.join(','));
  check('uch til kalitlari soni teng', Object.keys(translations.uz).length === Object.keys(translations.uzc).length && Object.keys(translations.uz).length === Object.keys(translations.ru).length);
} finally {
  await server.close();
}
console.log(failed ? `\n✗ ${failed} ta xato` : '\n✓ hammasi o‘tdi');
process.exit(failed ? 1 : 0);

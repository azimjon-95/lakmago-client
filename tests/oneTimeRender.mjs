/*
 * Bir martalik "Hozirgi joyim" interfeysi: Vite SSR orqali turli holatlarda chizib ko'rish (brauzer/jsdom kerak emas).
 * npm run test:once:render   (GPS/geokodlash ishlamaydi — faqat render; mantiq: tests/currentFix.test.mjs)
 */
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const server = await createServer({ root: process.cwd(), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const { CurrentLocationStep } = await server.ssrLoadModule('/src/components/CurrentLocationStep.jsx');
  const { CurrentLocationSheet } = await server.ssrLoadModule('/src/components/CurrentLocationSheet.jsx');
  const { AddressSheet } = await server.ssrLoadModule('/src/components/AddressSheet.jsx');
  const { OrderConfirmModal } = await server.ssrLoadModule('/src/components/OrderConfirmModal.jsx');
  const { I18nProvider } = await server.ssrLoadModule('/src/i18n/index.jsx');
  const h0 = React.createElement;
  // Har bir komponent tarjima provayderi ichida chiziladi
  const h = (C, props) => h0(I18nProvider, null, h0(C, props));
  const has = (html, s) => html.includes(s);
  const out = [];
  const check = (name, cond) => { out.push((cond ? '  ✓ ' : '  ✗ FAIL: ') + name); if (!cond) process.exitCode = 1; };

  // 1) GPS hali aniqlanmoqda (initial yo'q)
  let html = renderToString(h(CurrentLocationStep, { restaurants: [], onBack() {}, onClose() {}, onConfirm() {} }));
  check('locating: kutish holati va xarita o\'rnida placeholder', has(html, 'data-testid="once-map-wait"') && has(html, 'data-testid="once-locating"'));
  check('locating: "Ha, shu manzilga" bloklangan', /data-testid="once-confirm"[^>]*disabled|disabled=""[^>]*data-testid="once-confirm"/.test(html));
  check('locating: textarea hali yo\'q', !has(html, 'data-testid="once-text"'));
  check('locating: "saqlanmaydi" izohi bor', has(html, 'saqlanmaydi'));

  // 2) Tahrirlash (initial): GPS ishga tushmaydi, matn va tugma
  const initial = { id: 'once-gps', isOneTime: true, lat: 41.3, lng: 69.2, accuracy: 18, manual: false, address: 'Chilonzor 5, maktab yonida' };
  html = renderToString(h(CurrentLocationStep, { restaurants: [], initial, onBack() {}, onClose() {}, onConfirm() {} }));
  check('ready(ok): textarea ichida saqlangan matn', has(html, 'data-testid="once-text"') && has(html, 'Chilonzor 5, maktab yonida'));
  check('ready(ok): holat "once-ready-ok"', has(html, 'data-testid="once-ready-ok"'));
  check('ready(ok): tasdiqlash tugmasi YOQILGAN', !/data-testid="once-confirm"[^>]*disabled/.test(html) && !/disabled=""[^>]*data-testid="once-confirm"/.test(html));
  check('ready(ok): "Manzil va mo\'ljal" yorlig\'i', has(html, 'Manzil va mo&#x27;ljal') || has(html, "Manzil va mo'ljal"));

  // 3) Qo'lda xaritadan tanlangan nuqta
  html = renderToString(h(CurrentLocationStep, { restaurants: [], initial: { ...initial, manual: true, accuracy: null }, onBack() {}, onClose() {}, onConfirm() {} }));
  check('manual: holat "once-ready-manual"', has(html, 'data-testid="once-ready-manual"'));

  // 4) Matn bo'sh — tasdiqlab bo'lmaydi
  html = renderToString(h(CurrentLocationStep, { restaurants: [], initial: { ...initial, address: '' }, onBack() {}, onClose() {}, onConfirm() {} }));
  check('matnsiz: tugma bloklangan va "yozing" eslatmasi', (/data-testid="once-confirm"[^>]*disabled|disabled=""[^>]*data-testid="once-confirm"/.test(html)) && has(html, 'once-field__hint is-need'));

  // 5) Mustaqil oyna
  html = renderToString(h(CurrentLocationSheet, { restaurants: [], onConfirm() {}, onClose() {} }));
  check('mustaqil oyna chiziladi (ocm-sheet--map)', has(html, 'ocm-sheet--map') && has(html, 'data-testid="once-map-wait"'));

  // 6) AddressSheet: "Hozirgi joyimga yetkazish" tugmasi faqat onCurrent berilganda
  const base = { addresses: [], selectedId: null, onSelect() {}, onAdd() {}, onClose() {} };
  check('AddressSheet: onCurrent yo\'q — tugma yo\'q', !has(renderToString(h(AddressSheet, base)), 'addr-sheet-current'));
  check('AddressSheet: onCurrent bor — tugma bor', has(renderToString(h(AddressSheet, { ...base, onCurrent() {} })), 'addr-sheet-current'));

  // 7) Tasdiqlash oynasi (1-qadam) bir martalik manzil bilan chiziladi
  const pricing = { subtotal: 1000, deliveryFee: 0, serviceFee: 0, pickupDiscount: 0 };
  html = renderToString(h(OrderConfirmModal, { groups: [], pricing, total: 1000, onClose() {}, onConfirm() {}, submitting: false, address: initial, onUseOneTime() {}, onClearOneTime() {}, restaurants: [] }));
  check('OrderConfirmModal (bir martalik manzil bilan) xatosiz chiziladi', has(html, 'ocm-sheet') && has(html, 'ocm-steps'));
  console.log(out.join('\n'));
} finally { await server.close(); }

/*
 * «Qayerga yetkazamiz?» kartasi (FarDecision) va savat ulanishi: Vite SSR orqali chizib ko'rish. npm run test:device:render
 */
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';

globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const server = await createServer({ root: process.cwd(), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
let failed = 0;
const check = (name, cond) => { console.log((cond ? '  ✓ ' : '  ✗ FAIL: ') + name); if (!cond) failed += 1; };
try {
  const { FarDecision } = await server.ssrLoadModule('/src/components/FarDecision.jsx');
  const { I18nProvider } = await server.ssrLoadModule('/src/i18n/index.jsx');
  const h = React.createElement;
  const r = (p) => renderToString(h(I18nProvider, null, h(FarDecision, { onNow() {}, onKeep() {}, ...p })));
  const base = { distanceM: 8200, name: 'Uy', address: 'Tets/Nurobod mfy Tinchlik 6' };

  let html = r(base);
  check('sarlavha va masofa ko\'rinadi', html.includes('Qayerga yetkazamiz?') && html.includes('Uy') && /8[,.]2\s*km/.test(html));
  check('ikki tanlov: «Hozirgi joyimga» (Tavsiya) va saqlangan manzil', html.includes('data-testid="far-now"') && html.includes('data-testid="far-saved"') && html.includes('Tavsiya') && html.includes('Tinchlik 6'));
  check('tasdiq bosqichi hali ko\'rinmaydi (tasodifan o\'tib ketib bo\'lmaydi)', !html.includes('far-confirm') && !html.includes('far-yes'));
  html = r({ ...base, initialConfirming: true });
  check('saqlangan manzil tasdig\'i: ogohlantirish + «Ha, u yerda kutib olishadi» + orqaga', html.includes('data-testid="far-confirm"') && html.includes('Ha, u yerda kutib olishadi') && html.includes('Kuryer siz turgan joyga emas') && !html.includes('far-now'));
  html = r({ ...base, busy: true });
  check('yuborilayotganda tugmalar o\'chirilgan', (html.match(/disabled=""/g) || []).length >= 2);
  check('ekran o\'qiydigan dasturlar uchun: group + sarlavhaga bog\'langan', html.includes('role="group"') && html.includes('aria-labelledby="fd-title"'));

  const modal = readFileSync('src/components/OrderConfirmModal.jsx', 'utf8');
  check('tasdiqlash oynasi: uzoq bo\'lsa tugma o\'chiriladi va tanlov tasdig\'i serverga uzatiladi', /disabled=\{submitting \|\| Boolean\(blocked\) \|\| farBlock\}/.test(modal) && modal.includes('onConfirm({ farConfirmed })'));
  check('bir martalik manzil uchun majburiy tanlov yo\'q (o\'zi tanlagan)', modal.includes('!isOnce && isFarBlock(gps)'));
  check('ortiqcha «Hozirgi joyimga yetkazish» qatori olib tashlangan (karta va «Boshqa manzil» ro‘yxati taklif qiladi)', !modal.includes('data-testid="once-open"') && modal.includes('once-back-saved'));
  check('qaror rejimida manzil kartasi yashirilgan va ildiz sinfi qo‘yiladi (skrolsiz sig‘ish)', modal.includes("ocm-addr${farBlock ? ' ocm-addr--far' : ''}") && /\{!farBlock && \(\s*<div className="ocm-addr-card2">/.test(modal));
  check('tugma tushuntiradi: «Avval yetkazish joyini tanlang»', modal.includes("farBlock ? t('farPickFirst') : yesLabel"));
  const css = readFileSync('src/components/FarDecision.css', 'utf8');
  check('past ekranda (≤720 px) xarita yashiriladi, qaror kartasi qoladi', /max-height: 720px\) \{ \.ocm-addr--far \.ocm-map \{ display: none; \} \}/.test(css));
  check('bo\'sh joy taqsimlanadi: xarita (6:1, 250 px gacha) + karta atrofi kengayadi — pastda bo\'shliq qolmaydi', /\.ocm-addr--far \.ocm-map \{ flex: 6 1 0; min-height: 96px; max-height: 250px; \}/.test(css) && /\.ocm-sheet--map \.ocm-addr--far \.ocm-addr__scroll \{ flex: 1 1 auto; justify-content: center; \}/.test(css));
  check('karta ekran balandligiga qarab kattalashadi (dvh)', /\.fd-opt \{ min-height: clamp\(58px, 8\.4dvh, 80px\)/.test(css) && /\.fd-title \{ font-size: clamp\(18px, 2\.7dvh, 22px\)/.test(css));
  const cart = readFileSync('src/pages/Cart/CartPage.jsx', 'utf8');
  check('savat: qurilma dalili buyurtma bilan yuboriladi (faqat yetkazishda)', cart.includes('buildDeviceFields({ fix: useDeviceLocation.getState().fix') && cart.includes('!isPickup ? buildDeviceFields'));
} finally { await server.close(); }
if (failed) { console.log(`\n${failed} ta xato`); process.exit(1); }
console.log('\nHammasi o‘tdi');

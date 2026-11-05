/* Karta to'lovi: yoqilgan, faqat Click ko'rsatiladi (src/config/features.js). npm run test:card */
import test from 'node:test';
import assert from 'node:assert/strict';
import { CARD_PAYMENT_ENABLED, CARD_PROVIDERS_ALLOWED, filterCardProviders } from '../src/config/features.js';

test('karta orqali to\'lov YOQILGAN va faqat Click ruxsat etilgan', () => {
  assert.equal(CARD_PAYMENT_ENABLED, true);
  assert.deepEqual(CARD_PROVIDERS_ALLOWED, ['click']);
});

test('server hamma provayderni qaytarsa ham mijozga FAQAT Click chiqadi (Paynet/Payme yashirin)', () => {
  const server = [{ name: 'click', supportsSplit: true }, { name: 'paynet', supportsSplit: false }, { name: 'payme' }];
  assert.deepEqual(filterCardProviders(server), [{ name: 'click', supportsSplit: true }]);
  assert.deepEqual(filterCardProviders([{ name: 'paynet' }, { name: 'payme' }]), [], 'Click sozlanmagan bo\'lsa — karta tugmasi chiqmaydi');
  assert.deepEqual(filterCardProviders([{ name: 'CLICK' }]).length, 1, 'registrga e\'tibor bermaydi');
});

test('noto\'g\'ri javob xavfsiz: bo\'sh ro\'yxat', () => {
  for (const bad of [undefined, null, {}, 'click', 42]) assert.deepEqual(filterCardProviders(bad), []);
  assert.deepEqual(filterCardProviders([null, {}, { name: null }]), []);
});

test('savat shu filtrdan foydalanadi va demo hisob kartadan chetlatilgan', async () => {
  const { readFileSync } = await import('node:fs');
  const cart = readFileSync(new URL('../src/pages/Cart/CartPage.jsx', import.meta.url), 'utf8');
  assert.ok(cart.includes('filterCardProviders(st?.available)') && cart.includes('!user?.isDemo'));
});

/*
 * Bir martalik manzil ↔ saqlangan manzil: ARALASHMASLIK qoidalari (src/lib/oneTimeAddress.js, src/store/oneTimeAddress.js).
 * npm run test:once
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ONCE_ID, makeOneTimeAddress, isOneTime, isOneTimeReady, looksLikeCoords, prefillText, orderAddressFields,
} from '../src/lib/oneTimeAddress.js';
import { useOneTimeAddress } from '../src/store/oneTimeAddress.js';

const saved = { id: 'a1', title: 'Uy', address: 'Tinchlik 6', lat: 41.3, lng: 69.2, entrance: '2', floor: '5', flat: '14', note: 'Domofon yo\'q' };

test('makeOneTimeAddress: yangi obyekt, saqlangan manzil shakli bilan aralashmaydi', () => {
  const a = makeOneTimeAddress({ lat: '41.31', lng: 69.24, accuracy: 23.6, text: '  Chilonzor 5, maktab yonida ' });
  assert.equal(a.id, ONCE_ID);
  assert.equal(a.isOneTime, true);
  assert.equal(a.lat, 41.31);
  assert.equal(a.accuracy, 24);
  assert.equal(a.address, 'Chilonzor 5, maktab yonida');
  assert.equal(isOneTime(a), true);
  assert.equal(isOneTime(saved), false);
  assert.equal('title' in a, false, 'sarlavha obyektga yozilmaydi (tarjimadan olinadi)');
});

test('isOneTimeReady: nuqta + matn (≥ 3 belgi) kerak', () => {
  assert.equal(isOneTimeReady(makeOneTimeAddress({ lat: 41.3, lng: 69.2, text: 'Uy yonida' })), true);
  assert.equal(isOneTimeReady(makeOneTimeAddress({ lat: 41.3, lng: 69.2, text: 'a' })), false);
  assert.equal(isOneTimeReady(makeOneTimeAddress({ lat: 0, lng: 0, text: 'Uy yonida' })), false);
  assert.equal(isOneTimeReady(saved), false);
});

test('koordinata matni foydali manzil emas: geokodlash ishlamasa textarea bo\'sh qoladi', () => {
  assert.equal(looksLikeCoords('41.31108, 69.24056'), true);
  assert.equal(looksLikeCoords('Chilonzor 5-mavze'), false);
  assert.equal(prefillText({ full: '41.31108, 69.24056' }), '');
  assert.equal(prefillText({ full: 'Toshkent, Chilonzor, 5' }), 'Toshkent, Chilonzor, 5');
  assert.equal(prefillText(null), '');
});

test('buyurtma maydonlari: bir martalik — matn labelda, izoh yo\'q; saqlangan — avvalgidek', () => {
  const once = makeOneTimeAddress({ lat: 41.3, lng: 69.2, text: 'Chilonzor 5, maktab yonida' });
  assert.deepEqual(orderAddressFields(once, { onceTitle: 'Hozirgi joyim' }), { label: 'Hozirgi joyim — Chilonzor 5, maktab yonida', note: '' });
  assert.deepEqual(orderAddressFields(saved), { label: 'Uy — Tinchlik 6', note: '2-kirish, 5-qavat, xon. 14, Domofon yo\'q' });
  assert.deepEqual(orderAddressFields(null), { label: '', note: '' });
});

test('store: xotirada, set/clear; saqlangan manzillarga TEGMAYDI', () => {
  const s = useOneTimeAddress;
  assert.equal(s.getState().address, null);
  const a = makeOneTimeAddress({ lat: 41.3, lng: 69.2, text: 'Uy yonida' });
  s.getState().set(a);
  assert.equal(s.getState().address, a);
  s.getState().clear();
  assert.equal(s.getState().address, null, 'buyurtmadan keyin tozalanadi');
});

test('store persist QILMAYDI (localStorage\'ga yozilmaydi) va user store\'ni import qilmaydi', () => {
  const code = readFileSync(new URL('../src/store/oneTimeAddress.js', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/persist\(|createJSONStorage|localStorage/.test(code), 'persist yo\'q');
  assert.ok(!/store\/user/.test(code), 'user store bilan bog\'lanmagan');
});

test('CartPage: bir martalik manzil saqlangan-manzil funksiyalariga CHAQIRILMAYDI (aralashmaslik kafolati)', () => {
  const cart = readFileSync(new URL('../src/pages/Cart/CartPage.jsx', import.meta.url), 'utf8');
  // tahrirlash faqat saqlangan manzil uchun
  assert.ok(/showAddressEdit && selectedAddress && !oneTimeAddress/.test(cart), 'AddressEditSheet bir martalikka ochilmaydi');
  // buyurtma yaratilgach tozalanadi
  assert.ok(/\.then\(async \(created\) => \{[\s\S]*?clearOneTime\(\);[\s\S]*?if \(paymentMethod === 'cash'\)/.test(cart), 'buyurtma yaratilgach (naqd/karta tarmoqlanishidan OLDIN) tozalanadi');
  // saqlangan manzil tanlanganda / yangisi qo'shilganda bir martalik tozalanadi
  assert.ok(/onSelect=\{\(id\) => \{ clearOneTime\(\); setDefaultAddress\(id\)/.test(cart), 'saqlangan manzil tanlansa — bir martalik o\'chadi');
  assert.ok(/onSave=\{\(addr\) => \{ clearOneTime\(\); addAddress\(addr\)/.test(cart), 'yangi saqlangan manzil — bir martalik o\'chadi');
  // updateAddress/setDefaultAddress/addAddress hech qachon `oneTimeAddress`/`ONCE_ID` bilan chaqirilmaydi
  assert.ok(!/(updateAddress|setDefaultAddress|addAddress)\([^)]*(oneTime|ONCE_ID)/.test(cart));
});

/*
 * ═══ BIR MARTALIK (HOZIRGI JOY) MANZIL ═══
 *
 * QAT'IY QOIDA: bir martalik GPS manzil va SAQLANGAN manzillar bir-biriga ARALASHMASIN.
 *   • Bir martalik manzil faqat xotirada (store/oneTimeAddress.js, localStorage'ga YOZILMAYDI) va FAQAT joriy buyurtma uchun;
 *   • u `user.addresses` ga, serverdagi manzillar ro'yxatiga, `defaultAddressId` ga HECH QACHON qo'shilmaydi
 *     (user store'ning addAddress / setDefaultAddress / updateAddress funksiyalari unga umuman chaqirilmaydi);
 *   • buyurtma yaratilgach tozalanadi — keyingi buyurtmada avtomatik tanlanmaydi.
 * Server buyurtmada `address` matni + addressLat/addressLng ni saqlangan manzilsiz qabul qiladi (controllers/misc.js).
 *
 * Toza mantiq (React/DOM kerak emas) — tests/oneTimeAddress.test.mjs.
 */
import { hasValidCoords } from './addressCoords.js';

export const ONCE_ID = 'once-gps';
export const ONCE_TEXT_MIN = 3;
export const ONCE_TEXT_MAX = 250;

/** Manzil sifatida "41.31108, 69.24056" ko'rinishidagi koordinata matni (geokodlash ishlamaganda) — bu foydali matn emas. */
export function looksLikeCoords(text) {
  return /^\s*-?\d{1,3}(\.\d+)?\s*[,;]\s*-?\d{1,3}(\.\d+)?\s*$/.test(String(text || ''));
}

/** Geokodlash natijasidan textarea uchun boshlang'ich matn (koordinata matni bo'lsa — bo'sh: mijoz o'zi yozadi). */
export function prefillText(geo) {
  const full = String(geo?.full || '').trim();
  return full && !looksLikeCoords(full) ? full.slice(0, ONCE_TEXT_MAX) : '';
}

/** Bir martalik manzil obyekti. `title` ko'rsatishda tarjimadan olinadi (obyektga yozilmaydi). */
export function makeOneTimeAddress({ lat, lng, accuracy = null, text = '', manual = false }) {
  return {
    id: ONCE_ID,
    isOneTime: true,
    lat: Number(lat),
    lng: Number(lng),
    accuracy: Number.isFinite(accuracy) ? Math.round(accuracy) : null,
    manual: Boolean(manual),           // xaritadan qo'lda tanlangan (GPS emas)
    address: String(text || '').trim().slice(0, ONCE_TEXT_MAX),
  };
}

export const isOneTime = (a) => a?.isOneTime === true;

/** Tasdiqlashga yaroqlimi: haqiqiy nuqta + manzil/mo'ljal matni. */
export function isOneTimeReady(a) {
  return isOneTime(a) && hasValidCoords(a) && a.address.trim().length >= ONCE_TEXT_MIN;
}

/**
 * Buyurtmaga ketadigan manzil maydonlari: { label, note }.
 *   bir martalik — label: "<Hozirgi joyim> — <matn>", note: '' (mo'ljal matnning ichida);
 *   saqlangan    — label: "<sarlavha> — <manzil>", note: podyezd/qavat/xonadon/izoh (avvalgi xatti-harakat BIR XIL).
 */
export function orderAddressFields(address, { onceTitle = '' } = {}) {
  if (!address) return { label: '', note: '' };
  if (isOneTime(address)) return { label: `${onceTitle} — ${address.address}`, note: '' };
  return {
    label: `${address.title} — ${address.address}`,
    note: [
      address.entrance && `${address.entrance}-kirish`,
      address.floor && `${address.floor}-qavat`,
      address.flat && `xon. ${address.flat}`,
      address.note,
    ].filter(Boolean).join(', '),
  };
}

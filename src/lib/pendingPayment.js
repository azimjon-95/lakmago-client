/*
 * ═══ KUTILAYOTGAN TO'LOV — localStorage'da saqlanadi ═══
 *
 * Mijoz karta bilan to'lashni boshlaganda (Click sahifasiga
 * o'tkazilganda), buyurtma serverda 'awaiting_payment' bilan
 * yaratiladi va PUL HALI YECHILMAGAN. Shu payt savatni tozalab
 * yuborsak, mijoz to'lovni bekor qilsa yoki uzilib qolsa —
 * taomlarini butunlay yo'qotadi.
 *
 * Shuning uchun bu holat localStorage'da saqlanadi (React
 * state emas — Telegram `openLink` chaqirilganda WebApp fon
 * rejimiga o'tishi yoki qayta yuklanishi mumkin, oddiy state
 * yo'qolib ketardi). Mijoz ilovaga qaytganda CartPage shu
 * yozuvni o'qib, serverdan haqiqiy holatni so'raydi.
 */

const KEY = 'lokma_pending_payment';

/*
 * Muddat — 6 SOAT (ilgari 30 daqiqa edi).
 *
 * NIMA UCHUN UZAYTIRILDI: 30 daqiqa juda qisqa edi. Mijoz Click
 * sahifasini ochiq qoldirib, yarim soatdan keyin to'lasa, yozuv
 * allaqachon o'chib ketgan bo'lardi. Natijada pul yechilgan,
 * buyurtma restoranga chiqqan, LEKIN ilova buni bilmay savatni
 * to'la qoldirardi — mijoz "buyurtmam ketmadi" deb o'ylab IKKINCHI
 * MARTA buyurtma berishi va IKKI MARTA TO'LASHI mumkin edi.
 */
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

/*
 * Karta to'lovi boshlanganda chaqiriladi.
 *
 * RO'YXAT SIFATIDA saqlanadi (ilgari bitta yozuv edi). Sabab:
 * mijoz to'lovni boshlab, to'lamasdan qaytib, YANA boshlasa,
 * eski orderId ustidan yozilib ketardi va birinchi buyurtma
 * "osilib" qolardi — agar mijoz keyin o'sha birinchi havola
 * orqali to'lasa, ilova buni umuman sezmasdi.
 *
 * @param {string} orderId
 * @param {string} [provider] - 'click' | 'paynet' ... Qayta urinishda
 *   AYNAN SHU provayder ishlatiladi. Ilgari bu saqlanmasdi va qayta
 *   urinish mijozning oxirgi tanlovini yuborardi — u "Naqd" ga
 *   o'tgan bo'lsa, server 400 qaytarardi.
 */
export function savePendingPayment(orderId, provider) {
  try {
    const list = readAll().filter((p) => p.orderId !== orderId);
    list.push({ orderId, provider: provider || null, ts: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch { /* localStorage o'chirilgan bo'lishi mumkin — sessiya davomida yo'qoladi, zarari kam */ }
}

/** Barcha yaroqli yozuvlar, eskirganlari chiqarib tashlangan holda. */
function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    // Eski format (bitta obyekt) bilan moslik — yangilanishdan
    // keyin ham mijozning kutilayotgan to'lovi yo'qolmasin
    const list = Array.isArray(data) ? data : [data];
    return list.filter((p) => p?.orderId && Date.now() - (p.ts || 0) <= MAX_AGE_MS);
  } catch {
    return [];
  }
}

/** Tekshirilishi kerak bo'lgan barcha kutilayotgan to'lovlar. */
export function getPendingPayments() {
  const list = readAll();
  try {
    if (list.length) localStorage.setItem(KEY, JSON.stringify(list));
    else localStorage.removeItem(KEY);
  } catch { /* e'tiborsiz */ }
  return list;
}

/** Bitta yozuvni o'chirish — u tekshirilib, yakunlangach. */
export function clearPendingPayment(orderId) {
  try {
    if (!orderId) { localStorage.removeItem(KEY); return; }
    const list = readAll().filter((p) => p.orderId !== orderId);
    if (list.length) localStorage.setItem(KEY, JSON.stringify(list));
    else localStorage.removeItem(KEY);
  } catch { /* e'tiborsiz */ }
}

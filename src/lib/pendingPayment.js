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

/** Karta to'lovi boshlanganda chaqiriladi. */
export function savePendingPayment(orderId) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ orderId, ts: Date.now() }));
  } catch { /* localStorage o'chirilgan bo'lishi mumkin — sessiya davomida yo'qoladi, zarari kam */ }
}

/**
 * Saqlangan yozuvni o'qiydi.
 *
 * 30 daqiqadan eski yozuv E'TIBORGA OLINMAYDI — Click havolasi
 * shuncha vaqtdan keyin allaqachon amal qilmay qoladi va mijoz
 * yangi buyurtma bergan bo'lishi mumkin. Eski yozuv abadiy
 * "osilib" qolib, har CartPage ochilishida keraksiz so'rov
 * yubormasin.
 */
export function getPendingPayment() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.orderId) return null;
    if (Date.now() - (data.ts || 0) > 30 * 60 * 1000) {
      localStorage.removeItem(KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearPendingPayment() {
  try { localStorage.removeItem(KEY); } catch { /* e'tiborsiz */ }
}

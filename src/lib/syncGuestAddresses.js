import { useUser } from '@/store/user';
import { api } from '@/api';

/*
 * Guest holatida CartPage/AddressFlow orqali LOCAL qo'shilgan
 * manzillar 'addr' + Date.now() ko'rinishidagi vaqtinchalik ID
 * bilan belgilanadi (store/user.js, addAddress()). Haqiqiy server
 * ID (MongoDB ObjectId) bunday ko'rinishda BO'LMAYDI — shu farq
 * orqali "hali serverga saqlanmagan" manzillarni aniqlaymiz.
 */
function isTempId(id) {
  return typeof id === 'string' && id.startsWith('addr');
}

/**
 * Auth muvaffaqiyatli tugagandan KEYIN, loadAddresses() dan OLDIN
 * chaqirilishi kerak bo'lgan yordamchi: hali serverga saqlanmagan
 * (tempId) guest manzillarini ketma-ket serverga yuboradi.
 *
 * MUHIM (ikki chaqiruvchi o'rtasida umumiy): bu funksiya
 * AuthGateModal.jsx (checkout paytida ochiladigan auth modal) va
 * App.jsx (ilova ochilishidagi fon-auth) ikkalasida ham
 * ishlatiladi — mantiq FAQAT SHU YERDA, ikki joyda nusxalanmaydi.
 *
 * Xato bo'lsa: TO'XTAYDI (qolgan tempId manzillarga tegilmaydi),
 * xato qaytariladi (chaqiruvchi buni ko'rsatishi yoki jim
 * qoldirishi mumkin). Muvaffaqiyatli yuborilgan har bir manzil
 * DARHOL (loop davomida) real ID bilan local state'ga yoziladi —
 * shuning uchun qayta chaqirilsa (retry), allaqachon saqlangan
 * manzil QAYTA POST qilinmaydi (duplicate himoyasi).
 *
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function syncGuestAddresses() {
  let remaining = useUser.getState().user.addresses.filter((a) => isTempId(a?.id));

  while (remaining.length > 0) {
    const addr = remaining[0];
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await api.createAddress({
        title: addr.title,
        address: addr.address,
        street: addr.street || '',
        city: addr.city || '',
        entrance: addr.entrance || '',
        floor: addr.floor || '',
        flat: addr.flat || '',
        note: addr.note || '',
        labelId: addr.labelId || 'other',
        ...(addr.lat ? { lat: addr.lat, lng: addr.lng } : {}),
      });

      const stillPending = remaining.slice(1);
      const serverAddrs = (res?.addresses || []).map((a) => ({ ...a, id: String(a._id) }));
      const latest = useUser.getState().user;
      useUser.getState().setUser({
        ...latest,
        addresses: [...serverAddrs, ...stillPending],
        defaultAddressId: res?.defaultAddressId ? String(res.defaultAddressId) : latest.defaultAddressId,
      });

      remaining = stillPending;
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  return { ok: true };
}

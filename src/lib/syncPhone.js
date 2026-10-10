import { api } from '@/api';
import { useUser } from '@/store/user';

/*
 * Mijoz kiritgan telefon raqami SERVERDAGI hisobga ham saqlanadi (avval faqat
 * telefon xotirasida qolardi — restoran buyurtmada ko'rardi, lekin hisobga
 * bog'lanmasdi). Bir marta saqlanadi; har buyurtmada qayta so'ralmaydi.
 * Xato bo'lsa buyurtma jarayoni TO'XTAMAYDI — faqat log.
 * Server raqam o'zgarsa phoneVerified ni false qiladi (userProfile.updateMe).
 */
export function syncPhoneToServer(phone) {
  const value = String(phone || '').trim();
  if (value.length < 5 || value.length > 20) return;
  if (useUser.getState().authStatus !== 'done') return; // mehmon — server hisobi yo'q
  api.updateMe({ phone: value }).catch((e) => console.warn('Telefon serverga saqlanmadi:', e?.message));
}

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

/*
 * Ism/familiya ham serverdagi hisobga saqlanadi (Apple orqali kirganlarda Apple ismni bermasa hisob "Mijoz" bo'lib qoladi —
 * mijoz kiritgan ism serverga ham yozilmasa, qayta kirganda yana "Mijoz" qaytardi). Xato foydalanuvchini to'xtatmaydi.
 */
export function syncNameToServer(firstName, lastName) {
  const first = String(firstName || '').trim().slice(0, 60);
  if (!first) return;
  if (useUser.getState().authStatus !== 'done') return;
  api.updateMe({ firstName: first, lastName: String(lastName || '').trim().slice(0, 60) })
    .catch((e) => console.warn('Ism serverga saqlanmadi:', e?.message));
}

import { api } from '@/api';
import { useUser } from '@/store/user';
import { getTelegram } from '@/lib/telegram';

/*
 * ═══ TELEFONNI TELEGRAM ORQALI TASDIQLASH (TZ) ═══
 * Telegram'ning "raqamni ulashish" oynasi. Mijoz rozi bo'lsa, Telegram botga kontakt
 * yuboradi; server (services/phoneVerify.js) raqam aynan shu hisobga tegishli ekanini
 * tekshirib, phoneVerified qiladi.
 *   • Avtomatik so'rov — BIR MARTA (har qurilma+hisob), natijasidan qat'i nazar qayta so'ralmaydi.
 *   • Rad etilsa ham hech narsa to'xtamaydi — buyurtma jarayonining qismi EMAS.
 */
const askedKey = (tgId) => `lokma_contact_asked_${tgId || 'x'}`;

export function canRequestContact() {
  const tg = getTelegram();
  return Boolean(tg?.requestContact) && (typeof tg.isVersionAtLeast !== 'function' || tg.isVersionAtLeast('6.9'));
}

/** Kontakt so'rash; tasdiqlangach profildan yangi raqamni oladi. @returns Promise<boolean> */
export function requestContactNow() {
  return new Promise((resolve) => {
    const tg = getTelegram();
    if (!canRequestContact()) { resolve(false); return; }
    try {
      tg.requestContact((sent) => {
        if (!sent) { resolve(false); return; }
        // Server kontaktni bot orqali oladi — biroz kutib profilni yangilaymiz
        setTimeout(async () => {
          try {
            const { user } = await api.getMe();
            if (user?.phone) useUser.getState().updateUser({ phone: user.phone, phoneVerified: Boolean(user.phoneVerified) });
            resolve(Boolean(user?.phoneVerified));
          } catch { resolve(false); }
        }, 1800);
      });
    } catch { resolve(false); }
  });
}

/** Ilova ochilgach bir marta (tasdiqlanmagan bo'lsa) — oyna faqat shu bir marta avtomatik chiqadi */
export function maybeAskContactOnce() {
  const { user, authStatus } = useUser.getState();
  if (authStatus !== 'done' || user?.phoneVerified || !canRequestContact()) return;
  const key = askedKey(user?.telegramId);
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, String(Date.now())); // natijadan qat'i nazar — qayta so'ralmaydi
  } catch { return; }
  requestContactNow();
}

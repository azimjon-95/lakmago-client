import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useT } from '@/i18n';
import { useLockScroll } from '@/hooks/useLockScroll';
import { useUser } from '@/store/user';
import { isTelegramEnv, authenticateWithTelegram } from '@/lib/telegram';
import { joinUserRoom } from '@/lib/socket';
import { syncGuestAddresses } from '@/lib/syncGuestAddresses';
import { TelegramLoginCard } from './TelegramLoginCard';
import './AuthGateModal.css';

function initialsOf(first, last) {
  const f = (first || '').trim()[0] || '';
  const l = (last || '').trim()[0] || '';
  return (f + l).toUpperCase() || 'US';
}

/*
 * Order/booking submit paytida (guest holatda) ochiladigan auth
 * modal — useRequireAuth() orqali boshqariladi.
 *
 * MUHIM ARXITEKTURA QARORI (Telegram ichida): App.jsx boot vaqtida
 * authenticateWithTelegram() ALLAQACHON fonda ishga tushirilgan
 * (mavjud silent-auth mexanizmi — bu bosqichda o'zgartirilmadi).
 * Odatiy holatda bu modal Telegram ichida DEYARLI HECH QACHON
 * ochilmaydi — useRequireAuth() token borligini tekshiradi, va
 * auth odatda checkout'gacha allaqachon tugagan bo'ladi.
 *
 * Agar modal BARIBIR ochilsa (kam uchraydigan holat — masalan
 * mijoz JUDA tez checkout bossa, auth hali fonda ketayotgan
 * bo'lsa), bu komponent authenticateWithTelegram()NI QAYTA
 * CHAQIRMAYDI — buning o'rniga useUser store'dagi authStatus'ni
 * kuzatadi va App.jsx'dagi fon jarayoni tugashini kutadi (spinner).
 * Faqat authStatus==='failed' bo'lsa (fon jarayon xato bergan
 * bo'lsa) — "Qayta urinish" tugmasi authenticateWithTelegram()ni
 * bitta marta qo'lda chaqiradi.
 *
 * Browser (Safari) holatida — TelegramLoginCard (Login Widget,
 * mavjud, o'zgartirilmagan) ko'rsatiladi.
 */
export function AuthGateModal({ open, onSuccess, onClose }) {
  const t = useT();
  useLockScroll(open);

  const updateUser = useUser((s) => s.updateUser);
  const setAuthStatus = useUser((s) => s.setAuthStatus);
  const authStatus = useUser((s) => s.authStatus);
  const currentUser = useUser((s) => s.user);

  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState(null);

  // ===== Manzil sinxronlash holati (guest tempId address -> server) =====
  const [syncingAddresses, setSyncingAddresses] = useState(false);
  const [addressSyncError, setAddressSyncError] = useState(null);
  const pendingProfileRef = useRef(null);
  const telegramSyncStartedRef = useRef(false);

  const inTelegram = isTelegramEnv();

  /*
   * Guest holatida CartPage/AddressFlow orqali LOCAL qo'shilgan
   * manzillar 'addr' + Date.now() ko'rinishidagi vaqtinchalik ID
   * bilan belgilanadi (store/user.js, addAddress()) — bu tekshiruv
   * endi lib/syncGuestAddresses.js ichida (umumiy, App.jsx bilan
   * baham ko'riladi).
   */

  /*
   * ASOSIY TUZATISH: profil maydonlari YOZILGANDAN keyin,
   * loadAddresses() DARHOL chaqirilmaydi — avval guest tempId
   * manzillari (agar bo'lsa) SERVERGA ketma-ket saqlanadi
   * (syncGuestAddresses(), lib/syncGuestAddresses.js — App.jsx
   * bilan UMUMIY), VA shundan KEYINGINA loadAddresses() chaqiriladi.
   *
   * ILGARI: loadAddresses() darhol chaqirilardi -> serverda hali
   * mavjud bo'lmagan (guest holatida 401 bilan saqlanmagan) yangi
   * manzil, serverning (bo'sh yoki eski) ro'yxati bilan DARHOL
   * ezib tashlanardi -> selectedAddress undefined bo'lib qolardi
   * -> confirmAndSubmit() da crash.
   *
   * Xato bo'lsa: to'xtaydi, aniq xabar ko'rsatadi, onSuccess()
   * CHAQIRILMAYDI (demak order davom etmaydi), local manzil
   * o'zgarishsiz qoladi (yo'qotilmaydi). Muvaffaqiyatli yuborilgan
   * har bir manzil DARHOL local state'ga (real ID bilan) yoziladi
   * (syncGuestAddresses() ichida) — shuning uchun "Qayta urinish"
   * bosilsa, ALLAQACHON saqlangan manzil QAYTA POST qilinmaydi
   * (duplicate yo'q).
   */
  async function finishWithAddressSync(profile) {
    setSyncingAddresses(true);
    setAddressSyncError(null);

    const result = await syncGuestAddresses();
    if (!result.ok) {
      // Xato — TO'XTAYMIZ. loadAddresses() CHAQIRILMAYDI, onSuccess()
      // CHAQIRILMAYDI (order/booking davom etmaydi). Local manzil(lar)
      // (hali tempId bilan) o'zgarishsiz — hech narsa yo'qolmadi.
      setSyncingAddresses(false);
      setAddressSyncError(result.error || t('addressSyncFailed'));
      pendingProfileRef.current = profile;
      return;
    }

    const loadAddresses = useUser.getState().loadAddresses;
    await loadAddresses?.();

    setSyncingAddresses(false);
    const uid = profile._id || profile.id;
    if (uid) joinUserRoom(uid);
    onSuccess?.(profile);
  }

  const retryAddressSync = () => {
    if (pendingProfileRef.current) finishWithAddressSync(pendingProfileRef.current);
  };

  // Profilni store'ga yozadi — App.jsx'dagi applyProfile() bilan
  // BIR XIL maydonlar (ikkalasi ham authenticateWithTelegram() /
  // Login Widget'dan bir xil shakldagi profil obyekti oladi).
  const applyProfile = (profile) => {
    updateUser({
      telegramId: profile.telegramId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      username: profile.username,
      languageCode: profile.languageCode,
      isPremium: profile.isPremium,
      photoUrl: profile.photoUrl,
      photoInitials: initialsOf(profile.firstName, profile.lastName),
      phone: currentUser.phone ?? profile.phone ?? null,
      addresses: currentUser.addresses?.length ? currentUser.addresses : profile.addresses ?? [],
      verified: true,
    });
    setAuthStatus('done');
    finishWithAddressSync(profile);
  };

  /*
   * Telegram ichida: fon jarayoni (App.jsx) tugashini kuzatamiz —
   * yangi authenticateWithTelegram() chaqiruvi YO'Q, faqat holatni
   * kutamiz. authStatus 'done' bo'lib qolsa — modal darhol yopiladi.
   *
   * MUHIM: bu yo'l App.jsx'ning O'ZI profil maydonlarini ALLAQACHON
   * yozgan (applyProfile, App.jsx'da) — shuning uchun bu yerda
   * qayta updateUser() chaqirilmaydi, FAQAT manzil-sinxronlash
   * (finishWithAddressSync) ishga tushiriladi — aks holda Telegram
   * ichida ham xuddi shu manzil-yo'qolish xatosi (endi shu joyda)
   * takrorlanardi.
   */
  useEffect(() => {
    if (!open || !inTelegram) return;
    if (authStatus === 'done' && !telegramSyncStartedRef.current) {
      telegramSyncStartedRef.current = true;
      finishWithAddressSync(currentUser);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, inTelegram, authStatus]);

  const retryTelegramAuth = async () => {
    setRetrying(true);
    setRetryError(null);
    try {
      const profile = await authenticateWithTelegram();
      applyProfile(profile);
    } catch (e) {
      setRetryError(e.message || t('signInFailed'));
    } finally {
      setRetrying(false);
    }
  };

  if (!open) return null;

  return (
    <div className="authgate-overlay" onClick={onClose}>
      <div className="authgate-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="authgate-handle" />

        <button onClick={onClose} className="authgate-close" aria-label={t('close')}>
          <Icon name="x" size={16} color="var(--muted)" />
        </button>

        <div className="authgate-body">
          {addressSyncError ? (
            <div className="authgate-telegram">
              <div className="authgate-telegram__icon"><Icon name="pin" size={38} color="var(--brand-text)" /></div>
              <h2 className="authgate-telegram__title">{t('addressSyncFailedTitle')}</h2>
              <p className="authgate-telegram__text">{addressSyncError}</p>
              <button onClick={retryAddressSync} className="authgate-telegram__retry">
                {t('retry')}
              </button>
            </div>
          ) : inTelegram ? (
            <div className="authgate-telegram">
              <div className="authgate-telegram__icon"><Icon name="utensils" size={38} color="var(--brand-text)" /></div>
              <h2 className="authgate-telegram__title">{t('signingIn')}</h2>

              {authStatus === 'failed' && !retrying ? (
                <>
                  <p className="authgate-telegram__text">{retryError || t('signInFailed')}</p>
                  <button onClick={retryTelegramAuth} className="authgate-telegram__retry">
                    {t('retry')}
                  </button>
                </>
              ) : (
                <div className="authgate-telegram__spinner" aria-hidden="true" />
              )}
            </div>
          ) : syncingAddresses ? (
            <div className="authgate-telegram">
              <div className="authgate-telegram__icon"><Icon name="pin" size={38} color="var(--brand-text)" /></div>
              <h2 className="authgate-telegram__title">{t('savingAddress')}</h2>
              <div className="authgate-telegram__spinner" aria-hidden="true" />
            </div>
          ) : (
            <TelegramLoginCard onLoggedIn={applyProfile} />
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { useT } from '@/i18n';
import { useUser } from '@/store/user';
import { AddressFlow } from '@/components/AddressFlow/AddressFlow';
import './Onboarding.css';
import { api } from '@/api';

/*
 * ═══════════════════════════════════════════════════════════
 * BIRINCHI KIRISHDAGI SOZLASH (onboarding)
 * ═══════════════════════════════════════════════════════════
 *
 * Ikki qadam:
 *   1) Ism va familiya
 *   2) Yetkazish manzili (mavjud AddressFlow qayta ishlatiladi)
 *
 * ─── NIMA UCHUN ISM QAYTA SO'RALADI ───
 * Telegram ism/familiyani o'zi beradi, lekin ko'p mijozlar u
 * yerda taxallus, emoji yoki qisqartma yozib qo'ygan bo'ladi
 * ("Aka", "🔥Bek🔥"). Kuryer va restoran uchun bu yaramaydi.
 * Shuning uchun so'raymiz — LEKIN MAJBUR QILMAYMIZ: "O'tkazib
 * yuborish" bosilsa Telegram'dagi nom o'z holicha qoladi.
 *
 * ─── QACHON KO'RSATILADI ───
 * Mijozning saqlangan manzili YO'Q bo'lsa. Bu shart ataylab
 * tanlangan:
 *   • qo'shimcha "onboardingDone" bayrog'i, ya'ni server va
 *     model o'zgarishi TALAB QILINMAYDI
 *   • manzillar serverdan keladi, shuning uchun bir qurilmada
 *     to'ldirilsa boshqasida QAYTA so'ralmaydi
 *   • manzil buyurtma uchun baribir shart — ya'ni bu qadam
 *     sun'iy to'siq emas, mijozga keyin baribir kerak bo'ladi
 *
 * Yopib yuborilsa localStorage'ga belgi qo'yiladi va shu sessiya
 * davomida qayta bezovta qilmaydi.
 */

const DISMISS_KEY = 'lokmago_onboarding_dismissed';

export function Onboarding({ onDone }) {
  const t = useT();
  const user = useUser((s) => s.user);
  const updateUser = useUser((s) => s.updateUser);
  const addAddress = useUser((s) => s.addAddress);

  const [step, setStep] = useState('name');
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [saving, setSaving] = useState(false);

  // Ikkalasi ham bo'sh bo'lsa "Yuborish" ishlamaydi
  const canSubmit = firstName.trim().length > 0 && lastName.trim().length > 0;

  const finish = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* e'tiborsiz */ }
    onDone?.();
  };

  const submitName = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);

    /*
     * Nom AVVAL lokal holatga yoziladi, keyin serverga. Shunday
     * qilinganda mijoz keyingi qadamga darhol o'tadi va sekin
     * tarmoqda kutib turmaydi. Server so'rovi muvaffaqiyatsiz
     * bo'lsa ham oqim to'xtamaydi — nom keyin profil sahifasidan
     * ham o'zgartirilishi mumkin.
     */
    updateUser({ firstName: firstName.trim(), lastName: lastName.trim() });
    setStep('address');
    setSaving(false);

    try {
      await api.updateMe({ firstName: firstName.trim(), lastName: lastName.trim() });
    } catch { /* lokal holat baribir yangilandi */ }
  };

  if (step === 'address') {
    return (
      <div className="onb-portal">
        <AddressFlow
          startStep="permission"
          onSave={async (address) => { await addAddress(address); finish(); }}
          onClose={finish}
        />
      </div>
    );
  }

  return (
    <div className="onb">
      <div className="onb__card">
        <div className="onb__badge"><Icon name="user" size={26} color="var(--brand-text)" /></div>

        <h1 className="onb__title">{t('onbNameTitle')}</h1>
        <p className="onb__text">{t('onbNameText')}</p>

        <label className="onb__field">
          <span className="onb__label">{t('firstNameLabel')}</span>
          <input
            className="onb__input"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder={t('firstNamePlaceholder')}
            autoComplete="given-name"
            maxLength={60}
          />
        </label>

        <label className="onb__field">
          <span className="onb__label">{t('lastNameLabel')}</span>
          <input
            className="onb__input"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder={t('lastNamePlaceholder')}
            autoComplete="family-name"
            maxLength={60}
          />
        </label>

        <div className="onb__actions">
          {/*
            "O'tkazib yuborish" ATAYLAB kam ko'zga tashlanadi:
            u zaxira yo'l, asosiy harakat emas. Lekin YASHIRIN
            ham emas — mijoz Telegram'dagi nomi bilan qolishni
            tanlashi mumkin.
          */}
          <button type="button" onClick={() => setStep('address')} className="onb__skip">
            {t('skipStep')}
          </button>

          <button
            type="button"
            onClick={submitName}
            disabled={!canSubmit || saving}
            className="onb__submit"
          >
            {t('submitBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Sozlash kerakmi — App shu orqali tekshiradi. */
export function needsOnboarding(user) {
  if (!user) return false;
  try { if (localStorage.getItem(DISMISS_KEY)) return false; } catch { /* e'tiborsiz */ }
  return !(user.addresses?.length > 0);
}

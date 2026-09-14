import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { api } from '@/api';
import { getTelegram, haptic } from '@/lib/telegram';
import { useT } from '@/i18n';
import { useLockScroll } from '@/hooks/useLockScroll';
import '@/components/SubscriptionGate/SubscriptionGate.css';
import './SubscriptionGateModal.css';

/*
 * Order/booking submit vaqtida (checkout/booking bosqichida)
 * ochiladigan obuna-talab modal — useRequireSubscription() orqali
 * boshqariladi.
 *
 * MUHIM: bu komponent components/SubscriptionGate/SubscriptionGate.jsx
 * dagi check()/onCheck()/openChannel()/autoChecking MANTIG'INING
 * NUSXASI (bir xil CSS sinflari — SubscriptionGate.css qayta
 * import qilinadi, bir xil api.getSubscription() chaqiruvi).
 * SubscriptionGate.jsx ATAYLAB o'zgartirilmadi — u App.jsx'dan
 * bu integratsiya doirasida olib tashlanadi (endi App-open'da
 * bloklamaydi), lekin fayl o'zi mavjud qoladi.
 */
export function SubscriptionGateModal({ open, onSuccess, onClose }) {
  const t = useT();
  useLockScroll(open);

  const [state, setState] = useState({ loading: true, required: false, subscribed: true, channelUrl: '' });
  const [checking, setChecking] = useState(false);
  const [autoChecking, setAutoChecking] = useState(false);

  const check = async () => {
    try {
      const data = await api.getSubscription();
      setState({ loading: false, ...data });
      return data.subscribed;
    } catch {
      // Xatoда — bloklamaймиz (foydalanuvchи qamalиб qolmasин)
      setState({ loading: false, required: false, subscribed: true });
      return true;
    }
  };

  useEffect(() => {
    if (!open) return;
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Tekshiruv tugagach: obuna kerak emas yoki allaqachon obuna
  // bo'lsa — modal DARHOL o'zi yopiladi va davom etadi (mijoz
  // hech narsa ko'rmaydi — bu odatiy holat: obuna talab
  // qilinmasa yoki mijoz allaqachon obuna bo'lsa).
  useEffect(() => {
    if (!open || state.loading) return;
    if (!state.required || state.subscribed) onSuccess?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, state.loading, state.required, state.subscribed]);

  const onCheck = async () => {
    haptic();
    setChecking(true);
    const ok = await check();
    setChecking(false);
    if (ok) onSuccess?.();
  };

  const openChannel = () => {
    haptic();
    const tg = getTelegram();
    if (tg?.openTelegramLink && state.channelUrl) tg.openTelegramLink(state.channelUrl);
    else if (state.channelUrl) window.open(state.channelUrl, '_blank');
    setAutoChecking(true);
  };

  useEffect(() => {
    if (!autoChecking) return;
    const onFocus = async () => {
      const ok = await check();
      if (ok) { setAutoChecking(false); onSuccess?.(); }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    const poll = setInterval(onFocus, 2000);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoChecking]);

  // Tekshiruv davomida yoki obuna kerak bo'lmaganda — hech narsa
  // ko'rsatmaydi (yuqoridagi useEffect onSuccess()ni chaqiradi)
  if (!open || state.loading || !state.required || state.subscribed) return null;

  return (
    <div className="sgm-overlay" onClick={onClose}>
      <div className="sgm-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sgm-handle" />
        <button onClick={onClose} className="sgm-close" aria-label={t('close')}>
          <Icon name="x" size={16} color="var(--muted)" />
        </button>

        <div className="sub-gate__card sgm-card">
          <div className="sub-gate__icon"><Icon name="send" size={40} color="var(--brand)" /></div>
          <h2 className="sub-gate__title">{t('subscribeChannelTitle')}</h2>
          <p className="sub-gate__text">{t('subscribeChannelHint')}</p>

          <button onClick={openChannel} className="sub-gate__subscribe">
            <Icon name="send" size={18} color="var(--brand-text)" /> {t('subscribeChannelBtn')}
          </button>
          <button onClick={onCheck} disabled={checking} className="sub-gate__check">
            {checking ? t('checkingLabel') : t('subscribedCheckBtn')}
          </button>

          {autoChecking && !checking && (
            <p className="sub-gate__hint">
              <span className="spinner spinner--sm" /> {t('subscriptionChecking')}
            </p>
          )}
          {!autoChecking && !checking && (
            <p className="sub-gate__hint">{t('autoOpenHint')}</p>
          )}
        </div>
      </div>
    </div>
  );
}

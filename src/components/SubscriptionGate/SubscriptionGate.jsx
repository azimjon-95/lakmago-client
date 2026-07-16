import { useState, useEffect } from 'react';
import { Icon } from '@/components/Icon';
import { api } from '@/api';
import { getTelegram, haptic } from '@/lib/telegram';
import { useT } from '@/i18n';
import './SubscriptionGate.css';

// Asosiy kanалга obuna bo'lmaguncha webapp'ни bloklaydi.
// Obuna talab qilinmasa (kanал sozlanmagan) — hech nima ko'rsatmaydi.
export function SubscriptionGate({ children }) {
  const t = useT();
  const [state, setState] = useState({ loading: true, required: false, subscribed: true, channelUrl: '' });
  const [checking, setChecking] = useState(false);

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

  useEffect(() => { check(); }, []);

  const onCheck = async () => {
    haptic();
    setChecking(true);
    await check();
    setChecking(false);
  };

  const openChannel = () => {
    haptic();
    const tg = getTelegram();
    if (tg?.openTelegramLink && state.channelUrl) tg.openTelegramLink(state.channelUrl);
    else if (state.channelUrl) window.open(state.channelUrl, '_blank');
  };

  // Yuklanmoqда — bo'sh (tez o'tadi)
  if (state.loading) return children;
  // Obuna talab qilinmaydi yoki obuna bor — ilovани ko'rsatamiz
  if (!state.required || state.subscribed) return children;

  // Obuna gate ekrani
  return (
    <div className="sub-gate">
      <div className="sub-gate__card">
        <div className="sub-gate__icon"><Icon name="send" size={40} color="#EF9F27" /></div>
        <h2 className="sub-gate__title">Kanalga obuna bo'ling</h2>
        <p className="sub-gate__text">
          Buyurtma berishдан oldin asosiy kanalimizga obuna bo'ling.
          Bu bir marta — obuna bo'lганingizdan so'ng ilovadan bemalol foydalanasiz.
        </p>

        <button onClick={openChannel} className="sub-gate__subscribe">
          <Icon name="send" size={18} color="#2C1400" /> Kanalga obuna bo'lish
        </button>
        <button onClick={onCheck} disabled={checking} className="sub-gate__check">
          {checking ? 'Tekshirilmoqda...' : '✅ Obuna bo\u2018ldim, tekshirish'}
        </button>

        {!checking && state.required && !state.subscribed && (
          <p className="sub-gate__hint">Obuna bo'lgach «Tekshirish» tugmasini bosing</p>
        )}
      </div>
    </div>
  );
}

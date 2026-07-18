import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { useCart } from '@/store/cart';
import { useT } from '@/i18n';
import { formatSom } from '@/lib/utils';
import './cards/CartBar.css';

// Bepul yetkazish chegarasi — mijozni ko'proq buyurtmaga undaydi (psixologiya).
const FREE_DELIVERY_THRESHOLD = 100000;

export function CartBar() {
  const navigate = useNavigate();
  const t = useT();
  const count = useCart((s) => s.totalCount());
  const total = useCart((s) => s.totalPrice());
  const visible = count > 0;

  // Savat paneli ko'ringanda yordam tugmasi yuqoriga ko'chsin (to'qnashmasin).
  // MUHIM: hook har doim chaqiriladi (early return'dan oldin) — Rules of Hooks.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--cart-bar-offset', visible ? '86px' : '0px');
    return () => root.style.setProperty('--cart-bar-offset', '0px');
  }, [visible]);

  if (!visible) return null;

  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - total);
  const progress = Math.min(100, (total / FREE_DELIVERY_THRESHOLD) * 100);
  const freeReached = remaining === 0;

  return (
    <>
      {/* Fixed panel kontentni yopmasligi uchun joy egallovchi bo'shliq */}
      <div className="cart-bar-spacer" aria-hidden="true" />
      <div className="cart-bar-wrap">
      {/* Bepul yetkazish progress — undovchi */}
      <div className="cart-bar-promo">
        {freeReached ? (
          <span className="cart-bar-promo__free"><Icon name="gift" size={14} color="#6FBF73" /> {t('freeDelivery')} qo'lga kiritildi!</span>
        ) : (
          <span className="cart-bar-promo__text">
            {t('freeDelivery')}gacha <b>{formatSom(remaining)} {t('som')}</b>
          </span>
        )}
        <div className="cart-bar-promo__bar">
          <div className="cart-bar-promo__fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <button onClick={() => navigate('/cart')} className="cart-bar">
        <span className="cart-bar__count">{count}</span>
        <span className="cart-bar__label">{t('goToCart')}</span>
        <span className="cart-bar__total">{formatSom(total)}</span>
      </button>
      </div>
    </>
  );
}

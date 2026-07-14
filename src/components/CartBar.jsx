import { useNavigate } from 'react-router-dom';
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

  if (count === 0) return null;

  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - total);
  const progress = Math.min(100, (total / FREE_DELIVERY_THRESHOLD) * 100);
  const freeReached = remaining === 0;

  return (
    <div className="cart-bar-wrap">
      {/* Bepul yetkazish progress — undovchi */}
      <div className="cart-bar-promo">
        {freeReached ? (
          <span className="cart-bar-promo__free">🎉 {t('freeDelivery')} qo'lga kiritildi!</span>
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
  );
}

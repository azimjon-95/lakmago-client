import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { PHOTO_STYLES } from './DishPhoto';
import { formatSomShort } from '@/lib/utils';
import { useT } from '@/i18n';
import './cards/RestaurantCard.css';

export function RestaurantCard({ restaurant: r }) {
  const navigate = useNavigate();
  const t = useT();
  const hasPhoto = (r.images || []).length > 0;
  const photoKey = hasPhoto ? r.images[0] : null;
  const style = photoKey ? PHOTO_STYLES[photoKey] : null;
  const freeDelivery = r.deliveryFee === 0;

  return (
    <button onClick={() => navigate(`/restaurant/${r.id}`)} className="rcard">
      <div className="rcard__banner" style={{ background: style ? style.grad : r.tint }}>
        {style && <div className="rcard__banner-glow" />}
        <Icon name={r.icon} size={46} color={style ? style.iconColor : '#EF9F27'} strokeWidth={style ? 1.4 : 2} className="rcard__icon" />
        <div className="rcard__rating"><Icon name="star" size={12} color="#FAC775" /> {r.rating.toFixed(1)}</div>
        {r.discount && <div className="rcard__tag rcard__tag--discount">−{r.discount}%</div>}
        {r.isNew && !r.discount && <div className="rcard__tag rcard__tag--new">{t('rating')}</div>}
      </div>
      <div className="rcard__body">
        <div className="rcard__name">{r.name}</div>
        <div className="rcard__meta">
          <span>{r.cuisine}</span>
          <span className="rcard__dot">•</span>
          <span className="rcard__meta-item"><Icon name="clock" size={12} color="#9A9A96" /> {r.deliveryMin}–{r.deliveryMax} {t('min')}</span>
          <span className="rcard__dot">•</span>
          {freeDelivery ? (
            <span className="rcard__free"><Icon name="bike" size={12} color="#5DCAA5" /> {t('freeDelivery')}</span>
          ) : (
            <span className="rcard__meta-item"><Icon name="bike" size={12} color="#9A9A96" /> {formatSomShort(r.deliveryFee)} {t('som')}</span>
          )}
        </div>
      </div>
    </button>
  );
}

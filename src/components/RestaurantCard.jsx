import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { PHOTO_STYLES } from './DishPhoto';
import { formatSomShort } from '@/lib/utils';
import { useT } from '@/i18n';
import { usePrefetchRestaurant } from '@/hooks/queries';
import './cards/RestaurantCard.css';

export const RestaurantCard = memo(function RestaurantCard({ restaurant: r }) {
  const navigate = useNavigate();
  const t = useT();
  const prefetch = usePrefetchRestaurant();
  const rid = r.id || r._id;
  const hasPhoto = (r.images || []).length > 0;
  const photoKey = hasPhoto ? r.images[0] : null;
  const style = photoKey ? PHOTO_STYLES[photoKey] : null;
  const freeDelivery = r.deliveryFee === 0;
  const realImg = r.imageUrl || (r.images && r.images.find((u) => typeof u === 'string' && u.startsWith('http')));
  const optimizedImg = realImg && realImg.includes('/upload/')
    ? realImg.replace('/upload/', '/upload/f_auto,q_auto,w_500,c_fill/')
    : realImg;

  return (
    <button
      onClick={() => navigate(`/restaurant/${rid}`)}
      onMouseEnter={() => prefetch(rid)}
      onTouchStart={() => prefetch(rid)}
      className="rcard"
    >
      <div className="rcard__banner" style={{ background: style ? style.grad : r.tint }}>
        {optimizedImg ? (
          <img src={optimizedImg} alt={r.name} loading="lazy" decoding="async"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <>
            {style && <div className="rcard__banner-glow" />}
            <Icon name={r.icon} size={46} color={style ? style.iconColor : '#F5A524'} strokeWidth={style ? 1.4 : 2} className="rcard__icon" />
          </>
        )}
        <div className="rcard__rating"><Icon name="star" size={12} color="#FFCE7A" /> {r.rating.toFixed(1)}</div>
        {r.discount && <div className="rcard__tag rcard__tag--discount">−{r.discount}%</div>}
        {r.isFresh && !r.discount && <div className="rcard__tag rcard__tag--new">{t('fresh')}</div>}
      </div>
      <div className="rcard__body">
        <div className="rcard__name">{r.name}</div>
        <div className="rcard__meta">
          <span>{r.cuisine}</span>
          <span className="rcard__dot">•</span>
          <span className="rcard__meta-item"><Icon name="clock" size={12} color="#A99C8C" /> {r.deliveryMin}–{r.deliveryMax} {t('min')}</span>
          <span className="rcard__dot">•</span>
          {freeDelivery ? (
            <span className="rcard__free"><Icon name="bike" size={12} color="#6FBF73" /> {t('freeDelivery')}</span>
          ) : (
            <span className="rcard__meta-item"><Icon name="bike" size={12} color="#A99C8C" /> {formatSomShort(r.deliveryFee)} {t('som')}</span>
          )}
        </div>
      </div>
    </button>
  );
});

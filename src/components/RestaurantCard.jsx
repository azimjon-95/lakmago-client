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
        {r.discount && <div className="rcard__tag rcard__tag--discount">−{r.discount}%</div>}
        {r.isFresh && !r.discount && <div className="rcard__tag rcard__tag--new">{t('fresh')}</div>}
        {/* Yetkazish vaqti — banner burchagida (Uzum uslubi) */}
        {(r.deliveryMin > 0 || r.deliveryMax > 0) && (
          <div className="rcard__eta">{r.deliveryMin}–{r.deliveryMax} {t('min')}</div>
        )}
      </div>
      <div className="rcard__body">
        {/* Nom va reyting bir qatorda */}
        <div className="rcard__head">
          <div className="rcard__name">{r.name}</div>
          {r.rating > 0 && (
            <div className="rcard__rating">
              <Icon name="star" size={13} color="#FFCE7A" /> {r.rating.toFixed(1)}
            </div>
          )}
        </div>
        {r.cuisine && <div className="rcard__cuisine">{r.cuisine}</div>}
        <div className="rcard__meta">
          {r.discount > 0 && (
            <>
              <span className="rcard__promo">
                <Icon name="discount" size={13} color="#E85D3D" /> Chegirma −{r.discount}%
              </span>
              <span className="rcard__sep" />
            </>
          )}
          {freeDelivery ? (
            <span className="rcard__free"><Icon name="bike" size={13} color="#6FBF73" /> {t('freeDelivery')}</span>
          ) : (
            <span className="rcard__meta-item"><Icon name="bike" size={13} color="#A99C8C" /> {formatSomShort(r.deliveryFee)} {t('som')}</span>
          )}
        </div>
      </div>
    </button>
  );
});

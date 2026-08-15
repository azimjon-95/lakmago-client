import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { api } from '@/api';
import { formatSom } from '@/lib/utils';
import { haptic } from '@/lib/telegram';
import './PromoStrip.css';

/**
 * Faol aksiyalar tasmasi.
 *
 * Menyu yuklanishiga xalaqit bermaydi — alohida so'rov,
 * xato bo'lsa jimgina yashiriladi.
 */
export function PromoStrip({ restaurantId, category, title = 'Aksiyalar' }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (restaurantId) params.set('restaurantId', restaurantId);
    if (category && category !== 'all') params.set('category', category);
    const qs = params.toString();

    api.getPromotions(qs ? `?${qs}` : '')
      .then((list) => setItems(Array.isArray(list) ? list : []))
      .catch(() => setItems([]));
  }, [restaurantId, category]);

  if (items.length === 0) return null;

  return (
    <div className="promo-strip">
      <h2 className="promo-strip__title">🔥 {title}</h2>

      <div className="promo-strip__row no-scrollbar">
        {items.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              haptic();
              navigate(`/restaurant/${p.restaurantId}`);
            }}
            className="promo-card"
            style={{ background: p.restaurantTint || undefined }}
          >
            <div className="promo-card__badge">
              {p.discountType === 'percent'
                ? `−${p.discountValue}%`
                : `−${formatSom(p.discountValue)}`}
            </div>

            <div className="promo-card__name">{p.name}</div>
            <div className="promo-card__rest">{p.restaurantName}</div>

            {p.minOrderAmount > 0 && (
              <div className="promo-card__note">
                {formatSom(p.minOrderAmount)} dan
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Reklama bloki. "📢 Reklama" deb belgilanadi — TZ talabi.
 */
export function AdStrip({ placement = 'home' }) {
  const navigate = useNavigate();
  const [ads, setAds] = useState([]);
  const seen = useState(() => new Set())[0];

  useEffect(() => {
    api.getAds(placement)
      .then((list) => setAds(Array.isArray(list) ? list : []))
      .catch(() => setAds([]));
  }, [placement]);

  // Ko'rish qayd etiladi — bir marta
  useEffect(() => {
    for (const ad of ads) {
      if (seen.has(ad.id)) continue;
      seen.add(ad.id);
      api.trackAdEvent(ad.id, 'impression').catch(() => {});
    }
  }, [ads, seen]);

  if (ads.length === 0) return null;

  const open = (ad) => {
    haptic();
    api.trackAdEvent(ad.id, 'click').catch(() => {});

    if (ad.targetType === 'dish' && ad.dish) {
      navigate(`/food/${ad.dish._id}`);
    } else if (ad.restaurant) {
      navigate(`/restaurant/${ad.restaurant._id}`);
    }
  };

  return (
    <div className="ad-strip">
      <div className="ad-strip__label">📢 Reklama</div>

      <div className="ad-strip__row no-scrollbar">
        {ads.map((ad) => {
          const isDish = ad.targetType === 'dish' && ad.dish;
          const img = isDish ? ad.dish.imageUrl : ad.restaurant?.imageUrl;
          const name = isDish ? ad.dish.name : ad.restaurant?.name;
          const sub = isDish
            ? formatSom(ad.dish.price)
            : ad.restaurant?.cuisine || '';

          return (
            <button key={ad.id} onClick={() => open(ad)} className="ad-card">
              {img ? (
                <img src={img} alt="" className="ad-card__img" />
              ) : (
                <div className="ad-card__img ad-card__img--empty">
                  <Icon name="bag" size={22} color="var(--muted-2)" />
                </div>
              )}
              <div className="ad-card__name">{name}</div>
              {sub && <div className="ad-card__sub">{sub}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

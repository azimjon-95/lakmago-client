import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { RestaurantBannerFallback } from '@/components/RestaurantBannerFallback';
import { formatSomShort } from '@/lib/utils';
import { cardDeliveryLabel } from '@/lib/deliveryInfo';
import { isOpenNow, workHoursLabel, isOffToday } from '@/lib/workHours';
import { usePrefetchRestaurant } from '@/hooks/queries';
import { useT } from '@/i18n';
import './MarketStoreCard.css';

/*
 * ═══ MARKET: DO'KON KARTASI (dizayn maketi 1:1) ═══
 *  ┌──────── rasm ────────┐  ★ Tavsiya etamiz (eng yuqori reytingli)        🛵 25–40 daq
 *  │ [🛒] ANOR MARKET    ›│  Oziq-ovqat · 1,2 km
 *  │ 🕐 24 soat  Ochiq  🚲 Bepul yetkazish
 * Ish vaqti / ochiqlik / yetkazish — RestaurantCard bilan BIR XIL mantiq (lib/workHours, lib/deliveryInfo).
 */
export const MarketStoreCard = memo(function MarketStoreCard({ restaurant: r, recommended = false, distanceKm = null }) {
  const t = useT();
  const navigate = useNavigate();
  const prefetch = usePrefetchRestaurant();
  const [loaded, setLoaded] = useState(false);
  const rid = r.id || r._id;
  const open = r.isOpen === false ? false : isOpenNow(r);
  const offToday = isOffToday(r);
  const hours = workHoursLabel(r);
  const delivery = cardDeliveryLabel(r);
  const realImg = r.imageUrl || (r.images || []).find((u) => typeof u === 'string' && u.startsWith('http'));
  const img = realImg && realImg.includes('/upload/') ? realImg.replace('/upload/', '/upload/f_auto,q_auto,w_720,c_fill/') : realImg;
  const deliveryText = !delivery ? '' : delivery.kind === 'free' ? t('freeDelivery')
    : delivery.kind === 'flat' ? `${formatSomShort(delivery.price)} ${t('som')}`
      : delivery.kind === 'from' ? t('deliveryFromShort', { price: formatSomShort(delivery.price) })
        : delivery.kind === 'freeUpTo' ? t('deliveryFreeUpToShort', { km: delivery.km })
          : t('deliveryPerKmShort', { price: formatSomShort(delivery.price) });
  const dist = Number.isFinite(distanceKm) ? (distanceKm < 1 ? `${Math.max(50, Math.round(distanceKm * 1000 / 50) * 50)} m` : `${distanceKm.toFixed(1).replace('.', ',')} km`) : '';

  return (
    <button type="button" className={`mscard ${open ? '' : 'is-closed'}`} onClick={() => navigate(`/restaurant/${rid}`)}
      onTouchStart={() => prefetch(rid)} onMouseEnter={() => prefetch(rid)} data-testid="market-store-card">
      <div className="mscard__banner">
        {img && <img src={img} alt={r.name} loading="lazy" decoding="async" onLoad={() => setLoaded(true)} className={`mscard__img ${loaded ? 'is-loaded' : ''}`} />}
        {!loaded && <RestaurantBannerFallback name={r.name} />}
        {recommended && <span className="mscard__rec"><Icon name="star" size={12} strokeWidth={2.4} />{t('marketRecommended')}</span>}
        {(r.deliveryMin > 0 || r.deliveryMax > 0) && (
          <span className="mscard__eta"><Icon name="scooter" size={15} strokeWidth={2} />{r.deliveryMin}–{r.deliveryMax} {t('min')}</span>
        )}
      </div>
      <div className="mscard__body">
        <span className="mscard__logo" aria-hidden="true"><Icon name="shoppingCart" size={24} strokeWidth={2.2} /></span>
        <span className="mscard__info">
          <span className="mscard__name">{r.name}</span>
          <span className="mscard__sub">{[r.cuisine, dist].filter(Boolean).join(' · ')}</span>
          <span className="mscard__chips">
            {hours && <span className="mchip"><Icon name="clock" size={13} strokeWidth={2.2} />{hours}</span>}
            <span className={`mchip ${open ? 'mchip--open' : 'mchip--closed'}`}>{open ? 'Ochiq' : (offToday ? 'Bugun ishlamaydi' : 'Yopiq')}</span>
            {deliveryText && <span className={`mchip mchip--deliv ${delivery.kind === 'free' ? 'is-free' : ''}`}><Icon name="bike" size={14} strokeWidth={2} />{deliveryText}</span>}
          </span>
        </span>
        <span className="mscard__go" aria-hidden="true"><Icon name="chevronRight" size={16} strokeWidth={2.4} /></span>
      </div>
    </button>
  );
});

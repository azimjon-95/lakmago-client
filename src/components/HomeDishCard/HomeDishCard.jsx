import { memo, useState } from 'react';
import { DishPhoto, optimizeCloudinary } from '../DishPhoto';
import { Icon } from '../Icon';
import { formatSom } from '@/lib/utils';
import { isDiscountedDish, discountPercent } from '@/lib/discount';
import { useCart } from '@/store/cart';
import { useUser } from '@/store/user';
import { haptic } from '@/lib/telegram';
import { useI18n } from '@/i18n';
import { unitSuffix } from '@/data/market';
import { isDishOffToday } from '@/hooks/useOpenStatus';
import './HomeDishCard.css';

/*
 * Bosh sahifadagi «Super Chegirmalar» va «Tavsiya qilamiz» kartasi.
 *
 *   variant="discount"  — qizil «−N%» belgisi, qizil narx + chizilgan eski narx
 *   variant="recommend" — oltin «Tavsiya» (toj) belgisi, oddiy narx
 *
 * Ma'lumot mantig'i O'ZGARMAGAN: chegirma faqat lib/discount.js dagi
 * yagona qoida (oldPrice > price) bo'yicha; foiz haqiqiy narxlardan hisoblanadi.
 * Boshqa sahifalardagi DishGridCard'ga tegilmagan.
 *
 * Bosilganda — avvalgidek DishModal (onClick). «+» va ♥ kartani ochmaydi.
 * «+» : taomda variant/qo'shimchalar bo'lsa yoki restoran yopiq bo'lsa —
 * DishModal ochiladi (u tanlov va «yopiq» ogohlantirishini o'zi ko'rsatadi);
 * aks holda DishScrollCard'dagi tezkor qo'shish bilan bir xil addItem(dish, 1, []).
 */

function CrownIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" />
      <path d="M5 21h14" />
    </svg>
  );
}

function CardImage({ dish }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const raw = dish.imageUrl || (dish.images && dish.images[0]);
  const hasReal = typeof raw === 'string' && raw.startsWith('http') && !failed;

  if (!hasReal) {
    // Rasm yo'q / yuklanmadi — mavjud zaxira ko'rinish (NoImage yoki gradient)
    return <div className="hdc__img-fallback"><DishPhoto dish={{ ...dish, imageUrl: null, images: null }} fill height="100%" radius={0} iconSize={34} /></div>;
  }
  return (
    <img
      className={`hdc__img${loaded ? ' is-loaded' : ''}`}
      src={optimizeCloudinary(raw, 520, 'cover')}
      alt={dish.name || ''}
      loading="lazy"
      decoding="async"
      draggable="false"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
    />
  );
}

export const HomeDishCard = memo(function HomeDishCard({ dish, onClick, closed = false, variant = 'discount' }) {
  const { t, lang } = useI18n();
  const addItem = useCart((s) => s.addItem);
  const favId = String(dish.id || dish._id || '');
  const isFav = useUser((st) => Boolean(st.user.favorites?.dishes?.includes(favId)));
  const toggleFavorite = useUser((st) => st.toggleFavorite);

  const unit = unitSuffix(dish.unit, lang);
  // Chegirma belgisi/eski narx FAQAT «Super Chegirmalar» kartasida va faqat haqiqiy chegirmada
  const hasDiscount = variant === 'discount' && isDiscountedDish(dish);
  const hasOptions = (dish.optionGroups?.length ?? 0) > 0;

  const open = () => onClick?.(dish);

  function onKeyDown(e) {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  }

  function onFav(e) {
    e.stopPropagation();
    haptic();
    toggleFavorite('dish', favId);
  }

  function onAdd(e) {
    e.stopPropagation();
    haptic();
    if (closed || hasOptions) { open(); return; }
    addItem(dish, 1, []);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`hdc hdc--${variant}${closed ? ' is-closed' : ''}`}
      onClick={open}
      onKeyDown={onKeyDown}
    >
      <div className="hdc__photo">
        <CardImage dish={dish} />
        <div className="hdc__shade" aria-hidden="true" />

        {hasDiscount ? (
          <span className="hdc__badge hdc__badge--discount">−{discountPercent(dish)}%</span>
        ) : variant === 'recommend' ? (
          <span className="hdc__badge hdc__badge--reco"><CrownIcon />{t('recommendBadge')}</span>
        ) : null}

        <button
          type="button"
          className={`hdc__fav${isFav ? ' is-on' : ''}`}
          aria-pressed={isFav}
          aria-label="♥"
          onClick={onFav}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor"
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.3 5 6.4 5c1.9 0 3.5 1 4.3 2.4h.6C12.1 6 13.7 5 15.6 5c3.1 0 4.9 3 3.7 6.3C19.5 15.9 12 20.5 12 20.5z" />
          </svg>
        </button>

        {closed && (
          <span className="hdc__closed">
            {isDishOffToday(dish) ? t('closedToday') : t('currentlyClosed')}
          </span>
        )}
      </div>

      <div className="hdc__body">
        <div className="hdc__name">{dish.name}</div>
        {dish.restaurantName && (
          <div className="hdc__rest">
            <Icon name="store" size={12} color="currentColor" />
            <span>{dish.restaurantName}</span>
          </div>
        )}
        <div className="hdc__prices">
          <span className={`hdc__price${hasDiscount ? ' is-sale' : ''}`}>{formatSom(dish.price)}</span>
          {hasDiscount
            ? <span className="hdc__old">{formatSom(dish.oldPrice)}</span>
            : unit && <span className="hdc__unit">{unit.replace(/^\/\s*/, '')}</span>}
        </div>
        <button type="button" className="hdc__add" onClick={onAdd} aria-label="+">
          <Icon name="plus" size={20} color="#fff" strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
});

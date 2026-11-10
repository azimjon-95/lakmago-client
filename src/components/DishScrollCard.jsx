import { memo } from 'react';
import { DishPhoto } from './DishPhoto';
import { Icon } from './Icon';
import { formatSomShort } from '@/lib/utils';
import { useCart } from '@/store/cart';
import { useUser } from '@/store/user';
import { haptic } from '@/lib/telegram';
import { useI18n } from '@/i18n';
import { unitSuffix } from '@/data/market';
import './cards/DishScrollCard.css';

export const DishScrollCard = memo(function DishScrollCard({
  dish, onClick, showRestaurant = true, disabled = false, onDisabledTap,
  photoHeight = 112, photoAspect = null, showFav = false, showCurrency = false, addLabel = '+',
}) {
  const addItem = useCart((s) => s.addItem);
  const { lang } = useI18n();
  // Do'kon mahsuloti: "/ kg" va qadoq hajmi (restoran taomida bo'sh)
  const unit = unitSuffix(dish.unit, lang);
  const discountPct = dish.oldPrice ? Math.round((1 - dish.price / dish.oldPrice) * 100) : null;
  const hasOptions = (dish.optionGroups?.length ?? 0) > 0;
  // Sevimli (yurakcha) — faqat showFav bo'lganda ko'rinadi (DishModal bilan bir xil identifikator)
  const favId = String(dish.id || dish._id || '');
  const isFav = useUser((st) => Boolean(st.user.favorites?.dishes?.includes(favId)));
  const toggleFavorite = useUser((st) => st.toggleFavorite);

  function quickAdd(e) {
    e.stopPropagation();
    haptic();
    // Restoran yopiq — savatga qo'shilmaydi, sabab ko'rsatiladi
    if (disabled) { onDisabledTap?.(); return; }
    if (hasOptions) onClick(dish);
    else addItem(dish, 1, []);
  }

  function openDish() {
    if (disabled) { haptic(); onDisabledTap?.(); return; }
    onClick(dish);
  }

  return (
    <button onClick={openDish} className={`dscard ${disabled ? 'is-closed' : ''}`}>
      <div className="dscard__photo">
        <DishPhoto dish={dish} height={photoHeight} aspect={photoAspect} radius={14} iconSize={38} />
        {discountPct && <div className="dscard__badge dscard__badge--discount">−{discountPct}%</div>}
        {dish.isHit && !discountPct && <div className="dscard__badge dscard__badge--hit">HIT</div>}
        {showFav && (
          <span
            role="button" tabIndex={0} aria-pressed={isFav} aria-label="♥"
            className={`dscard__fav${isFav ? ' is-on' : ''}`}
            onClick={(e) => { e.stopPropagation(); haptic(); toggleFavorite('dish', favId); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggleFavorite('dish', favId); } }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.3 5 6.4 5c1.9 0 3.5 1 4.3 2.4h.6C12.1 6 13.7 5 15.6 5c3.1 0 4.9 3 3.7 6.3C19.5 15.9 12 20.5 12 20.5z" /></svg>
          </span>
        )}
        <button
          onClick={quickAdd}
          className="dscard__add"
          aria-label={disabled ? 'Restoran yopiq' : addLabel}
        >
          <Icon name={disabled ? 'clock' : 'plus'} size={18} color="var(--brand-text)" />
        </button>
      </div>
      <div className="dscard__name">{dish.name}</div>
      {dish.packSize && <div className="dscard__pack">{dish.packSize}</div>}
      {showRestaurant && dish.restaurantName && (
        <div className="dscard__rest">{dish.restaurantName}</div>
      )}
      <div className="dscard__price">
        <span className="dscard__price-main">{formatSomShort(dish.price)}{showCurrency && <small className="dscard__cur"> so'm</small>}{unit && <small className="dscard__unit"> {unit}</small>}</span>
        {dish.oldPrice && <span className="dscard__price-old">{formatSomShort(dish.oldPrice)}</span>}
      </div>
    </button>
  );
});

import { memo } from 'react';
import { DishPhoto } from './DishPhoto';
import { Icon } from './Icon';
import { formatSomShort } from '@/lib/utils';
import { useCart } from '@/store/cart';
import { haptic } from '@/lib/telegram';
import './cards/DishScrollCard.css';

export const DishScrollCard = memo(function DishScrollCard({ dish, onClick }) {
  const addItem = useCart((s) => s.addItem);
  const discountPct = dish.oldPrice ? Math.round((1 - dish.price / dish.oldPrice) * 100) : null;
  const hasOptions = (dish.optionGroups?.length ?? 0) > 0;

  function quickAdd(e) {
    e.stopPropagation();
    haptic();
    if (hasOptions) onClick(dish);
    else addItem(dish, 1, []);
  }

  return (
    <button onClick={() => onClick(dish)} className="dscard">
      <div className="dscard__photo">
        <DishPhoto dish={dish} height={112} radius={14} iconSize={38} />
        {discountPct && <div className="dscard__badge dscard__badge--discount">−{discountPct}%</div>}
        {dish.isHit && !discountPct && <div className="dscard__badge dscard__badge--hit">HIT</div>}
        <button onClick={quickAdd} className="dscard__add" aria-label="+"><Icon name="plus" size={18} color="#2C1400" /></button>
      </div>
      <div className="dscard__name">{dish.name}</div>
      {dish.restaurantName && <div className="dscard__rest">{dish.restaurantName}</div>}
      <div className="dscard__price">
        <span className="dscard__price-main">{formatSomShort(dish.price)}</span>
        {dish.oldPrice && <span className="dscard__price-old">{formatSomShort(dish.oldPrice)}</span>}
      </div>
    </button>
  );
});

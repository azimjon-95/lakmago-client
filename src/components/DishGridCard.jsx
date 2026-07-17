import { memo } from 'react';
import { DishPhoto } from './DishPhoto';
import { Icon } from './Icon';
import { formatSom } from '@/lib/utils';

// Bosh sahifадаgi "Barcha taomlar" grid kartаси.
// Rasm + nom + narx + restoran nomi. Bosilса modal ochiladi.
export const DishGridCard = memo(function DishGridCard({ dish, onClick }) {
  const hasDiscount = dish.oldPrice && dish.oldPrice > dish.price;
  return (
    <button className="dgcard" onClick={() => onClick(dish)}>
      <div className="dgcard__photo">
        <DishPhoto dish={dish} height={120} radius={14} iconSize={40} />
        {hasDiscount && (
          <div className="dgcard__badge">−{Math.round((1 - dish.price / dish.oldPrice) * 100)}%</div>
        )}
      </div>
      <div className="dgcard__body">
        <div className="dgcard__name">{dish.name}</div>
        {dish.restaurantName && (
          <div className="dgcard__rest">
            <Icon name="bowl" size={11} color="#9A9A96" /> {dish.restaurantName}
          </div>
        )}
        <div className="dgcard__price-row">
          <span className="dgcard__price">{formatSom(dish.price)}</span>
          {hasDiscount && <span className="dgcard__old">{formatSom(dish.oldPrice)}</span>}
        </div>
      </div>
      <div className="dgcard__add"><Icon name="plus" size={18} color="#2C1400" /></div>
    </button>
  );
});

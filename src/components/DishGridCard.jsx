import { memo } from 'react';
import { DishPhoto } from './DishPhoto';
import { Icon } from './Icon';
import { formatSom } from '@/lib/utils';
import { isDiscountedDish, discountPercent } from '@/lib/discount';
import { useT } from '@/i18n';

/*
 * Taom grid kartasi (bosh sahifa qatorlari, «Barchasi», qidiruv,
 * sevimlilar). Rasm + nom + restoran + narx. Bosilsa modal ochiladi.
 *
 * `closed` (ixtiyoriy) — restoran hozir yopiq. Karta YASHIRILMAYDI
 * (mijoz taom borligini ko'rsin), faqat xiralashadi va «Hozir yopiq»
 * belgisi chiqadi. Buyurtma berishga urinilsa DishModal
 * ClosedAlert ko'rsatadi.
 *
 * `onClick` ixtiyoriy — berilmasa karta bosilganda hech narsa
 * bo'lmaydi (avval `onClick(dish)` undefined bo'lib xato berardi).
 */
export const DishGridCard = memo(function DishGridCard({ dish, onClick, closed = false }) {
  const t = useT();
  const hasDiscount = isDiscountedDish(dish);
  return (
    <button
      type="button"
      className={`dgcard${closed ? ' is-closed' : ''}`}
      onClick={onClick ? () => onClick(dish) : undefined}
    >
      <div className="dgcard__photo">
        <DishPhoto dish={dish} height={104} radius={0} iconSize={34} />
        {hasDiscount && (
          <div className="dgcard__badge">−{discountPercent(dish)}%</div>
        )}
        {closed && <div className="dgcard__closed">{t('currentlyClosed')}</div>}
      </div>
      <div className="dgcard__body">
        <div className="dgcard__name">{dish.name}</div>
        {dish.restaurantName && (
          <div className="dgcard__rest">
            <Icon name="bowl" size={11} color="var(--muted)" /> {dish.restaurantName}
          </div>
        )}
        <div className="dgcard__price-row">
          <span className="dgcard__price">{formatSom(dish.price)}</span>
          {hasDiscount && <span className="dgcard__old">{formatSom(dish.oldPrice)}</span>}
        </div>
      </div>
      <div className="dgcard__add"><Icon name="plus" size={18} color="var(--accent-2-text)" /></div>
    </button>
  );
});

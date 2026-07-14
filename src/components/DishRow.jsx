import { Icon } from './Icon';
import { DishPhoto } from './DishPhoto';
import { formatSomShort } from '@/lib/utils';
import { useCart } from '@/store/cart';
import { haptic } from '@/lib/telegram';
import { useT } from '@/i18n';
import './cards/DishRow.css';

// Yandex Eda uslubidagi menyu qatori.
export function DishRow({ dish, onOpen }) {
  const t = useT();
  const items = useCart((s) => s.items);
  const addItem = useCart((s) => s.addItem);
  const decrement = useCart((s) => s.decrement);

  const simpleKey = `${dish.id}__`;
  const inCart = items.find((i) => i.key === simpleKey);
  const hasOptions = (dish.optionGroups?.length ?? 0) > 0;
  const discountPct = dish.oldPrice ? Math.round((1 - dish.price / dish.oldPrice) * 100) : null;
  const stopped = dish.isAvailable === false;

  const meta = [
    dish.weightGram ? `${dish.weightGram} ${t('gram')}` : null,
    dish.calories ? `${dish.calories} ${t('calories')}` : null,
  ].filter(Boolean).join(' · ');

  function quickAdd(e) {
    e.stopPropagation();
    if (stopped) return;
    haptic();
    if (hasOptions) onOpen(dish);
    else addItem(dish, 1, []);
  }

  return (
    <button onClick={() => !stopped && onOpen(dish)} className={`dish-row ${stopped ? 'is-stopped' : ''}`}>
      <div className="dish-row__photo">
        <DishPhoto dish={dish} height={88} radius={14} iconSize={34} />
        {discountPct && !stopped && <div className="dish-row__badge dish-row__badge--discount">−{discountPct}%</div>}
        {dish.isHit && !discountPct && !stopped && <div className="dish-row__badge dish-row__badge--hit">HIT</div>}
        {stopped && <div className="dish-row__stop-overlay">{t('soldOut')}</div>}
      </div>

      <div className="dish-row__body">
        <div className="dish-row__name">{dish.name}</div>
        {meta && <div className="dish-row__meta">{meta}</div>}
        <div className="dish-row__desc">{dish.description}</div>

        <div className="dish-row__bottom">
          <div className="dish-row__price">
            <span className="dish-row__price-main">{formatSomShort(dish.price)}</span>
            <span className="dish-row__price-cur">{t('som')}</span>
            {dish.oldPrice && <span className="dish-row__price-old">{formatSomShort(dish.oldPrice)}</span>}
          </div>

          {!stopped && (
            inCart && !hasOptions ? (
              <div className="qty-control" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => decrement(simpleKey)} className="qty-btn qty-btn--minus" aria-label="−"><Icon name="minus" size={16} color="#9A9A96" /></button>
                <span className="qty-value">{inCart.quantity}</span>
                <button onClick={() => addItem(dish, 1, [])} className="qty-btn qty-btn--plus" aria-label="+"><Icon name="plus" size={16} color="#2C1400" /></button>
              </div>
            ) : (
              <button onClick={quickAdd} className="dish-row__add" aria-label={t('addToCart')}>
                <Icon name="plus" size={20} color="#2C1400" />
              </button>
            )
          )}
        </div>
      </div>
    </button>
  );
}

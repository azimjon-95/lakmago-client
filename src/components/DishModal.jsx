import { useMemo, useState } from 'react';
import { Icon } from './Icon';
import { DishPhoto } from './DishPhoto';
import { formatSom, formatSomShort } from '@/lib/utils';
import { useCart } from '@/store/cart';
import { useLockScroll } from '@/hooks/useLockScroll';
import { useUser } from '@/store/user';
import { useOpenStatus } from '@/hooks/useOpenStatus';
import { haptic, shareDish } from '@/lib/telegram';
import { useT } from '@/i18n';
import './cards/DishModal.css';

export function DishModal({ dish, restaurant, onClose, onClosedAlert }) {
  const t = useT();
  const addItem = useCart((s) => s.addItem);
  useLockScroll(true);
  // Sevimlilar — selector primitiv qaytaradi (qayta render bo'lmasin)
  const dishId = String(dish.id || dish._id || '');
  const toggleFavorite = useUser((st) => st.toggleFavorite);
  const isFav = useUser((st) =>
    Boolean(st.user.favorites?.dishes?.includes(dishId)));
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState(() => {
    const init = {};
    dish.optionGroups?.forEach((g) => {
      if (g.required && !g.multiple && g.options[0]) init[g.id] = [g.options[0].id];
      else init[g.id] = [];
    });
    return init;
  });

  const selectedOptions = useMemo(() => {
    const out = [];
    dish.optionGroups?.forEach((g) => {
      g.options.forEach((o) => { if (selected[g.id]?.includes(o.id)) out.push(o); });
    });
    return out;
  }, [selected, dish.optionGroups]);

  const unitPrice = dish.price + selectedOptions.reduce((s, o) => s + o.price, 0);
  const total = unitPrice * quantity;

  function toggle(groupId, optId, multiple) {
    setSelected((prev) => {
      const cur = prev[groupId] ?? [];
      if (multiple) {
        return { ...prev, [groupId]: cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId] };
      }
      return { ...prev, [groupId]: [optId] };
    });
  }

  // Restoran ish vaqti — yopiq bo'lsa qo'shib bo'lmaydi
  const { isOpen, hoursLabel, nextOpen } = useOpenStatus(restaurant || dish);

  function handleAdd() {
    if (!isOpen) {
      haptic();
      onClosedAlert?.({
        name: restaurant?.name || dish.restaurantName,
        hoursLabel,
        nextOpen,
      });
      return;
    }
    haptic();
    // Restoran shartlarini taomga biriktiramiz — savatda
    // yetkazish va minimal summa hisoblanishi uchun kerak
    const enriched = restaurant
      ? {
          ...dish,
          restaurantName: dish.restaurantName || restaurant.name,
          restaurantTint: dish.restaurantTint || restaurant.tint,
          restaurantIcon: dish.restaurantIcon || restaurant.icon,
          restaurantDeliveryMin: restaurant.deliveryMin,
          restaurantDeliveryMax: restaurant.deliveryMax,
          restaurantDeliveryFee: restaurant.deliveryFee,
          restaurantFreeDeliveryThreshold: restaurant.freeDeliveryThreshold,
          restaurantMinOrderAmount: restaurant.minOrderAmount,
          restaurantPrepMinutes: restaurant.prepMinutes,
          restaurantServiceFeePercent: restaurant.serviceFeePercent,
          restaurantPickupDiscountPercent: restaurant.pickupDiscountPercent,
          restaurantOpenTime: restaurant.openTime,
          restaurantCloseTime: restaurant.closeTime,
        }
      : dish;

    addItem(enriched, quantity, selectedOptions);
    onClose();
  }

  return (
    <div className="dish-modal-overlay" onClick={onClose}>
      <div className="dish-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dish-modal__grabber" />
        <div className="dish-modal__photo">
          <DishPhoto dish={dish} fill fit="contain" radius={0} iconSize={72} />
          <button onClick={onClose} className="dish-modal__close" aria-label={t('close')}>
            <Icon name="x" size={18} color="#fff" />
          </button>
          <button onClick={() => shareDish(dish)} className="dish-modal__share" aria-label={t('share')}>
            <Icon name="share" size={17} color="#fff" />
          </button>
          {/* Sevimlilar */}
          <button
            onClick={() => { haptic(); toggleFavorite('dish', dishId); }}
            className="dish-modal__fav"
            aria-label="Sevimlilarga"
          >
            <Icon
              name="heart"
              size={18}
              color={isFav ? 'var(--brand)' : '#fff'}
              style={isFav ? { fill: 'var(--brand)' } : {}}
            />
          </button>
          {dish.isHit && <div className="dish-modal__hit"><Icon name="flame" size={11} color="#fff" /> HIT</div>}
        </div>

        <div className="dish-modal__body">
          <div className="dish-modal__head">
            <div className="dish-modal__name">{dish.name}</div>
            <div className="dish-modal__price">{formatSom(dish.price)}</div>
          </div>
          {dish.description && <p className="dish-modal__desc">{dish.description}</p>}

          {/*
            Og'irlik VA hajm — bor bo'lganlari ko'rsatiladi.
            Ichimlikda `weight` yo'q, `volume` bor ("0.5 l"),
            shuning uchun ikkalasi ham tekshiriladi.
          */}
          {(dish.weight || dish.weightGram || dish.volume || dish.calories || dish.prepMinutes) && (
            <div className="dish-modal__nutrition">
              {(dish.weight || dish.weightGram) && (
                <span>
                  <Icon name="scale" size={15} color="var(--muted)" />
                  {dish.weight || `${dish.weightGram} ${t('gram')}`}
                </span>
              )}
              {dish.volume && (
                <span>
                  <Icon name="scale" size={15} color="var(--muted)" />
                  {dish.volume}
                </span>
              )}
              {dish.calories > 0 && (
                <span>
                  <Icon name="flame" size={15} color="var(--danger)" />
                  {dish.calories} {t('calories')}
                </span>
              )}
              {dish.prepMinutes > 0 && (
                <span>
                  <Icon name="clock" size={15} color="var(--muted)" />
                  {dish.prepMinutes} daq
                </span>
              )}
            </div>
          )}

          {/* Ozuqaviy tarkib — kiritilgan bo'lsa */}
          {(dish.protein > 0 || dish.fat > 0 || dish.carbs > 0) && (
            <div className="dish-nutri">
              {dish.protein > 0 && (
                <div className="dish-nutri__item">
                  <span className="dish-nutri__value">{dish.protein} г</span>
                  <span className="dish-nutri__label">Oqsil</span>
                </div>
              )}
              {dish.fat > 0 && (
                <div className="dish-nutri__item">
                  <span className="dish-nutri__value">{dish.fat} г</span>
                  <span className="dish-nutri__label">Yog'</span>
                </div>
              )}
              {dish.carbs > 0 && (
                <div className="dish-nutri__item">
                  <span className="dish-nutri__value">{dish.carbs} г</span>
                  <span className="dish-nutri__label">Uglevod</span>
                </div>
              )}
            </div>
          )}

          {dish.ingredients && dish.ingredients.length > 0 && (
            <>
              <div className="dish-modal__section-label">{t('ingredients')}</div>
              <div className="dish-modal__ingredients">
                {dish.ingredients.map((ing) => <span key={ing} className="dish-modal__ing">{ing}</span>)}
              </div>
            </>
          )}

          {dish.optionGroups?.map((g) => (
            <div key={g.id} className="dish-modal__group">
              <div className="dish-modal__group-title">
                {g.title} {g.required ? <span className="dish-modal__req">· {t('portionSize')}</span> : <span className="dish-modal__opt">· {t('extras')}</span>}
              </div>
              <div className="dish-modal__options">
                {g.options.map((o) => {
                  const isSel = selected[g.id]?.includes(o.id);
                  return (
                    <button key={o.id} onClick={() => toggle(g.id, o.id, g.multiple)} className="dish-modal__option">
                      <span className="dish-modal__option-name">
                        {o.name}{o.price > 0 && <span className="dish-modal__option-price"> +{formatSomShort(o.price)}</span>}
                      </span>
                      {g.multiple ? (
                        <span className={`dish-modal__check ${isSel ? 'is-sel' : ''}`}>{isSel && <Icon name="check" size={15} color="var(--brand-text)" />}</span>
                      ) : (
                        <span className={`dish-modal__radio ${isSel ? 'is-sel' : ''}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="dish-modal__footer">
            <div className="qty-control dish-modal__qty">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="−"><Icon name="minus" size={18} color="var(--muted)" /></button>
              <span className="qty-value">{quantity}</span>
              <button onClick={() => setQuantity((q) => q + 1)} aria-label="+"><Icon name="plus" size={18} color="var(--brand)" /></button>
            </div>
            <button
              onClick={handleAdd}
              className={`btn-primary dish-modal__add ${isOpen ? '' : 'is-closed'}`}
            >
              {t('toCart')} · {formatSom(total)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

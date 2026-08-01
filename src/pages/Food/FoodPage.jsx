import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { DishPhoto } from '@/components/DishPhoto';
import { CartBar } from '@/components/CartBar';
import { useCart } from '@/store/cart';
import { useUser } from '@/store/user';
import { api } from '@/api';
import { formatSom } from '@/lib/utils';
import { haptic, shareDish, copyDishLink } from '@/lib/telegram';
import './Food.css';

/**
 * Taomning alohida sahifasi.
 *
 * Ulashilgan havola (t.me/bot?startapp=food_<id>) shu yerga
 * olib keladi. Taom backenddan tekshiriladi — frontenddan
 * kelgan ID ga ishonilmaydi.
 */
export function FoodPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addItem = useCart((s) => s.addItem);

  const [dish, setDish] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);

  const toggleFavorite = useUser((st) => st.toggleFavorite);
  const isFav = useUser((st) =>
    Boolean(st.user.favorites?.dishes?.includes(String(id))));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    api.getDish(id)
      .then(async (d) => {
        if (cancelled) return;
        if (!d || !d._id) {
          setNotFound(true);
          return;
        }
        setDish(d);

        // Restoran ma'lumoti — yetkazish shartlari uchun
        const rid = d.restaurantId || d.restaurant?.id;
        if (rid) {
          try {
            const r = await api.getRestaurant(rid);
            if (!cancelled) setRestaurant(r);
          } catch { /* restoran topilmasa taom baribir ko'rinadi */ }
        }
      })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id]);

  const add = () => {
    haptic();
    const enriched = restaurant
      ? {
          ...dish,
          restaurantName: dish.restaurantName || restaurant.name,
          restaurantTint: restaurant.tint,
          restaurantIcon: restaurant.icon,
          restaurantDeliveryMin: restaurant.deliveryMin,
          restaurantDeliveryMax: restaurant.deliveryMax,
          restaurantDeliveryFee: restaurant.deliveryFee,
          restaurantFreeDeliveryThreshold: restaurant.freeDeliveryThreshold,
          restaurantMinOrderAmount: restaurant.minOrderAmount,
          restaurantPrepMinutes: restaurant.prepMinutes,
        }
      : dish;
    addItem(enriched, quantity, []);
    navigate('/cart');
  };

  const copy = async () => {
    if (await copyDishLink(dish)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  if (loading) {
    return (
      <div className="app-shell food">
        <div className="food-loading">Yuklanmoqda...</div>
      </div>
    );
  }

  if (notFound || !dish) {
    return (
      <div className="app-shell food">
        <div className="food-empty">
          <Icon name="search" size={52} color="#7D7264" />
          <div className="food-empty__title">Taom topilmadi</div>
          <p className="food-empty__hint">
            Bu taom o'chirilgan yoki havola noto'g'ri bo'lishi mumkin
          </p>
          <button onClick={() => navigate('/')} className="food-empty__btn">
            Bosh sahifaga
          </button>
        </div>
      </div>
    );
  }

  const hasDiscount = dish.oldPrice > dish.price;

  return (
    <div className="app-shell food">
      {/* Rasm va tugmalar */}
      <div className="food-photo">
        <DishPhoto dish={dish} fill fit="cover" radius={0} iconSize={72} />

        <button onClick={() => navigate(-1)} className="food-photo__btn food-photo__btn--back">
          <Icon name="arrowLeft" size={20} color="#fff" />
        </button>

        <div className="food-photo__actions">
          <button onClick={() => { haptic(); toggleFavorite('dish', String(id)); }} className="food-photo__btn">
            <Icon
              name="heart" size={18}
              color={isFav ? '#F5A524' : '#fff'}
              style={isFav ? { fill: '#F5A524' } : {}}
            />
          </button>
          <button onClick={copy} className="food-photo__btn">
            <Icon name={copied ? 'check' : 'copy'} size={18} color="#fff" />
          </button>
          <button onClick={() => shareDish(dish)} className="food-photo__btn">
            <Icon name="share" size={18} color="#fff" />
          </button>
        </div>

        {hasDiscount && (
          <div className="food-photo__badge">
            −{Math.round((1 - dish.price / dish.oldPrice) * 100)}%
          </div>
        )}
      </div>

      <div className="food-body">
        <div className="food-head">
          <h1 className="food-name">{dish.name}</h1>
          <div className="food-price">
            <span className="food-price__now">{formatSom(dish.price)}</span>
            {hasDiscount && (
              <span className="food-price__old">{formatSom(dish.oldPrice)}</span>
            )}
          </div>
        </div>

        {dish.description && <p className="food-desc">{dish.description}</p>}

        {/* Restoran */}
        {restaurant && (
          <button
            onClick={() => navigate(`/restaurant/${restaurant.id || restaurant._id}`)}
            className="food-rest"
          >
            <Icon name="bag" size={17} color="#F5A524" />
            <div className="food-rest__body">
              <div className="food-rest__name">{restaurant.name}</div>
              <div className="food-rest__meta">
                {restaurant.deliveryMin}–{restaurant.deliveryMax} daq
                {restaurant.rating > 0 && ` · ★ ${restaurant.rating.toFixed(1)}`}
              </div>
            </div>
            <Icon name="chevronRight" size={18} color="#A99C8C" />
          </button>
        )}

        {/* Og'irlik va kaloriya */}
        {(dish.weight || dish.calories > 0 || dish.prepMinutes > 0) && (
          <div className="food-facts">
            {dish.weight && (
              <span><Icon name="scale" size={14} color="#A99C8C" /> {dish.weight}</span>
            )}
            {dish.calories > 0 && (
              <span><Icon name="flame" size={14} color="#E14B42" /> {dish.calories} ккал</span>
            )}
            {dish.prepMinutes > 0 && (
              <span><Icon name="clock" size={14} color="#A99C8C" /> {dish.prepMinutes} daq</span>
            )}
          </div>
        )}

        {/* Ozuqaviy tarkib */}
        {(dish.protein > 0 || dish.fat > 0 || dish.carbs > 0) && (
          <div className="food-nutri">
            {dish.protein > 0 && <Nutri value={dish.protein} label="Oqsil" />}
            {dish.fat > 0 && <Nutri value={dish.fat} label="Yog'" />}
            {dish.carbs > 0 && <Nutri value={dish.carbs} label="Uglevod" />}
          </div>
        )}

        {/* Soni va savatga */}
        <div className="food-actions">
          <div className="qty-control">
            <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
            <span>{quantity}</span>
            <button onClick={() => setQuantity((q) => q + 1)}>+</button>
          </div>
          <button onClick={add} className="food-add">
            Savatga · {formatSom(dish.price * quantity)}
          </button>
        </div>
      </div>

      <CartBar />
    </div>
  );
}

function Nutri({ value, label }) {
  return (
    <div className="food-nutri__item">
      <span className="food-nutri__value">{value} г</span>
      <span className="food-nutri__label">{label}</span>
    </div>
  );
}

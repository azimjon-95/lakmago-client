import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { DishRow } from '@/components/DishRow';
import { DishModal } from '@/components/DishModal';
import { CartBar } from '@/components/CartBar';
import { RestaurantBanner } from '@/components/DishPhoto';
import { DishRowSkeleton } from '@/components/Skeleton/Skeleton';
import { useT } from '@/i18n';
import { useRestaurant, useDishes } from '@/hooks/queries';
import './Restaurant.css';

const REVIEWS_TAB = '__reviews__';

export function RestaurantPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const t = useT();
  const [modalDish, setModalDish] = useState(null);
  const [isFav, setIsFav] = useState(false);
  const highlightHandled = useRef(false);

  // Real data — TanStack Query
  const { data: restaurant, isLoading: restLoading } = useRestaurant(id);
  const { data: rawDishes = [], isLoading: dishesLoading } = useDishes(id);
  const restaurantReviews = restaurant?.reviews || [];

  // Taomlarga restoran meta'sini biriktiramiz (savatга to'g'ri o'tishi uchun)
  const restaurantDishes = useMemo(
    () => rawDishes.map((d) => ({
      ...d,
      restaurantName: restaurant?.name,
      restaurantTint: restaurant?.tint,
      restaurantIcon: restaurant?.icon,
      restaurantDeliveryMin: restaurant?.deliveryMin,
      restaurantDeliveryMax: restaurant?.deliveryMax,
      restaurantDeliveryFee: restaurant?.deliveryFee,
    })),
    [rawDishes, restaurant],
  );

  const sections = useMemo(() => {
    const map = new Map();
    restaurantDishes.forEach((d) => {
      if (!map.has(d.section)) map.set(d.section, []);
      map.get(d.section).push(d);
    });
    const list = Array.from(map.entries());
    list.push([REVIEWS_TAB, []]);
    return list;
  }, [restaurantDishes]);

  // Ulashilган havola bilan kelinса (highlightDish) — o'sha taomni avtomatik ochamiz
  useEffect(() => {
    const targetId = location.state?.highlightDish;
    if (!targetId || highlightHandled.current || restaurantDishes.length === 0) return;
    const dish = restaurantDishes.find((d) => (d.id || d._id) === targetId);
    if (dish) {
      highlightHandled.current = true;
      // Kичик kechikish bilan ochamiz (sahifa render bo'lib ulgursin)
      setTimeout(() => setModalDish(dish), 300);
      // State'ни tozalaymiz (qayta ochilmasligi uchun)
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [restaurantDishes, location.state, location.pathname, navigate]);

  const [active, setActive] = useState('');

  function scrollTo(name) {
    setActive(name);
    document.getElementById(`sec-${name}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (restLoading || !restaurant) {
    return <div className="app-shell rest-loading"><div className="spinner" /></div>;
  }

  return (
    <div className="app-shell restaurant">
      {/* Banner */}
      <div className="rest-banner">
        <RestaurantBanner restaurant={restaurant} height={150} />
        <button onClick={() => navigate(-1)} className="rest-banner__btn rest-banner__btn--back" aria-label={t('back')}>
          <Icon name="arrowLeft" size={18} color="#fff" />
        </button>
        <button onClick={() => setIsFav((v) => !v)} className="rest-banner__btn rest-banner__btn--fav" aria-label="♥">
          <Icon name="heart" size={17} color={isFav ? '#EF9F27' : '#fff'} style={isFav ? { fill: '#EF9F27' } : {}} />
        </button>
      </div>

      {/* Ma'lumot */}
      <div className="rest-info">
        <h1 className="rest-info__name">{restaurant.name}</h1>
        <div className="rest-info__cuisine">{restaurant.cuisine} · Toshkent</div>
        <button onClick={() => scrollTo(REVIEWS_TAB)} className="rest-info__meta">
          <span className="rest-meta rest-meta--rating">
            <Icon name="star" size={15} color="#EF9F27" />
            {restaurant.rating.toFixed(1)}
            <span className="rest-meta__count">({restaurant.reviewCount})</span>
          </span>
          <span className="rest-meta">
            <Icon name="clock" size={15} color="#9A9A96" /> {restaurant.deliveryMin}–{restaurant.deliveryMax} {t('min')}
          </span>
          <span className="rest-meta rest-meta--free">
            <Icon name="bike" size={15} color="#5DCAA5" />
            {restaurant.deliveryFee === 0 ? t('free') : t('delivery')}
          </span>
        </button>
        <button onClick={() => navigate(`/restaurant/${id}/reserve`)} className="rest-reserve-btn">
          <Icon name="calendarPlus" size={17} color="#EF9F27" /> {t('reserveTable')}
        </button>
      </div>

      {/* Tablar */}
      <div className="rest-tabs no-scrollbar">
        {sections.map(([name]) => {
          const isTabActive = name === active;
          const label = name === REVIEWS_TAB ? `Sharhlar (${restaurantReviews.length})` : name;
          return (
            <button
              key={name}
              onClick={() => scrollTo(name)}
              className={`rest-tab ${isTabActive ? 'is-active' : ''}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Menyu + sharhlar */}
      <div className="rest-content">
        {sections.map(([name, list]) => {
          if (name === REVIEWS_TAB) {
            return (
              <div key={name} id={`sec-${name}`} className="rest-section rest-reviews">
                <div className="rest-section__title">Mijozlar sharhlari</div>
                {restaurantReviews.length === 0 ? (
                  <div className="rest-reviews__empty">Hozircha sharhlar yo'q.</div>
                ) : (
                  <div className="rest-reviews__list">
                    {restaurantReviews.map((rv, i) => (
                      <div key={i} className="review-card">
                        <div className="review-card__head">
                          <div className="review-card__author">
                            <div className="review-card__avatar">
                              {rv.name.split(' ').map((w) => w[0]).join('')}
                            </div>
                            <span className="review-card__name">{rv.name}</span>
                          </div>
                          <span className="review-card__date">{rv.date}</span>
                        </div>
                        <div className="review-card__stars">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Icon key={n} name="star" size={13}
                              color={n <= rv.rating ? '#EF9F27' : '#4A4A4E'}
                              style={n <= rv.rating ? { fill: '#EF9F27' } : {}} />
                          ))}
                        </div>
                        {rv.comment && <div className="review-card__text">{rv.comment}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <div key={name} id={`sec-${name}`} className="rest-section">
              <div className="rest-section__title">{name}</div>
              <div className="rest-dishes">
                {dishesLoading
                  ? Array.from({ length: 3 }).map((_, i) => <DishRowSkeleton key={i} />)
                  : list.map((d) => <DishRow key={d.id || d._id} dish={d} onOpen={setModalDish} />)}
              </div>
            </div>
          );
        })}
      </div>

      <CartBar />
      {modalDish && <DishModal dish={modalDish} onClose={() => setModalDish(null)} />}
    </div>
  );
}

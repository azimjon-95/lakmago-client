import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { DishRow } from '@/components/DishRow';
import { DishModal } from '@/components/DishModal';
import { CartBar } from '@/components/CartBar';
import { RestaurantBanner } from '@/components/DishPhoto';
import { RestaurantInfoSheet } from '@/components/RestaurantInfoSheet';
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
  const [infoSheet, setInfoSheet] = useState(null); // 'schedule' | 'service' | null
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
          <Icon name="heart" size={17} color={isFav ? '#F5A524' : '#fff'} style={isFav ? { fill: '#F5A524' } : {}} />
        </button>
      </div>

      {/* Ma'lumot — Uzum uslubi: nom markazda + stat kartalari */}
      <div className="rest-info">
        <h1 className="rest-info__name">{restaurant.name}</h1>
        <div className="rest-info__cuisine">{restaurant.cuisine}</div>

        {/* Stat kartalari */}
        <div className="rest-stats">
          <div className="rest-stat">
            <span className="rest-stat__icon rest-stat__icon--time">
              <Icon name="clock" size={20} color="#F5A524" />
            </span>
            <span className="rest-stat__value">{restaurant.deliveryMin}–{restaurant.deliveryMax} {t('min')}</span>
            <span className="rest-stat__label">eshikkacha</span>
          </div>

          <button onClick={() => scrollTo(REVIEWS_TAB)} className="rest-stat">
            <span className="rest-stat__icon rest-stat__icon--rating">
              <Icon name="star" size={20} color="#6FBF73" />
            </span>
            <span className="rest-stat__value">{(restaurant.rating ?? 0).toFixed(1)}</span>
            <span className="rest-stat__label">reyting</span>
          </button>

          {restaurant.deliveryFee === 0 && (
            <div className="rest-stat">
              <span className="rest-stat__icon rest-stat__icon--free">
                <Icon name="bike" size={20} color="#F5A524" />
              </span>
              <span className="rest-stat__value">Bepul</span>
              <span className="rest-stat__label">yetkazish</span>
            </div>
          )}

          <button onClick={() => setInfoSheet('schedule')} className="rest-stat">
            <span className="rest-stat__icon rest-stat__icon--info">
              <Icon name="info" size={20} color="#E0A96D" />
            </span>
            <span className="rest-stat__value">Xabar</span>
            <span className="rest-stat__label">ish tartibi</span>
          </button>
        </div>

        {/* Xizmat haqi (agar sozlangan bo'lsa) */}
        {(restaurant.minOrderAmount > 0 || restaurant.serviceFeePercent > 0) && (
          <button onClick={() => setInfoSheet('service')} className="rest-service-link">
            <Icon name="info" size={14} color="#A99C8C" /> Xizmat haqi va shartlar
          </button>
        )}

        {/* Stol bron qilish — bizning ustunligimiz */}
        {restaurant.reservationEnabled !== false && (
          <button onClick={() => navigate(`/restaurant/${id}/reserve`)} className="rest-reserve-btn">
            <Icon name="calendarPlus" size={17} color="#F5A524" /> {t('reserveTable')}
          </button>
        )}
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
                              color={n <= rv.rating ? '#F5A524' : '#4A4A4E'}
                              style={n <= rv.rating ? { fill: '#F5A524' } : {}} />
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

      {infoSheet && (
        <RestaurantInfoSheet
          kind={infoSheet}
          restaurant={restaurant}
          onClose={() => setInfoSheet(null)}
        />
      )}
    </div>
  );
}

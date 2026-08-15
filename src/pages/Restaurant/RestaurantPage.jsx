import { useMemo, useState, useEffect, useRef } from 'react';
import { CATEGORIES } from '@/data/categories';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { DishScrollCard } from '@/components/DishScrollCard';
import { DishModal } from '@/components/DishModal';
import { CartBar } from '@/components/CartBar';
import { RestaurantBanner } from '@/components/DishPhoto';
import { RestaurantInfoSheet } from '@/components/RestaurantInfoSheet';
import { useT } from '@/i18n';
import { useUser } from '@/store/user';
import { haptic } from '@/lib/telegram';
import { useClosedAlert, useOpenStatus } from '@/hooks/useOpenStatus';
import { ClosedAlert } from '@/components/ClosedAlert';
import { PromoStrip } from '@/components/PromoStrip';
import { useRestaurant, useDishes } from '@/hooks/queries';
import './Restaurant.css';

const REVIEWS_TAB = '__reviews__';

export function RestaurantPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const t = useT();
  const [modalDish, setModalDish] = useState(null);
  // Sevimlilar — localStorage'da saqlanadi.
  // Selector primitiv (boolean) qaytarishi shart: massiv qaytarilsa
  // har render'da yangi havola bo'lib, cheksiz qayta render bo'ladi.
  const toggleFavorite = useUser((st) => st.toggleFavorite);
  const isFav = useUser((st) =>
    Boolean(st.user.favorites?.restaurants?.includes(id)));
  const [infoOpen, setInfoOpen] = useState(false);
  const { closedInfo, showClosed, hideClosed } = useClosedAlert();

  const highlightHandled = useRef(false);

  // Real data — TanStack Query
  const { data: restaurant, isLoading: restLoading, error: restError } = useRestaurant(id);
  const { data: rawDishes = [], isLoading: dishesLoading } = useDishes(id);
  const restaurantReviews = restaurant?.reviews || [];

  // Ish vaqti har daqiqada qayta hisoblanadi: restoran ochilganda
  // sahifa o'zi jonlanadi, mijoz yangilashi shart emas
  const { isOpen, hoursLabel } = useOpenStatus(restaurant);

  // Bo'sh ma'lumotlar ko'rsatilmasin — element umuman chizilmaydi
  // Oyna ichida ko'rsatishga biror narsa bormi
  const hasInfo = Boolean(
    restaurant?.openTime || restaurant?.closeTime || restaurant?.legalName ||
    restaurant?.legalAddress || restaurant?.inn || restaurant?.address ||
    restaurant?.phone || restaurant?.minOrderAmount > 0 ||
    restaurant?.serviceFeePercent > 0 || restaurant?.deliveryFee > 0,
  );

  // Taomlarga restoran meta'sini biriktiramiz (savatга to'g'ri o'tishi uchun)
  const restaurantDishes = useMemo(
    () => rawDishes.map((d) => ({
      ...d,
      // Savat aynan shu maydon bo'yicha guruhlaydi — bo'lmasa buyurtma yaratilmaydi
      restaurantId: d.restaurantId || restaurant?.id || restaurant?._id || id,
      restaurantName: restaurant?.name,
      restaurantTint: restaurant?.tint,
      restaurantIcon: restaurant?.icon,
      restaurantDeliveryMin: restaurant?.deliveryMin,
      restaurantDeliveryMax: restaurant?.deliveryMax,
      restaurantDeliveryFee: restaurant?.deliveryFee,
    })),
    [rawDishes, restaurant, id],
  );

  const sections = useMemo(() => {
    /*
     * Taomlar platformaning YAGONA kategoriyalari bo'yicha
     * guruhlanadi (Milliy taom, Osh, Shashlik...), restoran
     * o'zi yozgan erkin "section" matni bo'yicha emas.
     *
     * Sabab: har restoran o'z bilganicha yozadi ("bambuk",
     * "ddb", "zakuska") va mijoz uchun bu hech narsa
     * anglatmaydi. Kategoriya esa taom qo'shilganda ro'yxatdan
     * tanlanadi, ya'ni doim tushunarli va bir xil.
     *
     * Tartib ham CATEGORIES ro'yxatidagidek — barcha restoranda
     * bir xil ketma-ketlik.
     */
    const byId = new Map();
    restaurantDishes.forEach((d) => {
      const key = d.category || '__other__';
      if (!byId.has(key)) byId.set(key, []);
      byId.get(key).push(d);
    });

    const map = new Map();

    // Avval ma'lum kategoriyalar — belgilangan tartibda
    CATEGORIES.forEach(({ id, label }) => {
      const items = byId.get(id);
      if (items?.length) {
        map.set(label, items);
        byId.delete(id);
      }
    });

    // Qolganlari (kategoriyasi yo'q yoki ro'yxatda yo'q) — oxirida
    const rest = [];
    byId.forEach((items) => rest.push(...items));
    if (rest.length) map.set('Boshqa', rest);
    // Bo'sh kategoriya ko'rsatilmaydi — taomi yo'q bo'lim
    // tabda ham, ro'yxatda ham chiqmasligi kerak
    const list = Array.from(map.entries()).filter(([, items]) => items.length > 0);
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
  const tabsRef = useRef(null);
  // Bosilgandan keyin kuzatuvchi darhol boshqa bo'limga
  // o'tkazib yubormasligi uchun qisqa muddat to'xtatiladi
  const lockRef = useRef(0);

  function scrollTo(name) {
    setActive(name);
    lockRef.current = Date.now() + 700;
    document.getElementById(`sec-${name}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Aylantirilganda joriy bo'lim o'zi belgilanadi (Yandex Eda kabi).
   * Avval faol tab faqat bosilganda o'zgarardi — pastga surilganda
   * yuqorida noto'g'ri bo'lim yonib turardi.
   */
  useEffect(() => {
    if (sections.length === 0) return;

    const nodes = sections
      .map(([name]) => document.getElementById(`sec-${name}`))
      .filter(Boolean);
    if (nodes.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (Date.now() < lockRef.current) return;
        // Ekranning yuqori qismidagi eng birinchi bo'lim
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id.replace('sec-', ''));
      },
      // Tepadagi yopishqoq panel ostidagi tor "o'qish chizig'i"
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    );

    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [sections]);

  /** Faol chip gorizontal ro'yxatda ko'rinib tursin. */
  useEffect(() => {
    if (!active || !tabsRef.current) return;
    const chip = tabsRef.current.querySelector('[data-on="1"]');
    if (chip) chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [active]);

  if (restLoading) {
    return <div className="app-shell rest-loading"><div className="spinner" /></div>;
  }

  // Xato yoki topilmadi — tushunarli xabar va chiqish yo'li
  if (restError || !restaurant) {
    return (
      <div className="app-shell rest-error">
        <Icon name="info" size={48} color="#7D7264" />
        <div className="rest-error__title">Restoran ochilmadi</div>
        <p className="rest-error__text">
          {restError?.message?.includes('404') || restError?.status === 404
            ? 'Bu muassasa mavjud emas yoki vaqtincha yopilgan'
            : 'Ma\u2018lumot yuklanmadi. Internetni tekshiring.'}
        </p>
        <div className="rest-error__actions">
          <button onClick={() => window.location.reload()} className="rest-error__btn rest-error__btn--primary">
            Qayta urinish
          </button>
          <button onClick={() => navigate('/')} className="rest-error__btn">
            Bosh sahifa
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell restaurant">
      {/* Banner */}
      <div className="rest-banner">
        <RestaurantBanner restaurant={restaurant} height={150} />

        {/* Yopiq bo'lsa ogohlantiramiz */}
        {restaurant && !isOpen && (
          <div className="rest-closed">
            <Icon name="clock" size={16} color="#E14B42" />
            <span>
              Hozir yopiq
              {restaurant.openTime && (
                <> · Ish vaqti {restaurant.openTime}–{restaurant.closeTime}</>
              )}
            </span>
          </div>
        )}
        {/*
          navigate(-1) emas — ATAYLAB. Bron sahifasiga kirib
          (push), u yerdan ushbu sahifaga qaytilsa (yana push),
          tarix stekida bir necha "Restoran" yozuvi paydo bo'lib
          qolardi — shu tugma bosilganda ORQAGA emas, BRON
          sahifasiga qaytib ketardi. Bosh sahifaga aniq
          yo'naltirish bu chalkashlikni butunlay yo'q qiladi. */}
        <button onClick={() => navigate('/')} className="rest-banner__btn rest-banner__btn--back" aria-label={t('back')}>
          <Icon name="arrowLeft" size={18} color="#fff" />
        </button>
        <button onClick={() => { haptic(); toggleFavorite('restaurant', id); }} className="rest-banner__btn rest-banner__btn--fav" aria-label="♥">
          <Icon name="heart" size={17} color={isFav ? '#F5A524' : '#fff'} style={isFav ? { fill: '#F5A524' } : {}} />
        </button>
      </div>

      {/* Ma'lumot — Uzum uslubi: nom markazda + stat kartalari */}
      <div className="rest-info">
        <h1 className="rest-info__name">{restaurant.name}</h1>
        {restaurant.cuisine && <div className="rest-info__cuisine">{restaurant.cuisine}</div>}

        {/* Stat kartalari */}
        <div className="rest-stats">
          <div className="rest-stat">
            <span className="rest-stat__icon rest-stat__icon--time">
              <Icon name="clock" size={20} color="#F5A524" />
            </span>
            <span className="rest-stat__value">{restaurant.deliveryMin}–{restaurant.deliveryMax} {t('min')}</span>
            <span className="rest-stat__label">eshikkacha</span>
          </div>

          {/* Reyting — faqat baho berilgan bo'lsa ko'rinadi */}
          {restaurant.rating > 0 && (
            <button onClick={() => scrollTo(REVIEWS_TAB)} className="rest-stat">
              <span className="rest-stat__icon rest-stat__icon--rating">
                <Icon name="star" size={20} color="#6FBF73" />
              </span>
              <span className="rest-stat__value">{Number(restaurant.rating).toFixed(1)}</span>
              <span className="rest-stat__label">reyting</span>
            </button>
          )}

          {restaurant.deliveryFee === 0 && (
            <div className="rest-stat">
              <span className="rest-stat__icon rest-stat__icon--free">
                <Icon name="bike" size={20} color="#F5A524" />
              </span>
              <span className="rest-stat__value">Bepul</span>
              <span className="rest-stat__label">yetkazish</span>
            </div>
          )}

          {/* Ish tartibi — faqat ma'lumot kiritilgan bo'lsa */}
          {hasInfo && (
            <button onClick={() => setInfoOpen(true)} className="rest-stat">
              <span className="rest-stat__icon rest-stat__icon--info">
                <Icon name="info" size={20} color="#E0A96D" />
              </span>
              <span className="rest-stat__value">Shartlar</span>
              <span className="rest-stat__label">va ish vaqti</span>
            </button>
          )}
        </div>

        {/* Stol bron qilish — bizning ustunligimiz */}
        {restaurant.reservationEnabled !== false && (
          <button onClick={() => navigate(`/restaurant/${id}/reserve`)} className="rest-reserve-btn">
            <Icon name="calendarPlus" size={17} color="#F5A524" /> {t('reserveTable')}
          </button>
        )}
      </div>

      {/* Shu restoran aksiyalari — menyudan oldin.
          Avval sahifa oxirida, sharhlardan ham keyin turardi:
          u yergacha hech kim yetib bormasdi. */}
      <PromoStrip restaurantId={id} title="Aksiyalar" />

      {/* Tablar */}
      <div ref={tabsRef} className="rest-tabs no-scrollbar">
        {sections.map(([name]) => {
          const isTabActive = name === active;
          const label = name === REVIEWS_TAB ? `Sharhlar (${restaurantReviews.length})` : name;
          return (
            <button
              key={name}
              onClick={() => scrollTo(name)}
              data-on={isTabActive ? '1' : '0'}
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
                  <div className="rest-reviews__empty">
                    Hozircha sharh yo&apos;q. Birinchi bo&apos;lib baho bering!
                  </div>
                ) : (
                  <>
                    {/* Jamlanma: o'rtacha baho va taqsimot */}
                    <ReviewSummary reviews={restaurantReviews} />

                    <div className="rest-reviews__list">
                      {restaurantReviews.map((rv, i) => (
                        <div key={rv.id || i} className="review-card">
                          <div className="review-card__head">
                            <div className="review-card__author">
                              {rv.photoUrl ? (
                                <img src={rv.photoUrl} alt="" className="review-card__avatar" />
                              ) : (
                                <div className="review-card__avatar">
                                  {(rv.name || 'M').split(' ').map((w) => w[0]).join('').slice(0, 2)}
                                </div>
                              )}
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
                  </>
                )}
              </div>
            );
          }
          return (
            <div key={name} id={`sec-${name}`} className="rest-section">
              <div className="rest-section__head">
                <div className="rest-section__title">{name}</div>
                <span className="rest-section__count">{list.length}</span>
              </div>

              {/* Gorizontal slayd — har kategoriya o'z qatorida.
                  Vertikal ro'yxatda bitta kategoriya butun ekranni
                  egallab, qolganini topish uchun uzoq surish
                  kerak edi. */}
              <div className="rest-row no-scrollbar">
                {dishesLoading
                  ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="rest-row__sk" />)
                  : list.map((d) => <DishScrollCard
                      key={d.id || d._id}
                      dish={d}
                      onClick={setModalDish}
                      showRestaurant={false}
                      disabled={!isOpen}
                      onDisabledTap={() => showClosed({
                        name: restaurant?.name,
                        hoursLabel,
                      })}
                    />)}
              </div>
            </div>
          );
        })}
      </div>

      <CartBar />
      {modalDish && (
        <DishModal
          dish={modalDish}
          restaurant={restaurant}
          onClose={() => setModalDish(null)}
          onClosedAlert={showClosed}
        />
      )}

      <ClosedAlert info={closedInfo} onClose={hideClosed} />

      {infoOpen && (
        <RestaurantInfoSheet
          restaurant={restaurant}
          onClose={() => setInfoOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * Sharhlar jamlanmasi — o'rtacha baho va yulduzlar taqsimoti.
 *
 * Yalpi ro'yxatdan oldin turadi: mijoz "umuman qanday" degan
 * savolga bir qarashda javob oladi, keyin tafsilotga tushadi.
 */
function ReviewSummary({ reviews }) {
  const total = reviews.length;
  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
  const avg = total ? sum / total : 0;

  // 5 dan 1 gacha — har bahoga nechta sharh
  const buckets = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Number(r.rating) === star).length,
  }));

  return (
    <div className="rev-sum">
      <div className="rev-sum__score">
        <div className="rev-sum__avg">{avg.toFixed(1)}</div>
        <div className="rev-sum__stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <Icon key={n} name="star" size={12}
              color={n <= Math.round(avg) ? '#F5A524' : '#4A4A4E'}
              style={n <= Math.round(avg) ? { fill: '#F5A524' } : {}} />
          ))}
        </div>
        <div className="rev-sum__count">{total} ta baho</div>
      </div>

      <div className="rev-sum__bars">
        {buckets.map(({ star, count }) => (
          <div key={star} className="rev-sum__row">
            <span className="rev-sum__star">{star}</span>
            <span className="rev-sum__track">
              <span
                className="rev-sum__fill"
                style={{ width: total ? `${(count / total) * 100}%` : 0 }}
              />
            </span>
            <span className="rev-sum__n">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

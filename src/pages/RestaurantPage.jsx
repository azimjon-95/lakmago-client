import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Icon } from '@/components/Icon';
import { DishRow } from '@/components/DishRow';
import { DishModal } from '@/components/DishModal';
import { CartBar } from '@/components/CartBar';
import { RestaurantBanner } from '@/components/DishPhoto';
import { restaurants, dishes, seedReviews } from '@/data/mock';

const REVIEWS_TAB = '__reviews__';
const reviewsData = seedReviews();

export function RestaurantPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [modalDish, setModalDish] = useState(null);
  const [isFav, setIsFav] = useState(false);

  const restaurant = restaurants.find((r) => r.id === id);
  const restaurantDishes = dishes.filter((d) => d.restaurantId === id);
  const restaurantReviews = reviewsData[id] || [];

  const sections = useMemo(() => {
    const map = new Map();
    restaurantDishes.forEach((d) => {
      if (!map.has(d.section)) map.set(d.section, []);
      map.get(d.section).push(d);
    });
    const list = Array.from(map.entries());
    list.push([REVIEWS_TAB, []]);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const [active, setActive] = useState(sections[0]?.[0] ?? '');

  function scrollTo(name) {
    setActive(name);
    document.getElementById(`sec-${name}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (!restaurant) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Yuklanmoqda…</div>;
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col max-w-[420px] mx-auto">
      {/* Banner */}
      <div className="relative">
        <RestaurantBanner restaurant={restaurant} height={150} />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-3 left-3 w-[34px] h-[34px] rounded-full flex items-center justify-center text-white"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          aria-label="Orqaga">
          
          <Icon name="arrowLeft" size={18} color="#fff" />
        </button>
        <button
          onClick={() => setIsFav((v) => !v)}
          className="absolute top-3 right-3 w-[34px] h-[34px] rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          aria-label="Sevimli">
          
          <Icon name="heart" size={17} color={isFav ? '#EF9F27' : '#fff'} style={isFav ? { fill: '#EF9F27' } : {}} />
        </button>
      </div>

      {/* Ma'lumot */}
      <div className="px-4 pt-3.5 pb-2.5 border-b border-line">
        <div className="text-xl font-medium text-ink">{restaurant.name}</div>
        <div className="text-[13px] text-muted mt-1">{restaurant.cuisine} · Toshkent</div>
        <button onClick={() => scrollTo(REVIEWS_TAB)} className="flex gap-3.5 mt-2.5 flex-wrap">
          <span className="flex items-center gap-1.5 text-[13px] text-ink font-medium">
            <Icon name="star" size={15} color="#EF9F27" />
            {restaurant.rating.toFixed(1)}
            <span className="text-muted font-normal">({restaurant.reviewCount})</span>
          </span>
          <span className="flex items-center gap-1.5 text-[13px] text-muted">
            <Icon name="clock" size={15} color="#9A9A96" /> {restaurant.deliveryMin}-{restaurant.deliveryMax} daq
          </span>
          <span className="flex items-center gap-1.5 text-[13px]" style={{ color: '#0F6E56' }}>
            <Icon name="bike" size={15} color="#0F6E56" />
            {restaurant.deliveryFee === 0 ? 'Bepul' : 'Yetkazish'}
          </span>
        </button>
        <button
          onClick={() => navigate(`/restaurant/${id}/reserve`)}
          className="mt-3 w-full border border-brand-400 text-brand-600 text-sm font-medium py-2.5 rounded-xl flex items-center justify-center gap-2">
          
          <Icon name="calendarPlus" size={17} color="#BA7517" /> Stol bron qilish
        </button>
      </div>

      {/* Tablar */}
      <div className="flex gap-2.5 px-4 py-2.5 overflow-x-auto no-scrollbar border-b border-line sticky top-0 bg-surface z-10">
        {sections.map(([name]) => {
          const isTabActive = name === active;
          const label = name === REVIEWS_TAB ? `Sharhlar (${restaurantReviews.length})` : name;
          return (
            <button
              key={name}
              onClick={() => scrollTo(name)}
              className="flex-none text-sm pb-1.5"
              style={
              isTabActive ?
              { color: '#BA7517', fontWeight: 500, borderBottom: '2px solid #EF9F27' } :
              { color: '#9A9A96' }
              }>
              
              {label}
            </button>);

        })}
      </div>

      {/* Menyu + sharhlar */}
      <div className="flex-1">
        {sections.map(([name, list]) => {
          if (name === REVIEWS_TAB) {
            return (
              <div key={name} id={`sec-${name}`} className="scroll-mt-[52px] px-4 pt-3.5 pb-6">
                <div className="text-[17px] font-medium text-ink mb-3">Mijozlar sharhlari</div>
                {restaurantReviews.length === 0 ?
                <div className="text-[13px] text-muted text-center py-6">
                    Hozircha sharhlar yo'q. Birinchi bo'lib fikr qoldiring!
                  </div> :

                <div className="flex flex-col gap-3">
                    {restaurantReviews.map((rv, i) =>
                  <div key={i} className="bg-canvas rounded-card p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-[26px] h-[26px] rounded-full bg-brand-50 flex items-center justify-center text-brand-800 font-medium text-[11px]">
                              {rv.name.split(' ').map((w) => w[0]).join('')}
                            </div>
                            <span className="text-[13px] font-medium text-ink">{rv.name}</span>
                          </div>
                          <span className="text-[11px] text-muted">{rv.date}</span>
                        </div>
                        <div className="flex gap-0.5 mt-1.5">
                          {[1, 2, 3, 4, 5].map((n) =>
                      <Icon
                        key={n}
                        name="star"
                        size={13}
                        color={n <= rv.rating ? '#EF9F27' : '#D3D1C7'}
                        style={n <= rv.rating ? { fill: '#EF9F27' } : {}} />

                      )}
                        </div>
                        {rv.comment && <div className="text-[13px] text-ink mt-1.5 leading-relaxed">{rv.comment}</div>}
                      </div>
                  )}
                  </div>
                }
              </div>);

          }
          return (
            <div key={name} id={`sec-${name}`} className="scroll-mt-[52px]">
              <div className="px-4 pt-3.5 pb-1.5 text-[17px] font-medium text-ink">{name}</div>
              <div className="px-4 pb-3.5 flex flex-col gap-3.5">
                {list.map((d) =>
                <DishRow key={d.id} dish={d} onOpen={setModalDish} />
                )}
              </div>
            </div>);

        })}
      </div>

      <CartBar />
      {modalDish && <DishModal dish={modalDish} onClose={() => setModalDish(null)} />}
    </div>);

}

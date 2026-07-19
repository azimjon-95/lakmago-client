import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { BottomNav } from '@/components/BottomNav';
import { CartBar } from '@/components/CartBar';
import { CategoryIcon } from '@/components/CategoryIcons/CategoryIcon';
import { RestaurantCard } from '@/components/RestaurantCard';
import { DishGridCard } from '@/components/DishGridCard';
import { DishModal } from '@/components/DishModal';
import { RestaurantCardSkeleton } from '@/components/Skeleton/Skeleton';
import { useRestaurants, useAllDishes } from '@/hooks/queries';
import { haptic } from '@/lib/telegram';
import { useT } from '@/i18n';
import { FilterSheet, CATEGORIES, SPECIALS, SORTS } from './FilterSheet';
import './Search.css';

export function SearchPage() {
  const navigate = useNavigate();
  const t = useT();
  const inputRef = useRef(null);

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [modalDish, setModalDish] = useState(null);

  // Filtr holati
  const [specials, setSpecials] = useState([]);     // ['discount', 'free', ...]
  const [maxTime, setMaxTime] = useState(null);      // 30 | 45 | 60 | null (60+)
  const [categories, setCategories] = useState([]);  // ['milliy', 'sushi', ...]
  const [sort, setSort] = useState('default');

  const { data: restaurants = [], isLoading: restLoading } = useRestaurants();
  const { data: dishes = [] } = useAllDishes();

  // Debounce — har harfda qayta hisoblanmasin
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim().toLowerCase()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Faol filtrlar soni (badge uchun)
  const activeCount =
    specials.length + categories.length + (maxTime ? 1 : 0) + (sort !== 'default' ? 1 : 0);

  // Restoranlarni filtrlash va saralash
  const filteredRestaurants = useMemo(() => {
    let list = restaurants;

    if (debounced) {
      list = list.filter((r) =>
        (r.name || '').toLowerCase().includes(debounced) ||
        (r.cuisine || '').toLowerCase().includes(debounced));
    }
    if (categories.length) {
      list = list.filter((r) => categories.includes(r.category));
    }
    if (maxTime) {
      list = list.filter((r) => (r.deliveryMin ?? 30) <= maxTime);
    }
    if (specials.includes('discount')) list = list.filter((r) => r.discount > 0);
    if (specials.includes('free')) list = list.filter((r) => r.deliveryFee === 0);
    if (specials.includes('fresh')) list = list.filter((r) => r.isFresh);
    if (specials.includes('top')) list = list.filter((r) => (r.rating ?? 0) >= 4.5);

    const sorted = [...list];
    if (sort === 'rating') sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    if (sort === 'fast') sorted.sort((a, b) => (a.deliveryMin ?? 99) - (b.deliveryMin ?? 99));
    return sorted;
  }, [restaurants, debounced, categories, maxTime, specials, sort]);

  // Taomlarni qidirish (faqat matn bo'yicha)
  const foundDishes = useMemo(() => {
    if (!debounced) return [];
    return dishes
      .filter((d) => (d.name || '').toLowerCase().includes(debounced))
      .slice(0, 12);
  }, [dishes, debounced]);

  const reset = () => {
    haptic();
    setSpecials([]); setMaxTime(null); setCategories([]); setSort('default');
  };

  const toggleCategory = (id) => {
    haptic();
    setCategories((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  const hasQuery = debounced.length > 0;
  const nothingFound = hasQuery && filteredRestaurants.length === 0 && foundDishes.length === 0;

  return (
    <div className="app-shell search-page">
      {/* Qidiruv qatori */}
      <div className="search-top">
        <div className="search-field">
          <Icon name="search" size={18} color="#A99C8C" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search')}
            className="search-field__input"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label={t('close')}>
              <Icon name="x" size={16} color="#A99C8C" />
            </button>
          )}
        </div>
        <button
          onClick={() => { haptic(); setShowFilter(true); }}
          className={`search-filter-btn ${activeCount ? 'is-active' : ''}`}
          aria-label="Filtr"
        >
          <Icon name="filter" size={20} color={activeCount ? '#2A1500' : '#F7F2EA'} />
          {activeCount > 0 && <span className="search-filter-btn__badge">{activeCount}</span>}
        </button>
      </div>

      {/* Kategoriyalar — tez tanlash */}
      <div className="search-cats no-scrollbar">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => toggleCategory(c.id)}
            className={`search-cat ${categories.includes(c.id) ? 'is-active' : ''}`}
          >
            <span className="search-cat__art"><CategoryIcon name={c.art} size={44} /></span>
            <span className="search-cat__label">{c.label}</span>
          </button>
        ))}
      </div>

      {/* Faol filtrlar */}
      {activeCount > 0 && (
        <div className="search-chips no-scrollbar">
          {specials.map((s) => {
            const meta = SPECIALS.find((x) => x.id === s);
            return (
              <button key={s} onClick={() => setSpecials((p) => p.filter((x) => x !== s))} className="search-chip">
                {meta?.label} <Icon name="x" size={12} color="#FFCE7A" />
              </button>
            );
          })}
          {maxTime && (
            <button onClick={() => setMaxTime(null)} className="search-chip">
              {maxTime} daq <Icon name="x" size={12} color="#FFCE7A" />
            </button>
          )}
          {sort !== 'default' && (
            <button onClick={() => setSort('default')} className="search-chip">
              {SORTS.find((s) => s.id === sort)?.label} <Icon name="x" size={12} color="#FFCE7A" />
            </button>
          )}
          <button onClick={reset} className="search-chip search-chip--reset">Tozalash</button>
        </div>
      )}

      {/* Natijalar */}
      <div className="search-results">
        {restLoading ? (
          Array.from({ length: 3 }).map((_, i) => <RestaurantCardSkeleton key={i} />)
        ) : nothingFound ? (
          <div className="search-empty">
            <Icon name="search" size={44} color="#7D7264" />
            <div className="search-empty__title">Hech narsa topilmadi</div>
            <p className="search-empty__hint">Boshqa so'z bilan qidiring yoki filtrlarni o'zgartiring</p>
            {activeCount > 0 && (
              <button onClick={reset} className="search-empty__btn">Filtrlarni tozalash</button>
            )}
          </div>
        ) : (
          <>
            {foundDishes.length > 0 && (
              <>
                <h2 className="search-section-title">Taomlar</h2>
                <div className="search-dishes">
                  {foundDishes.map((d) => (
                    <DishGridCard key={d.id || d._id} dish={d} onClick={setModalDish} />
                  ))}
                </div>
              </>
            )}

            <h2 className="search-section-title">
              {hasQuery || activeCount ? 'Topilgan muassasalar' : 'Barcha muassasalar'}
              <span className="search-section-count">{filteredRestaurants.length}</span>
            </h2>
            <div className="search-restaurants">
              {filteredRestaurants.map((r) => (
                <RestaurantCard key={r.id || r._id} restaurant={r} />
              ))}
            </div>
          </>
        )}
      </div>

      <CartBar />
      <BottomNav />

      {modalDish && <DishModal dish={modalDish} onClose={() => setModalDish(null)} />}

      {showFilter && (
        <FilterSheet
          specials={specials} setSpecials={setSpecials}
          maxTime={maxTime} setMaxTime={setMaxTime}
          categories={categories} setCategories={setCategories}
          sort={sort} setSort={setSort}
          onReset={reset}
          onClose={() => setShowFilter(false)}
          resultCount={filteredRestaurants.length}
        />
      )}
    </div>
  );
}

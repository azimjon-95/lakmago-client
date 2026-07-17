import { useState, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { BannerSlider } from '@/components/BannerSlider';
import { RestaurantCard } from '@/components/RestaurantCard';
import { DishScrollCard } from '@/components/DishScrollCard';
import { DishGridCard } from '@/components/DishGridCard';
import { DishModal } from '@/components/DishModal';
import { BottomNav } from '@/components/BottomNav';
import { CartBar } from '@/components/CartBar';
import { LangSwitch } from '@/components/LangSwitch/LangSwitch';
import { RestaurantCardSkeleton, DishScrollСardSkeleton } from '@/components/Skeleton/Skeleton';
import { useUser } from '@/store/user';
import { useT } from '@/i18n';
import { useRestaurants, useTrendingDishes, useDiscountedDishes, useBannersQuery, useAllDishes } from '@/hooks/queries';
import './Home.css';

const categories = [
  { id: 'all', key: 'all' },
  { id: 'milliy', label: 'Milliy' },
  { id: 'choyxona', label: 'Choyxona' },
  { id: 'fastfood', label: 'Fast food' },
  { id: 'sushi', label: 'Sushi' },
  { id: 'shirinlik', label: 'Shirinlik' },
];

const SectionHeader = memo(function SectionHeader({ icon, title, action }) {
  return (
    <div className="home-section-header">
      <div className="home-section-header__title">
        {icon && <Icon name={icon} size={17} color="#D85A30" />} {title}
      </div>
      {action && <div className="home-section-header__action">{action}</div>}
    </div>
  );
});

export function HomePage() {
  const navigate = useNavigate();
  const t = useT();
  const user = useUser((s) => s.user);
  const [category, setCategory] = useState('all');
  const [modalDish, setModalDish] = useState(null);

  // Real data — TanStack Query (cache + background refetch)
  const { data: restaurants = [], isLoading: restLoading } = useRestaurants();
  const { data: trending = [], isLoading: trendLoading } = useTrendingDishes();
  const { data: discounted = [] } = useDiscountedDishes();
  const { data: allDishes = [], isLoading: allDishesLoading } = useAllDishes();
  const { data: banners = [] } = useBannersQuery();

  // Filtrlashni memolaymiz (keraksiz qayta hisoblash bo'lmaydi)
  const filtered = useMemo(
    () => (category === 'all' ? restaurants : restaurants.filter((r) => r.category === category)),
    [restaurants, category],
  );

  const defaultAddress = useMemo(
    () => user.addresses.find((a) => a.id === user.defaultAddressId) ?? user.addresses[0],
    [user.addresses, user.defaultAddressId],
  );

  const openModal = useCallback((d) => setModalDish(d), []);
  const closeModal = useCallback(() => setModalDish(null), []);

  return (
    <div className="app-shell home">
      <header className="home-header">
        <button onClick={() => navigate('/profile')} className="home-header__addr">
          <span className="home-header__addr-label">
            <Icon name="pin" size={12} color="#EF9F27" /> {t('deliveryAddress')}
          </span>
          <span className="home-header__addr-value">
            {defaultAddress ? `${defaultAddress.title}, ${defaultAddress.address}`.slice(0, 26) : t('address')}
            <Icon name="chevronDown" size={13} color="#9A9A96" />
          </span>
        </button>
        <div className="home-header__right">
          <LangSwitch compact />
          <button onClick={() => navigate('/profile')} className="home-header__avatar">
            {user.photoInitials}
          </button>
        </div>
      </header>

      <div className="home-search">
        <button onClick={() => navigate('/search')} className="home-search__btn">
          <Icon name="search" size={18} color="#9A9A94" />
          <span>{t('search')}</span>
        </button>
      </div>

      <BannerSlider banners={banners} />

      <div className="home-categories no-scrollbar">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`home-cat ${category === c.id ? 'is-active' : ''}`}
          >
            {c.key ? t(c.key) : c.label}
          </button>
        ))}
      </div>

      {/* Trend taomlar */}
      {(trendLoading || trending.length > 0) && (
        <>
          <SectionHeader icon="flame" title={t('trendingDishes')} action={t('all')} />
          <div className="home-scroll-row no-scrollbar">
            {trendLoading
              ? Array.from({ length: 4 }).map((_, i) => <DishScrollСardSkeleton key={i} />)
              : trending.map((d) => <DishScrollCard key={d.id || d._id} dish={d} onClick={openModal} />)}
          </div>
        </>
      )}

      {/* Chegirmadagi taomlar */}
      {discounted.length > 0 && (
        <>
          <SectionHeader icon="discount" title={t('discountedDishes')} action={t('all')} />
          <div className="home-scroll-row no-scrollbar">
            {discounted.map((d) => <DishScrollCard key={d.id || d._id} dish={d} onClick={openModal} />)}
          </div>
        </>
      )}

      {/* Barcha restoranlar */}
      <h2 className="home-restaurants-title">{t('allRestaurants')}</h2>
      <div className="home-restaurants">
        {restLoading ? (
          Array.from({ length: 4 }).map((_, i) => <RestaurantCardSkeleton key={i} />)
        ) : filtered.length > 0 ? (
          filtered.map((r) => <RestaurantCard key={r.id || r._id} restaurant={r} />)
        ) : (
          <div className="home-empty">{t('empty')}</div>
        )}
      </div>

      {/* Barcha taomlar (hamma restoran/kafelar aralash) */}
      {(allDishesLoading || allDishes.length > 0) && (
        <>
          <h2 className="home-restaurants-title">{t('allDishes')}</h2>
          <div className="home-dishes-grid">
            {allDishesLoading
              ? Array.from({ length: 6 }).map((_, i) => <DishScrollСardSkeleton key={i} />)
              : allDishes.map((d) => (
                  <DishGridCard key={d.id || d._id} dish={d} onClick={openModal} />
                ))}
          </div>
        </>
      )}

      <div style={{ flex: 1 }} />
      <CartBar />
      <BottomNav />

      {modalDish && <DishModal dish={modalDish} onClose={closeModal} />}
    </div>
  );
}

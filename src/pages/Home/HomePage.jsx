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
import { useOpenDishes, useClosedAlert } from '@/hooks/useOpenStatus';
import { ClosedAlert } from '@/components/ClosedAlert';
import { PromoStrip, AdStrip } from '@/components/PromoStrip';
import { useRestaurants, useTrendingDishes, useBannersQuery, useAllDishes } from '@/hooks/queries';
import { API_BASE } from '@/api';
import { AddressFlow } from '@/components/AddressFlow/AddressFlow';
import { CategoryIcon } from '@/components/CategoryIcons/CategoryIcon';
import { HOME_CATEGORIES as categories } from '@/data/categories';
import { AddressSheet } from '@/components/AddressSheet';
import './Home.css';

// Kategoriyalar markaziy ro'yxatdan (src/data/categories.js)

/*
 * Oddiy sarlavha (Trend taomlar kabi) va Express24 uslubidagi
 * ikki pog'onali oranjevа banner (Chegirmadagi taomlar) — SVG
 * shakli foydalanuvchi bergan aniq yo'l (path) asosida, har
 * qanday ekran kengligiga cho'ziladi (preserveAspectRatio="none").
 */
const SectionHeader = memo(function SectionHeader({ icon, title, action, variant = 'plain' }) {
  if (variant === 'banner') {
    return (
      <div className="home-section-banner">
        <svg
          className="home-section-banner__shape"
          viewBox="0 0 100 82"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0,82 L0,34 A3.409,24 0 0 1 3.409,10 L60.511,10 A3.409,24 0 0 1 63.920,34 L63.920,51 A3.409,24 0 0 0 67.330,75 L100,75 L100,82 Z" />
        </svg>
        <span className="home-section-banner__text">
          {icon && <Icon name={icon} size={18} color="#fff" />}
          {title}
        </span>
      </div>
    );
  }
  return (
    <div className="home-section-header">
      <div className="home-section-header__title">
        {icon && <Icon name={icon} size={17} color="var(--appetite)" />} {title}
      </div>
      {action && <div className="home-section-header__action">{action}</div>}
    </div>
  );
});

export function HomePage() {
  const navigate = useNavigate();
  const t = useT();
  const user = useUser((s) => s.user);
  const addAddress = useUser((s) => s.addAddress);
  const setDefaultAddress = useUser((s) => s.setDefaultAddress);
  const [category, setCategory] = useState('all');
  const [modalDish, setModalDish] = useState(null);
  const [showAddressFlow, setShowAddressFlow] = useState(false);
  const [showAddressSheet, setShowAddressSheet] = useState(false);

  // Real data — TanStack Query (cache + background refetch)
  const { data: restaurants = [], isLoading: restLoading, isError: restError, error: restErrorObj, refetch: refetchRest } = useRestaurants();
  const { data: trending = [], isLoading: trendLoading } = useTrendingDishes();
  const { data: allDishes = [], isLoading: allDishesLoading } = useAllDishes();
  const { data: banners = [] } = useBannersQuery();

  // Kategoriya tanlanganda restoranlar VA taomlar birga filtrlanadi
  const filtered = useMemo(
    () => (category === 'all' ? restaurants : restaurants.filter((r) => r.category === category)),
    [restaurants, category],
  );

  // Taomlar ham shu kategoriya bo'yicha. Taomda kategoriya bo'lmasa —
  // restorani mos kelsa ham ko'rsatamiz (eski ma'lumot uchun).
  // Taomlar FAQAT o'z kategoriyasi bo'yicha filtrlanadi.
  // Avval restoran kategoriyasi ham hisobga olinardi — natijada
  // "Salatlar" tanlansa salat restoranining hamma taomlari chiqardi.
  // Yopiq restoran taomlari ro'yxatdan chiqadi.
  // Ish vaqti boshlanganda avtomatik qaytadi — refresh kerak emas.
  const openDishes = useOpenDishes(allDishes);
  const { closedInfo, showClosed, hideClosed } = useClosedAlert();

  const filteredDishes = useMemo(() => {
    if (category === 'all') return openDishes;
    return openDishes.filter((d) => d.category === category);
  }, [openDishes, category]);

  // Har ochilganda tartib o'zgaradi — sahifa qayta render bo'lganda
  // emas, faqat ilova ochilganda (seed sessiyada saqlanadi)
  const shuffleSeed = useMemo(() => {
    const KEY = 'lokma_shuffle_seed';
    let v = sessionStorage.getItem(KEY);
    if (!v) {
      v = String(Math.random());
      sessionStorage.setItem(KEY, v);
    }
    return Number(v);
  }, []);

  // Barqaror aralashtirish: seed bir xil bo'lsa natija ham bir xil
  const shuffle = useCallback((arr, seed) => {
    const a = [...arr];
    let s = seed * 10000;
    for (let i = a.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, []);

  // Chegirmadagilar — eski narxi bor va u hozirgisidan katta.
  // Barcha restoranlardan yig'iladi, kategoriya tanlansa filtrlanadi.
  const discountedShown = useMemo(() => {
    const pool = filteredDishes.filter(
      (d) => Number(d.oldPrice) > Number(d.price),
    );
    return shuffle(pool, shuffleSeed).slice(0, 20);
  }, [filteredDishes, shuffleSeed, shuffle]);

  // Tavsiya — chegirmasi yo'q taomlar (bitta narxli)
  const recommended = useMemo(() => {
    const pool = filteredDishes.filter(
      (d) => !(Number(d.oldPrice) > Number(d.price)),
    );
    return shuffle(pool, shuffleSeed).slice(0, 20);
  }, [filteredDishes, shuffleSeed, shuffle]);

  const defaultAddress = useMemo(
    () => user.addresses.find((a) => a.id === user.defaultAddressId) ?? user.addresses[0],
    [user.addresses, user.defaultAddressId],
  );

  const openModal = useCallback((d) => setModalDish(d), []);
  const closeModal = useCallback(() => setModalDish(null), []);

  return (
    <div className="app-shell home">
      <header className="home-header">
        <button onClick={() => (user.addresses.length ? setShowAddressSheet(true) : setShowAddressFlow(true))} className="home-header__addr">
          <span className="home-header__addr-label">
            <Icon name="pin" size={12} color="var(--brand)" /> {t('deliveryAddress')}
          </span>
          <span className="home-header__addr-value">
            {defaultAddress ? `${defaultAddress.title}, ${defaultAddress.address}`.slice(0, 26) : t('address')}
            <Icon name="chevronDown" size={13} color="var(--muted)" />
          </span>
        </button>
        <div className="home-header__right">
          {/* Qidiruv — ikonka, joyni tejaydi */}
          <button
            onClick={() => navigate('/search')}
            className="home-header__icon-btn"
            aria-label={t('search')}
          >
            <Icon name="search" size={19} color="var(--ink)" />
          </button>
          <LangSwitch compact />
        </div>
      </header>

      <BannerSlider banners={banners} />

      <div className="home-categories no-scrollbar">
      <button className='nobtn'></button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory((cur) => (cur === c.id ? 'all' : c.id))}
            className={`home-cat ${category === c.id ? 'is-active' : ''}`}
          >
            <span className="home-cat__art">
              <CategoryIcon name={c.art} id={c.id} img={c.img} size={52} />
            </span>
            <span className="home-cat__label">{c.key ? t(c.key) : c.label}</span>
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

      {/* Faol aksiyalar — restoran adminida yaratilgan */}
      <PromoStrip category={category} />

      {/* Reklama */}
      <AdStrip placement="home" />

      {/* Chegirmadagi taomlar — Express24 uslubida bitta ramka:
          tepasi qattiq oranjevа banner, ichi och fon */}
      {discountedShown.length > 0 && (
        <div className="home-discount-frame">
          <SectionHeader icon="discount" title={t('discountedDishes')} variant="banner" />
          <div className="home-discount-frame__body">
            <div className="home-dishes-row no-scrollbar">
              {discountedShown.map((d) => (
                <DishGridCard key={d.id || d._id} dish={d} onClick={openModal} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tavsiya qilamiz — har kirganda tartib o'zgaradi */}
      {(allDishesLoading || recommended.length > 0) && (
        <>
          <h2 className="home-restaurants-title">{t('recommended')}</h2>
          <div className="home-dishes-row no-scrollbar">
            {allDishesLoading
              ? Array.from({ length: 6 }).map((_, i) => <DishScrollСardSkeleton key={i} />)
              : recommended.map((d) => (
                  <DishGridCard key={d.id || d._id} dish={d} onClick={openModal} />
                ))}
          </div>
        </>
      )}

      {/* Barcha restoranlar */}
      <h2 className="home-restaurants-title">{t('allRestaurants')}</h2>
      <div className="home-restaurants">
        {restLoading ? (
          Array.from({ length: 4 }).map((_, i) => <RestaurantCardSkeleton key={i} />)
        ) : restError ? (
          <div className="home-error">
            <div className="home-error__icon">📡</div>
            <div className="home-error__title">Ma'lumot yuklanmadi</div>
            <div className="home-error__text">
              {restErrorObj?.kind === 'network'
                ? 'Serverga ulanib bo\u2018lmadi. Internet aloqasini tekshiring.'
                : `Server javob bermadi${restErrorObj?.status ? ` (${restErrorObj.status})` : ''}.`}
            </div>
            <button onClick={() => refetchRest()} className="home-error__btn">Qayta urinish</button>
            <details className="home-error__details">
              <summary>Texnik ma'lumot</summary>
              <div className="home-error__code">
                <div>API: {API_BASE}</div>
                {restErrorObj?.kind && <div>Tur: {restErrorObj.kind}</div>}
                {restErrorObj?.status && <div>Kod: {restErrorObj.status}</div>}
                {restErrorObj?.detail && <div>Tafsilot: {restErrorObj.detail}</div>}
              </div>
            </details>
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((r) => <RestaurantCard key={r.id || r._id} restaurant={r} />)
        ) : (
          <div className="home-empty">{t('empty')}</div>
        )}
      </div>

      <div style={{ flex: 1 }} />
      <CartBar />
      <BottomNav />

      {modalDish && (
        <DishModal
          dish={modalDish}
          onClose={closeModal}
          onClosedAlert={showClosed}
        />
      )}
      <ClosedAlert info={closedInfo} onClose={hideClosed} />

      {/* Saqlangan manzillar ro'yxati (bor bo'lsa) */}
      {showAddressSheet && (
        <AddressSheet
          addresses={user.addresses}
          selectedId={user.defaultAddressId}
          onSelect={(id) => { setDefaultAddress(id); setShowAddressSheet(false); }}
          onAdd={() => { setShowAddressSheet(false); setShowAddressFlow(true); }}
          onClose={() => setShowAddressSheet(false)}
        />
      )}

      {/* Yangi manzil qo'shish oqimi */}
      {showAddressFlow && (
        <AddressFlow
          onSave={(addr) => addAddress(addr)}
          onClose={() => setShowAddressFlow(false)}
        />
      )}
    </div>
  );
}

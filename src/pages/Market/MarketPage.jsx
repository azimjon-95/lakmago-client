import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Icon } from '@/components/Icon';
import { RestaurantCard } from '@/components/RestaurantCard';
import { DishModal } from '@/components/DishModal';
import { BottomNav } from '@/components/BottomNav';
import { CartBar } from '@/components/CartBar';
import { RestaurantCardSkeleton } from '@/components/Skeleton/Skeleton';
import { DiscountSlider } from '@/components/MarketSlider/DiscountSlider';
import { ClosedAlert } from '@/components/ClosedAlert';
import { useClosedAlert, useOpenPartition } from '@/hooks/useOpenStatus';
import { useFeatures, useMarketCategories, useMarketStores, useMarketBanners } from '@/hooks/queries';
import { BannerSlider } from '@/components/BannerSlider';
import { HomeSections } from '@/components/HomeSections/HomeSections';
import { useUser } from '@/store/user';
import { useSection } from '@/store/section';
import { useI18n } from '@/i18n';
import { api } from '@/api';
import { marketCatLabel } from '@/data/market';
import '@/pages/Home/Home.css';
import './Market.css';

/*
 * ═══ LOKMA MARKET ═══
 *
 * Bosh sahifaning do'konlarga moslangan varianti: restoran va taomlar
 * O'RNIGA do'konlar va ularning mahsulotlari. Qolgan hamma narsa —
 * do'kon sahifasi (/restaurant/:id), mahsulot oynasi, savat, buyurtma,
 * to'lov — restoranlar bilan bir xil komponentlar orqali ishlaydi.
 *
 * Ma'lumot: /api/market/* (server faqat do'konlarni beradi). Bo'lim
 * yopiq bo'lsa (server .env ruxsati) — "mavjud emas" ekrani.
 */
const PAGE = 24;

function useMarketProducts({ discounted, category, enabled }) {
  return useInfiniteQuery({
    queryKey: ['market', 'products', discounted ? 'disc' : 'reg', category],
    queryFn: ({ pageParam, signal }) => api.getMarketProducts({
      discounted, category, cursor: pageParam || undefined, limit: PAGE, signal,
    }),
    initialPageParam: null,
    getNextPageParam: (last) => (last?.hasMore ? last.nextCursor : undefined),
    enabled,
    staleTime: 60_000,
  });
}

const flat = (q) => (q.data?.pages || []).flatMap((p) => p?.items || []);

export function MarketPage() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const authStatus = useUser((s) => s.authStatus);
  const { data: features, isLoading: featLoading } = useFeatures(authStatus);
  const allowed = Boolean(features?.market);

  /*
   * MARKET RANGI: sahifa ochiq turganda butun ilova brend ranglari
   * (savat tugmasi, faol menyu, narx urg'usi, "+" tugmalar, oynalar)
   * yashilga o'tadi — :root[data-section="market"] (Market.css).
   * <html> ga qo'yiladi, shunda portal orqali chiqadigan oynalar ham
   * oladi. Sahifadan chiqilganda o'zining oltin/to'q sariq rangi qaytadi.
   */
  /*
   * Bo'lim — Market. Sahifadan chiqqanda (Qidiruv, Buyurtmalar, Profil,
   * savat...) ham Market'da qolinadi; Lokma Go'ga faqat bosh sahifa
   * ochilganda qaytiladi (HomePage → setSection('go')). store/section.js
   */
  const setSection = useSection((s) => s.setSection);
  useEffect(() => { setSection('market'); }, [setSection]);

  const [category, setCategory] = useState('all');
  const [modalDish, setModalDish] = useState(null);
  const { closedInfo, showClosed, hideClosed } = useClosedAlert();

  const { data: meta } = useMarketCategories();
  // Market bannerlari — admin "Bannerlar"da joylashuvni "Lokma Market" qiladi
  const { data: banners = [] } = useMarketBanners(allowed);
  const { data: stores = [], isLoading: storesLoading, isError: storesError, refetch } = useMarketStores(allowed);
  const discQ = useMarketProducts({ discounted: true, category, enabled: allowed });

  /*
   * Kategoriyalar: faqat do'konlarda MAHSULOTI BOR kategoriyalar
   * (54 ta bo'sh tugma chiqmasin), server tartibida.
   */
  const presentCats = useMemo(() => {
    const used = new Set(stores.flatMap((s) => s.productCategories || []));
    return (meta?.categories || []).filter((c) => used.has(c.value));
  }, [meta, stores]);

  // Kategoriya emojisi (rasmsiz mahsulot uchun slayderda)
  const catMap = useMemo(() => new Map((meta?.categories || []).map((c) => [c.value, c])), [meta]);

  // Tanlangan kategoriya bo'yicha do'konlar; ochiqlari oldinda
  const shownStores = useMemo(() => {
    const list = category === 'all' ? stores : stores.filter((s) => (s.productCategories || []).includes(category));
    return [...list].sort((a, b) => Number(b.isOpen !== false) - Number(a.isOpen !== false));
  }, [stores, category]);

  // Chegirmadagi mahsulotlar (slayder) — ochiq do'konlar oldinda, yopiqlari oxirida
  const discount = flat(discQ);
  const discParts = useOpenPartition(discount);
  const discShown = useMemo(() => [...discParts.open, ...discParts.closed], [discParts]);
  const closedIds = useMemo(() => new Set(discParts.closedIds), [discParts]);

  const openModal = useCallback((d) => setModalDish(d), []);

  const header = (
    <header className="market-header">
      <img className="market-header__logo" src="/sections/market-basket.webp" alt="" width="40" height="40" />
      <div className="market-header__title">
        <span>{t('lokmaMarket')}</span>
        <small>{t('marketSubtitle')}</small>
      </div>
    </header>
  );

  if (!featLoading && !allowed) {
    return (
      <div className="app-shell market">
        {header}
        <div className="market-empty">
          <div className="market-empty__art">🧺</div>
          <p>{t('marketUnavailable')}</p>
          <button type="button" className="market-empty__btn" onClick={() => navigate('/')}>{t('goHome')}</button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const nothing = !storesLoading && !storesError && stores.length === 0;

  return (
    <div className="app-shell market">
      {header}

      {/*
        Banner: admin qo'shgan Market bannerlari (bosh sahifa bannerlari bilan bir xil
        karusel). Hali qo'shilmagan bo'lsa — o'rnatilgan bezakli banner.
      */}
      {banners.length > 0 ? (
        <div className="market-banner">
          <BannerSlider banners={banners} onAdClick={() => {}} />
        </div>
      ) : (
        <div className="market-hero">
          <div className="market-hero__text">
            <div className="market-hero__eyebrow">{t('lokmaMarket')}</div>
            <div className="market-hero__title">{t('marketHero')}</div>
            {stores.length > 0 && <div className="market-hero__sub">{stores.length} · {t('stores')}</div>}
          </div>
          <img className="market-hero__art" src="/sections/market-basket.webp" alt="" width="104" height="104" />
        </div>
      )}

      {/* Bo'limlar orasida o'tish: Lokma Go (taomlar) · To'yxonalar */}
      <HomeSections current="market" wedding={Boolean(features?.wedding)} />

      {/* Kategoriyalar */}
      {presentCats.length > 0 && (
        <div className="market-cats no-scrollbar">
          <button type="button" onClick={() => setCategory('all')}
            className={`market-cat ${category === 'all' ? 'is-active' : ''}`}>
            <span className="market-cat__art">🛍️</span>
            <span className="market-cat__label">{t('all')}</span>
          </button>
          {presentCats.map((c) => (
            <button key={c.value} type="button"
              onClick={() => setCategory((cur) => (cur === c.value ? 'all' : c.value))}
              className={`market-cat ${category === c.value ? 'is-active' : ''}`}>
              <span className="market-cat__art">{c.emoji}</span>
              <span className="market-cat__label">{marketCatLabel(c, lang)}</span>
            </button>
          ))}
        </div>
      )}

      {nothing ? (
        <div className="market-empty">
          <div className="market-empty__art">🧺</div>
          <p>{t('noProducts')}</p>
        </div>
      ) : (
        <>
          {/* Chegirmadagi mahsulotlar — o'zi harakatlanuvchi slayder (Do'konlar tepasida) */}
          <DiscountSlider
            title={t('marketDiscounts')}
            items={discShown}
            loading={discQ.isLoading}
            closedIds={closedIds}
            onOpen={openModal}
            emojiOf={(d) => catMap.get(d.marketCategory)?.emoji}
          />

          {/* Do'konlar */}
          <h2 className="home-restaurants-title">{t('stores')}</h2>
          <div className="home-restaurants">
            {storesLoading ? (
              Array.from({ length: 3 }).map((_, i) => <RestaurantCardSkeleton key={i} />)
            ) : storesError ? (
              <div className="home-error">
                <div className="home-error__title">{t('dataLoadFailed')}</div>
                <button type="button" onClick={() => refetch()} className="home-error__btn">{t('retry')}</button>
              </div>
            ) : shownStores.length > 0 ? (
              shownStores.map((s) => <RestaurantCard key={s._id || s.id} restaurant={s} />)
            ) : (
              <div className="home-empty">{t('empty')}</div>
            )}
          </div>

        </>
      )}

      <div style={{ flex: 1, minHeight: 16 }} />
      <CartBar />
      <BottomNav />

      {modalDish && (
        <DishModal dish={modalDish} onClose={() => setModalDish(null)} onClosedAlert={showClosed} />
      )}
      <ClosedAlert info={closedInfo} onClose={hideClosed} />
    </div>
  );
}

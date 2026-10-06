import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Icon } from '@/components/Icon';
import { RestaurantCard } from '@/components/RestaurantCard';
import { DishGridCard } from '@/components/DishGridCard';
import { DishModal } from '@/components/DishModal';
import { BottomNav } from '@/components/BottomNav';
import { CartBar } from '@/components/CartBar';
import { RestaurantCardSkeleton, DishScrollCardSkeleton } from '@/components/Skeleton/Skeleton';
import { ClosedAlert } from '@/components/ClosedAlert';
import { useClosedAlert, useOpenPartition } from '@/hooks/useOpenStatus';
import { useFeatures, useMarketCategories, useMarketStores } from '@/hooks/queries';
import { useUser } from '@/store/user';
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

  const [category, setCategory] = useState('all');
  const [modalDish, setModalDish] = useState(null);
  const { closedInfo, showClosed, hideClosed } = useClosedAlert();

  const { data: meta } = useMarketCategories();
  const { data: stores = [], isLoading: storesLoading, isError: storesError, refetch } = useMarketStores(allowed);
  const discQ = useMarketProducts({ discounted: true, category, enabled: allowed });
  const regQ = useMarketProducts({ discounted: false, category, enabled: allowed });

  /*
   * Kategoriyalar: faqat do'konlarda MAHSULOTI BOR kategoriyalar
   * (54 ta bo'sh tugma chiqmasin), server tartibida.
   */
  const presentCats = useMemo(() => {
    const used = new Set(stores.flatMap((s) => s.productCategories || []));
    return (meta?.categories || []).filter((c) => used.has(c.value));
  }, [meta, stores]);

  // Tanlangan kategoriya bo'yicha do'konlar; ochiqlari oldinda
  const shownStores = useMemo(() => {
    const list = category === 'all' ? stores : stores.filter((s) => (s.productCategories || []).includes(category));
    return [...list].sort((a, b) => Number(b.isOpen !== false) - Number(a.isOpen !== false));
  }, [stores, category]);

  const discount = flat(discQ);
  const regular = flat(regQ);
  const discParts = useOpenPartition(discount);
  const regParts = useOpenPartition(regular);
  const discShown = useMemo(() => [...discParts.open, ...discParts.closed], [discParts]);
  const regShown = useMemo(() => [...regParts.open, ...regParts.closed], [regParts]);
  const closedIds = useMemo(() => new Set([...discParts.closedIds, ...regParts.closedIds]), [discParts, regParts]);

  const openModal = useCallback((d) => setModalDish(d), []);

  const header = (
    <header className="market-header">
      <button type="button" className="market-header__back" onClick={() => navigate(-1)} aria-label="Orqaga">
        <Icon name="arrowLeft" size={20} color="var(--ink)" />
      </button>
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

      <div className="market-hero">
        <div>
          <div className="market-hero__title">{t('marketHero')}</div>
          <div className="market-hero__sub">{stores.length > 0 ? `${stores.length} · ${t('stores')}` : '\u00a0'}</div>
        </div>
        <span className="market-hero__art" aria-hidden="true">🛒</span>
      </div>

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
          {/* Chegirmadagi mahsulotlar */}
          {(discQ.isLoading || discShown.length > 0) && (
            <>
              <div className="home-section-header">
                <div className="home-section-header__title">
                  <Icon name="discount" size={17} color="var(--appetite)" /> {t('marketDiscounts')}
                </div>
              </div>
              <div className="home-dishes-row no-scrollbar">
                {discQ.isLoading
                  ? Array.from({ length: 4 }).map((_, i) => <DishScrollCardSkeleton key={i} />)
                  : discShown.map((d) => (
                    <DishGridCard key={d._id || d.id} dish={d} onClick={openModal} closed={closedIds.has(String(d._id || d.id))} />
                  ))}
              </div>
            </>
          )}

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

          {/* Barcha mahsulotlar — 2 ustunli setka, "Yana ko'rsatish" */}
          {(regQ.isLoading || regShown.length > 0) && (
            <>
              <h2 className="home-restaurants-title">{t('products')}</h2>
              <div className="market-grid">
                {regQ.isLoading
                  ? Array.from({ length: 6 }).map((_, i) => <DishScrollCardSkeleton key={i} />)
                  : regShown.map((d) => (
                    <DishGridCard key={d._id || d.id} dish={d} onClick={openModal} closed={closedIds.has(String(d._id || d.id))} />
                  ))}
              </div>
              {regQ.hasNextPage && (
                <div className="market-more">
                  <button type="button" onClick={() => regQ.fetchNextPage()} disabled={regQ.isFetchingNextPage}>
                    {regQ.isFetchingNextPage ? '…' : t('showMore')}
                  </button>
                </div>
              )}
            </>
          )}
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

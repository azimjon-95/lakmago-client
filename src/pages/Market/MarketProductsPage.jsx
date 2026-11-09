import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { DishGridCard } from '@/components/DishGridCard';
import { DishModal } from '@/components/DishModal';
import { ClosedAlert } from '@/components/ClosedAlert';
import { BottomNav } from '@/components/BottomNav';
import { CartBar } from '@/components/CartBar';
import { Icon } from '@/components/Icon';
import { ProductCardSkeleton } from '@/components/Skeleton/ProductCardSkeleton';
import { useClosedAlert } from '@/hooks/useOpenStatus';
import { useBack } from '@/hooks/useBack';
import { api } from '@/api';
import { useI18n } from '@/i18n';
import { useMarketCategories } from '@/hooks/queries';
import { homeCatLabel } from '@/data/marketHomeCategories';
// DishGridCard ning asosiy uslublari Home.css da — sahifa to'g'ridan-to'g'ri ochilganda (havola/yangilash) ham yuklansin (MarketPage kabi)
import '@/pages/Home/Home.css';
import './Market.css';
import './MarketProducts.css';

const PAGE = 24;           // bir so'rovda keladigan mahsulotlar
const SKELETON_COUNT = 6;  // dastlabki yuklashda
const MORE_SKELETON = 4;   // keyingi sahifa yuklanayotganda (pastda)
const PRELOAD_MARGIN = '700px 0px';   // pastga shuncha qolganda keyingi sahifani oldindan so'raymiz

/*
 * Ro'yxat oxiriga yaqinlashganda `onVisible` chaqiriladi (IntersectionObserver).
 * Kuzatuvchi HAR safar (sahifa yuklangach) qayta quriladi: sentinel hali ko'rinib tursa ham yangi tekshiruv
 * darhol ishlaydi — aks holda IntersectionObserver faqat "kirish/chiqish" o'zgarganda ishlaydi va yuklash to'xtab qolardi.
 */
function useNearEnd({ enabled, onVisible, deps }) {
  const ref = useRef(null);
  const cb = useRef(onVisible);
  cb.current = onVisible;
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) cb.current();
    }, { rootMargin: PRELOAD_MARGIN });
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);
  return ref;
}

/* Barcha mahsulotlar — alohida sahifa (Market'dagi "Barchasi" tugmasi shu yerga olib keladi) */
export function MarketProductsPage() {
  const { t, lang } = useI18n();
  const goBack = useBack();
  const [params] = useSearchParams();
  const catalogCategory = params.get('category') || undefined;
  // Sarlavha: kategoriya bilan ochilsa — kategoriya nomi ("Choy"), aks holda "Barchasi"
  const { data: catMeta } = useMarketCategories(Boolean(catalogCategory));
  const catTitle = catalogCategory ? homeCatLabel((catMeta?.catalogCategories || []).find((c) => c.key === catalogCategory), lang) : '';
  const [modalDish, setModalDish] = useState(null);
  const { closedInfo, showClosed, hideClosed } = useClosedAlert();
  const openModal = useCallback((d) => setModalDish(d), []);

  const q = useInfiniteQuery({
    queryKey: ['market', 'products-page', catalogCategory || 'all'],
    queryFn: ({ pageParam, signal }) => api.getMarketProducts({
      catalogCategory, cursor: pageParam || undefined, limit: PAGE, signal,
    }),
    initialPageParam: null,
    getNextPageParam: (last) => (last?.hasMore ? last.nextCursor : undefined),
    staleTime: 60_000,
  });

  // Sahifalar birlashtiriladi; bir xil mahsulot ikki marta chiqmasin (kursor siljishi)
  const items = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const page of q.data?.pages || []) {
      for (const d of page?.items || []) {
        const id = String(d?._id || d?.id || '');
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(d);
      }
    }
    return out;
  }, [q.data]);

  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = q;
  const canLoadMore = Boolean(hasNextPage) && !isFetchingNextPage && !isFetchNextPageError;
  const loadMore = useCallback(() => { if (canLoadMore) fetchNextPage(); }, [canLoadMore, fetchNextPage]);
  const sentinelRef = useNearEnd({ enabled: canLoadMore, onVisible: loadMore, deps: [items.length] });
  const observerSupported = typeof IntersectionObserver !== 'undefined';

  return (
    <div className="app-shell market-products-page">
      <header className="mpp-head">
        <button type="button" className="mpp-back" onClick={goBack} aria-label={t('back')}>
          <Icon name="arrowLeft" size={20} color="#13803F" strokeWidth={2.4} />
        </button>
        <h1 className="mpp-title">{catTitle || t('all')}</h1>
        {items.length > 0 && <span className="mpp-count" data-testid="mpp-count">{items.length}{hasNextPage ? '+' : ''}</span>}
      </header>

      <div className="mpp-body">
        {q.isLoading ? (
          <div className="mpp-grid" data-testid="mpp-loading">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : q.isError && items.length === 0 ? (
          <div className="home-error">
            <div className="home-error__title">{t('dataLoadFailed')}</div>
            <button type="button" onClick={() => q.refetch()} className="home-error__btn">{t('retry')}</button>
          </div>
        ) : items.length === 0 ? (
          <div className="market-empty"><div className="market-empty__art">🧺</div><p>{t('noProducts')}</p></div>
        ) : (
          <>
            <div className="mpp-grid" data-testid="mpp-grid">
              {items.map((d) => (
                <DishGridCard key={d._id || d.id} dish={d} onClick={openModal} photoHeight={88} photoFit="contain" />
              ))}
              {/* Keyingi sahifa yuklanayotganda — ro'yxat davomida skeleton */}
              {isFetchingNextPage && Array.from({ length: MORE_SKELETON }).map((_, i) => <ProductCardSkeleton key={`s${i}`} />)}
            </div>

            {/* Yuklash qo'riqchisi: ko'rinishga yaqinlashsa keyingi sahifa so'raladi */}
            {hasNextPage && !isFetchNextPageError && <div ref={sentinelRef} className="mpp-sentinel" aria-hidden="true" />}

            {isFetchNextPageError && (
              <div className="mpp-foot">
                <button type="button" className="mpp-retry" onClick={() => fetchNextPage()}>{t('retry')}</button>
              </div>
            )}
            {/* IntersectionObserver bo'lmagan eski brauzer: qo'lda yuklash */}
            {hasNextPage && !observerSupported && !isFetchingNextPage && !isFetchNextPageError && (
              <div className="mpp-foot">
                <button type="button" className="mpp-retry" onClick={() => fetchNextPage()}>{t('showMore')}</button>
              </div>
            )}
            {!hasNextPage && items.length > PAGE / 2 && (
              <div className="mpp-end" data-testid="mpp-end"><span>{t('marketAllShown')}</span></div>
            )}
          </>
        )}
      </div>

      <CartBar />
      <BottomNav />
      {modalDish && (
        <DishModal dish={modalDish} onClose={() => setModalDish(null)} onClosedAlert={showClosed} />
      )}
      <ClosedAlert info={closedInfo} onClose={hideClosed} />
    </div>
  );
}

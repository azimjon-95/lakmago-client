import { useMemo, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { DishGridCard } from '@/components/DishGridCard';
import { DishModal } from '@/components/DishModal';
import { BottomNav } from '@/components/BottomNav';
import { CartBar } from '@/components/CartBar';
import { RestaurantCardSkeleton } from '@/components/Skeleton/Skeleton';
import { api } from '@/api';
import { useI18n } from '@/i18n';
import './Market.css';

const PAGE = 24;
const flat = (q) => (q.data?.pages || []).flatMap((p) => p?.items || []);

/* Barcha mahsulotlar — alohida sahifa (Market'dagi "Barchasi" tugmasi shu yerga olib keladi) */
export function MarketProductsPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [params] = useSearchParams();
  const catalogCategory = params.get('category') || undefined;
  const [modalDish, setModalDish] = useState(null);
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
  const items = useMemo(() => flat(q), [q.data]);

  return (
    <div className="app-shell market-products-page">
      <header className="mpp-head">
        <button type="button" className="mpp-back" onClick={() => navigate(-1)} aria-label={t('back')}>
          <span aria-hidden="true">‹</span>
        </button>
        <h1 className="mpp-title">{t('all')}</h1>
        {items.length > 0 && <span className="mpp-count">{items.length}{q.hasNextPage ? '+' : ''}</span>}
      </header>

      <div className="mpp-body">
        {q.isLoading ? (
          <div className="market-grid">{Array.from({ length: 4 }).map((_, i) => <RestaurantCardSkeleton key={i} />)}</div>
        ) : q.isError ? (
          <div className="home-error">
            <div className="home-error__title">{t('dataLoadFailed')}</div>
            <button type="button" onClick={() => q.refetch()} className="home-error__btn">{t('retry')}</button>
          </div>
        ) : items.length === 0 ? (
          <div className="market-empty"><div className="market-empty__art">🧺</div><p>{t('noProducts')}</p></div>
        ) : (
          <>
            <div className="market-grid">
              {items.map((d) => <DishGridCard key={d._id || d.id} dish={d} onClick={openModal} />)}
            </div>
            {q.hasNextPage && (
              <button type="button" className="market-more" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
                {q.isFetchingNextPage ? '…' : t('showMore')}
              </button>
            )}
          </>
        )}
      </div>

      <CartBar />
      <BottomNav />
      <DishModal dish={modalDish} onClose={() => setModalDish(null)} onClosedAlert={() => {}} />
    </div>
  );
}

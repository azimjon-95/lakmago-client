import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@/components/Icon';
import { BottomNav } from '@/components/BottomNav';
import { CartBar } from '@/components/CartBar';
import { RestaurantCard } from '@/components/RestaurantCard';
import { DishGridCard } from '@/components/DishGridCard';
import { DishModal } from '@/components/DishModal';
import { DishScrollCardSkeleton } from '@/components/Skeleton/Skeleton';
import { ClosedAlert } from '@/components/ClosedAlert';
import { useClosedAlert } from '@/hooks/useOpenStatus';
import { useMarketStores, useMarketCategories } from '@/hooks/queries';
import { useI18n } from '@/i18n';
import { api } from '@/api';
import { marketCatLabel } from '@/data/market';
import './Search.css';

/*
 * ═══ MARKET QIDIRUVI ═══
 * Market rejimida pastki menyudagi "Qidiruv" shu sahifani ochadi:
 *   • mahsulotlar — serverda (nom / brend / shtrix-kod, ?q=)
 *   • do'konlar — nomi bo'yicha
 *   • so'z yozilmagan bo'lsa — kategoriyalar (bosilsa shu kategoriya mahsulotlari)
 */
export function MarketSearch() {
  const { t, lang } = useI18n();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [modalDish, setModalDish] = useState(null);
  const { closedInfo, showClosed, hideClosed } = useClosedAlert();

  useEffect(() => {
    const timer = setTimeout(() => setQ(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: stores = [] } = useMarketStores(true);
  const { data: meta } = useMarketCategories();

  const active = q.length >= 2 || category !== 'all';
  const { data: found, isFetching } = useQuery({
    queryKey: ['market', 'search', q, category],
    queryFn: ({ signal }) => api.getMarketProducts({
      q: q.length >= 2 ? q : undefined, category, limit: 40, signal,
    }),
    enabled: active,
    staleTime: 30_000,
  });
  const products = found?.items || [];

  const term = q.toLowerCase();
  const foundStores = useMemo(() => (q.length >= 2
    ? stores.filter((s) => (s.name || '').toLowerCase().includes(term) || (s.cuisine || '').toLowerCase().includes(term))
    : []), [stores, q, term]);

  const presentCats = useMemo(() => {
    const used = new Set(stores.flatMap((s) => s.productCategories || []));
    return (meta?.categories || []).filter((c) => used.has(c.value));
  }, [meta, stores]);

  const nothing = active && !isFetching && products.length === 0 && foundStores.length === 0;

  return (
    <div className="app-shell search-page">
      <div className="search-top">
        <div className="search-field">
          <Icon name="search" size={18} color="var(--muted)" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('marketSearch')}
            className="search-field__input"
            enterKeyHint="search"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label={t('close')}>
              <Icon name="x" size={16} color="var(--muted)" />
            </button>
          )}
        </div>
      </div>

      {presentCats.length > 0 && (
        <div className="search-chips no-scrollbar">
          {category !== 'all' && (
            <button type="button" onClick={() => setCategory('all')} className="search-chip search-chip--reset">
              {t('all')}
            </button>
          )}
          {presentCats.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory((cur) => (cur === c.value ? 'all' : c.value))}
              className={`search-chip ${category === c.value ? 'is-active' : ''}`}
            >
              {c.emoji} {marketCatLabel(c, lang)}
            </button>
          ))}
        </div>
      )}

      <div className="search-results">
        {!active ? (
          <div className="search-empty">
            <Icon name="search" size={44} color="var(--muted-2)" />
            <p className="search-empty__hint">{t('marketSearchHint')}</p>
          </div>
        ) : nothing ? (
          <div className="search-empty">
            <Icon name="search" size={44} color="var(--muted-2)" />
            <div className="search-empty__title">{t('searchEmptyTitle')}</div>
            <p className="search-empty__hint">{t('searchEmptyHint')}</p>
          </div>
        ) : (
          <>
            {(isFetching && !products.length) ? (
              <div className="search-dishes">
                {Array.from({ length: 4 }).map((_, i) => <DishScrollCardSkeleton key={i} />)}
              </div>
            ) : products.length > 0 && (
              <>
                <h2 className="search-section-title">
                  {t('products')} <span className="search-section-count">{products.length}</span>
                </h2>
                <div className="search-dishes">
                  {products.map((d) => (
                    <DishGridCard key={d._id || d.id} dish={d} onClick={setModalDish} />
                  ))}
                </div>
              </>
            )}
            {foundStores.length > 0 && (
              <>
                <h2 className="search-section-title">
                  {t('stores')} <span className="search-section-count">{foundStores.length}</span>
                </h2>
                <div className="search-restaurants">
                  {foundStores.map((s) => <RestaurantCard key={s._id || s.id} restaurant={s} />)}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <CartBar />
      <BottomNav />
      {modalDish && <DishModal dish={modalDish} onClose={() => setModalDish(null)} onClosedAlert={showClosed} />}
      <ClosedAlert info={closedInfo} onClose={hideClosed} />
    </div>
  );
}

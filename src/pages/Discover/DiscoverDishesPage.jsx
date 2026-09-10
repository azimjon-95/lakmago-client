import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { DishGridCard } from '@/components/DishGridCard';
import { DishModal } from '@/components/DishModal';
import { BottomNav } from '@/components/BottomNav';
import { CartBar } from '@/components/CartBar';
import { useT } from '@/i18n';
import { HOME_CATEGORIES } from '@/data/categories';
import { api } from '@/api';
import './Discover.css';

/*
 * ═══════════════════════════════════════════════════════════
 * "BARCHASI" SAHIFASI — Super Chegirmalar / Tavsiya qilamiz
 * ═══════════════════════════════════════════════════════════
 *
 * Bosh sahifadagi ikkita qator (Super Chegirmalar, Tavsiya
 * qilamiz) 20 taom bilan cheklangan — aralashtirib, restoran
 * bo'yicha tekis taqsimlab ko'rsatiladi. Mijoz "Barchasi"
 * bossa, bu yerda cheklovsiz TO'LIQ ro'yxat ochiladi.
 *
 * Marshrut: /discover/:type — type = 'discount' | 'recommended'
 *
 * KATEGORIYA FILTRI SERVERDA qo'llanadi (/dishes/all?category=),
 * client tomonda qayta filtrlanmaydi. Shu sababli "Yana
 * ko'rsatish" istalgan kategoriyada ham to'g'ri ishlaydi —
 * server har doim TANLANGAN kategoriyaga mos keyingi sahifani
 * qaytaradi.
 *
 * TO'LIQ IZOLYATSIYA: bu sahifa o'z CSS fayliga ega (Discover.css,
 * barcha klasslar `discover-` prefiksi bilan), boshqa sahifalarning
 * fayllariga tegilmagan. HomePage.jsx dagi yagona o'zgarish —
 * ikkita SectionHeader'ga shu sahifaga o'tuvchi tugma qo'shildi.
 */

const PAGE_SIZE = 24;

export function DiscoverDishesPage() {
  const { type } = useParams(); // 'discount' | 'recommended'
  const navigate = useNavigate();
  const t = useT();

  const isDiscount = type === 'discount';
  const title = isDiscount ? t('discountedDishes') : t('recommended');

  const [category, setCategory] = useState('all');
  const [modalDish, setModalDish] = useState(null);

  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  /*
   * Har so'rov o'ziga xos raqam oladi. Kategoriya tez-tez
   * almashtirilsa (mijoz bir necha chipni ketma-ket bossa),
   * eski, hali qaytmagan so'rov javobi ESKIRGAN deb topiladi
   * va e'tiborsiz qoldiriladi — aks holda sekinroq eski so'rov
   * keyinroq qaytib, ekranda NOTO'G'RI kategoriya natijasini
   * ko'rsatib qo'yishi mumkin edi.
   */
  const requestId = useRef(0);

  const loadFirstPage = useCallback(() => {
    const myId = ++requestId.current;
    setLoading(true);
    setError(false);
    api.getDishesFeed({ discounted: isDiscount, category, limit: PAGE_SIZE })
      .then((res) => {
        if (myId !== requestId.current) return;
        setItems(res.items || []);
        setCursor(res.nextCursor || null);
        setHasMore(Boolean(res.hasMore));
      })
      .catch(() => { if (myId === requestId.current) setError(true); })
      .finally(() => { if (myId === requestId.current) setLoading(false); });
  }, [isDiscount, category]);

  // Tur yoki kategoriya o'zgarganda ro'yxat noldan yuklanadi
  useEffect(() => {
    setItems([]);
    setCursor(null);
    setHasMore(true);
    loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = useCallback(() => {
    if (!cursor || loadingMore) return;
    const myId = requestId.current;
    setLoadingMore(true);
    api.getDishesFeed({ discounted: isDiscount, category, limit: PAGE_SIZE, cursor })
      .then((res) => {
        if (myId !== requestId.current) return;
        setItems((prev) => [...prev, ...(res.items || [])]);
        setCursor(res.nextCursor || null);
        setHasMore(Boolean(res.hasMore));
      })
      .catch(() => {})
      .finally(() => { if (myId === requestId.current) setLoadingMore(false); });
  }, [cursor, loadingMore, isDiscount, category]);

  const openModal = useCallback((d) => setModalDish(d), []);
  const closeModal = useCallback(() => setModalDish(null), []);

  return (
    <div className="app-shell discover">
      <header className="discover-header">
        <button onClick={() => navigate(-1)} className="discover-header__back" aria-label={t('back')}>
          <Icon name="arrowLeft" size={20} color="var(--ink)" />
        </button>
        <h1 className="discover-header__title">{title}</h1>
        {/* O'ng tomon bo'sh — sarlavha markazda muvozanatli tursin */}
        <span className="discover-header__spacer" aria-hidden="true" />
      </header>

      <div className="discover-cats no-scrollbar">
        <button
          onClick={() => setCategory('all')}
          className={`discover-cat${category === 'all' ? ' is-active' : ''}`}
        >
          {t('allCategoriesLabel')}
        </button>
        {HOME_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`discover-cat${category === c.id ? ' is-active' : ''}`}
          >
            {c.key ? t(c.key) : c.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="discover-grid">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="discover-sk" />)}
        </div>
      )}

      {!loading && error && (
        <div className="discover-empty">
          <div className="discover-empty__icon">📡</div>
          <p>{t('dataLoadFailed')}</p>
          <button onClick={loadFirstPage} className="discover-retry">{t('retry')}</button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="discover-empty">
          <div className="discover-empty__icon">🍽️</div>
          <p>{t('noDishesFound')}</p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="discover-grid">
            {items.map((d) => (
              <DishGridCard key={d.id || d._id} dish={d} onClick={openModal} />
            ))}
          </div>

          {/*
            Server kategoriya bo'yicha ham filtrlaydi, shuning
            uchun tugma har qanday tanlangan kategoriyada ham
            to'g'ri ishlaydi — keyingi sahifa doim joriy
            kategoriyaga mos taomlarni qaytaradi.
          */}
          {hasMore && (
            <button onClick={loadMore} disabled={loadingMore} className="discover-more">
              {loadingMore ? t('loading') : t('showMore')}
            </button>
          )}
        </>
      )}

      <CartBar />
      <BottomNav />

      {modalDish && <DishModal dish={modalDish} onClose={closeModal} />}
    </div>
  );
}

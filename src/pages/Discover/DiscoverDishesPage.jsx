import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { DishGridCard } from '@/components/DishGridCard';
import { DishModal } from '@/components/DishModal';
import { BottomNav } from '@/components/BottomNav';
import { CartBar } from '@/components/CartBar';
import { ClosedAlert } from '@/components/ClosedAlert';
import { useT } from '@/i18n';
import { HOME_CATEGORIES, isKnownCategory, dishMatchesCategory } from '@/data/categories';
import { useOpenPartition, useClosedAlert } from '@/hooks/useOpenStatus';
import { isDiscountedDish } from '@/lib/discount';
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
 * client tomonda faqat himoya sifatida qayta tekshiriladi. "Yana
 * ko'rsatish" istalgan kategoriyada ham to'g'ri ishlaydi —
 * server har doim TANLANGAN kategoriyaga mos keyingi sahifani
 * qaytaradi.
 *
 * CHEGIRMA QOIDASI: oldPrice > price (src/lib/discount.js) — server
 * ham aynan shu shartni ishlatadi. «Tavsiya qilamiz» da chegirmali
 * taom chiqmaydi, «Super Chegirmalar» da faqat ular chiqadi.
 *
 * Kategoriya URL'da (?category=) — bosh sahifadan tanlangan
 * kategoriya bilan ochiladi. Yopiq restoran taomlari «Hozir yopiq»
 * belgisi bilan ko'rinadi, buyurtmaga urinilsa ClosedAlert chiqadi.
 *
 * Barcha klasslar `discover-` prefiksi bilan (Discover.css).
 */

const PAGE_SIZE = 24;

export function DiscoverDishesPage() {
  const { type } = useParams(); // 'discount' | 'recommended'
  const navigate = useNavigate();
  const t = useT();

  const isDiscount = type === 'discount';
  const title = isDiscount ? t('discountedDishes') : t('recommended');

  /*
   * Kategoriya URL'da saqlanadi (?category=osh):
   *   • bosh sahifada tanlangan kategoriya bilan to'g'ridan-to'g'ri
   *     ochiladi («Barchasi» shu parametr bilan keladi);
   *   • taom modalidan/savatdan orqaga qaytilganda tanlov saqlanadi.
   * Noma'lum qiymat kelsa — «Hammasi».
   */
  const [searchParams, setSearchParams] = useSearchParams();
  const rawCategory = searchParams.get('category');
  const category = rawCategory && isKnownCategory(rawCategory) ? rawCategory : 'all';
  const setCategory = useCallback((next) => {
    setSearchParams(
      next && next !== 'all' ? { category: next } : {},
      { replace: true },
    );
  }, [setSearchParams]);

  const [modalDish, setModalDish] = useState(null);
  const { closedInfo, showClosed, hideClosed } = useClosedAlert();

  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  // «Yana ko'rsatish» xato bersa avto-yuklash to'xtaydi (cheksiz sikl bo'lmasin)
  const [moreFailed, setMoreFailed] = useState(false);

  /*
   * ═══ SO'ROVLAR BOSHQARUVI ═══
   *
   * Har yangi ro'yxat (tur/kategoriya o'zgarishi) o'z «avlodi»
   * (generation) va AbortController'iga ega:
   *   • kategoriya tez-tez almashtirilsa eski so'rov BEKOR qilinadi,
   *     kechikkan javob ekranga noto'g'ri natija chiqarmaydi;
   *   • eski «Yana ko'rsatish» javobi kechiksa ham tugma
   *     «Yuklanmoqda» holatida qotib qolmaydi (avval shunday edi);
   *   • sahifadan chiqilganda ochiq so'rovlar bekor qilinadi.
   */
  const genRef = useRef(0);
  const abortRef = useRef(null);
  const loadingMoreRef = useRef(false);

  const startGeneration = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    genRef.current += 1;
    loadingMoreRef.current = false;
    return { gen: genRef.current, signal: controller.signal };
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  const loadFirstPage = useCallback(() => {
    const { gen, signal } = startGeneration();
    setItems([]);
    setCursor(null);
    setHasMore(true);
    setLoadingMore(false);
    setMoreFailed(false);
    setLoading(true);
    setError(false);
    api.getDishesFeed({ discounted: isDiscount, category, limit: PAGE_SIZE, signal })
      .then((res) => {
        if (gen !== genRef.current) return;
        setItems(Array.isArray(res?.items) ? res.items : []);
        setCursor(res?.nextCursor || null);
        setHasMore(Boolean(res?.hasMore && res?.nextCursor));
      })
      .catch((e) => {
        if (gen !== genRef.current || e?.name === 'AbortError') return;
        setError(true);
      })
      .finally(() => { if (gen === genRef.current) setLoading(false); });
  }, [isDiscount, category, startGeneration]);

  // Tur yoki kategoriya o'zgarganda ro'yxat noldan yuklanadi
  useEffect(() => { loadFirstPage(); }, [loadFirstPage]);

  const loadMore = useCallback(() => {
    if (!cursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    const gen = genRef.current;
    const signal = abortRef.current?.signal;
    setMoreFailed(false);
    setLoadingMore(true);
    api.getDishesFeed({ discounted: isDiscount, category, limit: PAGE_SIZE, cursor, signal })
      .then((res) => {
        if (gen !== genRef.current) return;
        const next = Array.isArray(res?.items) ? res.items : [];
        // Takror taom ikki marta chiqmasin (eski server cursor'i bilan ham)
        setItems((prev) => {
          const seen = new Set(prev.map((d) => String(d.id || d._id)));
          return prev.concat(next.filter((d) => !seen.has(String(d.id || d._id))));
        });
        setCursor(res?.nextCursor || null);
        setHasMore(Boolean(res?.hasMore && res?.nextCursor));
      })
      .catch((e) => {
        // Tugma qayta bosilishi mumkin; avto-yuklash esa to'xtaydi
        if (gen === genRef.current && e?.name !== 'AbortError') setMoreFailed(true);
      })
      .finally(() => {
        if (gen !== genRef.current) return;
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, [cursor, isDiscount, category]);

  // Orqaga — tarix bo'lmasa (havola orqali to'g'ridan-to'g'ri
  // ochilgan) bosh sahifaga, aks holda ilovadan chiqib ketardi
  const goBack = useCallback(() => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate('/', { replace: true });
  }, [navigate]);

  // Tanlangan chip ko'rinadigan joyga suriladi (bosh sahifadan
  // ro'yxat oxiridagi kategoriya bilan kelinganda ham ko'rinsin)
  const chipsRef = useRef(null);
  useEffect(() => {
    const box = chipsRef.current;
    if (!box) return;
    const el = box.querySelector(category === 'all' ? '[data-cat="all"]' : `[data-cat="${category}"]`);
    if (!el) return;
    const left = el.offsetLeft - (box.clientWidth - el.clientWidth) / 2;
    box.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [category]);

  const openModal = useCallback((d) => setModalDish(d), []);
  const closeModal = useCallback(() => setModalDish(null), []);

  /*
   * Himoya filtri — server allaqachon filtrlaydi, bu faqat
   * kafolat: chegirma YAGONA qoida bo'yicha (oldPrice > price,
   * kartadagi «−N%» bilan bir xil).
   *   • «Super Chegirmalar» — faqat chegirmalilar;
   *   • «Tavsiya qilamiz» — chegirmalilar UMUMAN chiqmaydi.
   */
  const visibleItems = useMemo(
    () => items.filter((d) =>
      (isDiscount ? isDiscountedDish(d) : !isDiscountedDish(d))
      && dishMatchesCategory(d, category)),
    [items, isDiscount, category],
  );

  // Yopiq restoran taomlari ko'rinadi, lekin «Hozir yopiq» belgisi bilan
  const { closedIds } = useOpenPartition(visibleItems);

  // Sahifadagi hamma taom himoya filtridan o'tmasa (masalan server
  // hali yangilanmagan) — bo'sh ekran o'rniga keyingi sahifa
  // avtomatik so'raladi
  useEffect(() => {
    if (!loading && !error && !loadingMore && !moreFailed && hasMore
      && items.length > 0 && visibleItems.length === 0) {
      loadMore();
    }
  }, [loading, error, loadingMore, moreFailed, hasMore, items.length, visibleItems.length, loadMore]);

  return (
    <div className="app-shell discover">
      <header className="discover-header">
        <button type="button" onClick={goBack} className="discover-header__back" aria-label={t('back')}>
          <Icon name="arrowLeft" size={20} color="var(--ink)" />
        </button>
        <h1 className="discover-header__title">{title}</h1>
        {/* O'ng tomon bo'sh — sarlavha markazda muvozanatli tursin */}
        <span className="discover-header__spacer" aria-hidden="true" />
      </header>

      <div ref={chipsRef} className="discover-cats no-scrollbar">
        <button
          type="button"
          data-cat="all"
          onClick={() => setCategory('all')}
          className={`discover-cat${category === 'all' ? ' is-active' : ''}`}
        >
          {t('allCategoriesLabel')}
        </button>
        {HOME_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            data-cat={c.id}
            onClick={() => setCategory(c.id)}
            className={`discover-cat${category === c.id ? ' is-active' : ''}`}
          >
            {c.key ? t(c.key) : c.label}
          </button>
        ))}
      </div>

      {/*
        Kontent `flex: 1` — ma'lumot kam yoki umuman yo'q bo'lsa ham
        pastki menyu ekran tagida qoladi (avval bo'sh holatda menyu
        kontent ortidan yuqoriga ko'tarilib qolardi).
      */}
      <main className="discover-main">
        {loading && (
          <div className="discover-grid">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="discover-sk" />)}
          </div>
        )}

        {!loading && error && (
          <div className="discover-empty">
            <div className="discover-empty__icon">📡</div>
            <p>{t('dataLoadFailed')}</p>
            <button type="button" onClick={loadFirstPage} className="discover-retry">{t('retry')}</button>
          </div>
        )}

        {!loading && !error && visibleItems.length === 0 && !hasMore && (
          <div className="discover-empty">
            <div className="discover-empty__icon">🍽️</div>
            <p>{t('noDishesFound')}</p>
          </div>
        )}

        {!loading && !error && (visibleItems.length > 0 || hasMore) && (
          <>
            {visibleItems.length > 0 && (
              <div className="discover-grid">
                {visibleItems.map((d) => (
                  <DishGridCard
                    key={d.id || d._id}
                    dish={d}
                    onClick={openModal}
                    closed={closedIds.has(String(d.id || d._id))}
                  />
                ))}
              </div>
            )}

            {/*
              Server kategoriya bo'yicha ham filtrlaydi, shuning
              uchun tugma har qanday tanlangan kategoriyada ham
              to'g'ri ishlaydi — keyingi sahifa doim joriy
              kategoriyaga mos taomlarni qaytaradi.
            */}
            {hasMore && (
              <button type="button" onClick={loadMore} disabled={loadingMore} className="discover-more">
                {loadingMore ? t('loading') : t('showMore')}
              </button>
            )}
          </>
        )}
      </main>

      <CartBar />
      <BottomNav />

      {modalDish && (
        <DishModal dish={modalDish} onClose={closeModal} onClosedAlert={showClosed} />
      )}
      <ClosedAlert info={closedInfo} onClose={hideClosed} />
    </div>
  );
}

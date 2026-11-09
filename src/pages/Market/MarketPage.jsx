import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Icon } from '@/components/Icon';
import { DishModal } from '@/components/DishModal';
import { BottomNav } from '@/components/BottomNav';
import { CartBar } from '@/components/CartBar';
import { RestaurantCardSkeleton } from '@/components/Skeleton/Skeleton';
import { DiscountSlider } from '@/components/MarketSlider/DiscountSlider';
import { ClosedAlert } from '@/components/ClosedAlert';
import { ProductCardSkeleton } from '@/components/Skeleton/ProductCardSkeleton';
import { useClosedAlert, useOpenPartition } from '@/hooks/useOpenStatus';
import { useFeatures, useMarketCategories, useMarketStores, useMarketBanners } from '@/hooks/queries';
import { BannerSlider } from '@/components/BannerSlider';
import { HomeSections } from '@/components/HomeSections/HomeSections';
import { useUser } from '@/store/user';
import { useSection } from '@/store/section';
import { useI18n } from '@/i18n';
import { api } from '@/api';
import { MarketCategories } from '@/components/MarketCategories/MarketCategories';
import { MarketHero } from '@/components/MarketHero/MarketHero';
import { MarketStoreCard } from '@/components/MarketStoreCard/MarketStoreCard';
import { MarketStoreSort } from '@/components/MarketStoreSort/MarketStoreSort';
import { sortStores, recommendedStoreId, marketOrigin } from '@/lib/marketSort';
import { useDeviceLocation } from '@/store/deviceLocation';
import { getCurrentPosition } from '@/lib/location';
import { DishGridCard } from '@/components/DishGridCard';
import { MARKET_HOME_CATEGORIES, homeCatLabel } from '@/data/marketHomeCategories';
import '@/pages/Home/Home.css';
import './MarketProducts.css';   // ixcham mahsulot setkasi (.mpp-grid) — "Barchasi" sahifasi bilan bir xil dizayn
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

function useMarketProducts({ discounted, category, catalogCategory, enabled }) {
  return useInfiniteQuery({
    queryKey: ['market', 'products', discounted ? 'disc' : 'reg', category, catalogCategory],
    queryFn: ({ pageParam, signal }) => api.getMarketProducts({
      discounted, category, catalogCategory, cursor: pageParam || undefined, limit: PAGE, signal,
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
  // Market kategoriyalari — admin paneldagi ro'yxat (server). Yuklanguncha — zaxira; yuklangach faqat server ro'yxati.
  const catItems = useMemo(() => (meta ? (meta.catalogCategories || []) : MARKET_HOME_CATEGORIES), [meta]);
  // Market bannerlari — admin "Bannerlar"da joylashuvni "Lokma Market" qiladi
  const { data: banners = [] } = useMarketBanners(allowed);
  const { data: stores = [], isLoading: storesLoading, isError: storesError, refetch } = useMarketStores(allowed);
  // `category` — katalog kaliti ('all' yoki 'choy', 'konfetlar'...): Do'konlar, chegirmalar va mahsulotlar shu bo'yicha
  const discQ = useMarketProducts({ discounted: true, catalogCategory: category, enabled: allowed });
  // Mahsulotlar: 'Barchasi' → hammasi; kategoriya → faqat shu kalitdagilar
  const catQ = useMarketProducts({ catalogCategory: category === 'all' ? undefined : category, enabled: allowed });

  /*
   * Mahsuloti BOR kategoriya kalitlari (do'konlar `productCatalogCategories` beradi). Mahsuloti yo'q kategoriyalar qatorda xira
   * ko'rinadi. Server eski bo'lsa (maydon yo'q) — null: hech narsa xiralashmaydi va do'konlar filtrlanmaydi.
   */
  const available = useMemo(() => {
    const lists = stores.map((s) => s.productCatalogCategories).filter(Array.isArray);
    return lists.length ? new Set(lists.flat()) : null;
  }, [stores]);

  // Kategoriya emojisi (rasmsiz mahsulot uchun slayderda)
  const catMap = useMemo(() => new Map((meta?.categories || []).map((c) => [c.value, c])), [meta]);

  /*
   * Saralash: "Sizga yaqin" (standart) / reyting / tez yetkazish. Joylashuv: yangi GPS nuqta → asosiy manzil.
   * Joylashuv yo'q bo'lsa — hech narsa SO'RALMAYDI (asl tartib); faqat foydalanuvchi "Sizga yaqin" ni tanlasa GPS so'raladi.
   */
  const [sortMode, setSortMode] = useState('near');
  const [locating, setLocating] = useState(false);
  const [sortNote, setSortNote] = useState('');
  const fix = useDeviceLocation((s) => s.fix);
  const user = useUser((s) => s.user);
  const origin = useMemo(() => marketOrigin({ fix, user }), [fix, user]);
  const chooseSort = useCallback(async (mode) => {
    setSortMode(mode); setSortNote('');
    if (mode !== 'near' || origin) return;
    setLocating(true);
    try {
      const p = await getCurrentPosition();
      if (p && Number.isFinite(p.lat)) useDeviceLocation.getState().set({ lat: p.lat, lng: p.lng, accuracy: p.accuracy, at: Date.now() });
      else setSortNote(t('storeSortNoLocation'));
    } catch { setSortNote(t('storeSortNoLocation')); }
    setLocating(false);
  }, [origin, t]);

  // Tanlangan kategoriya bo'yicha do'konlar; ochiqlari oldinda
  const shownStores = useMemo(() => {
    const list = category === 'all' ? stores : stores.filter((s) => !Array.isArray(s.productCatalogCategories) || s.productCatalogCategories.includes(category));
    return list;
  }, [stores, category]);
  const sortedStores = useMemo(() => sortStores(shownStores, sortMode, origin), [shownStores, sortMode, origin]);
  const recId = useMemo(() => recommendedStoreId(shownStores), [shownStores]);

  // Chegirmadagi mahsulotlar (slayder) — ochiq do'konlar oldinda, yopiqlari oxirida
  const discount = flat(discQ);
  const discParts = useOpenPartition(discount);
  const discShown = useMemo(() => [...discParts.open, ...discParts.closed], [discParts]);
  const closedIds = useMemo(() => new Set(discParts.closedIds), [discParts]);

  // Tanlangan kategoriya mahsulotlari — ochiq do'konlar oldinda
  const catParts = useOpenPartition(flat(catQ));
  const catProducts = useMemo(() => [...catParts.open, ...catParts.closed], [catParts]);
  /*
   * "Super narxlar": "Barchasi" da — chegirmadagilar birinchi, keyin BARCHA mahsulotlar.
   * Kategoriya tanlanganda esa faqat shu kategoriyaning chegirmalilari (kategoriyaning barcha mahsulotlari tepada alohida chiqadi,
   * shuning uchun slayderda takrorlanmaydi).
   */
  const sumarItems = useMemo(() => {
    if (category !== 'all') return discShown;
    const seen = new Set(discShown.map((d) => String(d._id || d.id)));
    return [...discShown, ...catProducts.filter((d) => !seen.has(String(d._id || d.id)))];
  }, [discShown, catProducts, category]);

  const openModal = useCallback((d) => setModalDish(d), []);

  // Sarlavha: chapda kichik savat + nom, o'ngda katta bezakli savat (avvalgi bannerdagi savat tepaga ko'chdi)
  const header = (
    <header className="market-header">
      <div className="market-header__title">
        <span>{t('lokmaMarket')}</span>
        <small>{t('marketSubtitle')}</small>
      </div>
      <img className="market-header__deco" src="/sections/market-basket-hero.webp" alt="" width="116" height="63" aria-hidden="true" />
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
  // "Barchasi" — barcha mahsulotlar alohida sahifada
  const openAll = useCallback(() => navigate('/market/products'), [navigate]);

  return (
    <div className="app-shell market">
      {header}

      {/*
        Banner: admin qo'shgan Market bannerlari (bosh sahifa bannerlari bilan bir xil
        karusel). Hali qo'shilmagan bo'lsa — o'rnatilgan bezakli banner.
      */}
      <div className="market-sheet">
        {banners.length > 0 ? (
          <div className="market-banner">
            <BannerSlider banners={banners} onAdClick={() => {}} />
          </div>
        ) : (
          <MarketHero />
        )}
      </div>


      {/* Lokma Go va Lokma To'yxonalari — banner ostida */}
      <HomeSections current="market" wedding={Boolean(features?.wedding)} />

      {/* Kategoriyalar — yumaloq rasmlar (data/marketHomeCategories.js) */}
      {/*
        Server hali yangilanmagan bo'lsa (do'konlarda productCatalogCategories yo'q) qator KO'RSATILMAYDI: aks holda kategoriya
        bosilganda eski server `catalogCategory` ni tushunmay, hamma mahsulotni ko'rsatardi. Server yangilangach o'zi paydo bo'ladi.
      */}
      {catItems.length > 0 && (
        <MarketCategories items={catItems} value={category} onChange={setCategory} available={available} lang={lang}
          allLabel={t('all')} moreLabel={t('marketOtherCats')} sheetTitle={t('marketAllCats')} closeLabel={t('close')} ariaLabel={t('marketCategories')} />
      )}

      {nothing ? (
        <div className="market-empty">
          <div className="market-empty__art">🧺</div>
          <p>{t('noProducts')}</p>
        </div>
      ) : (
        <>
          {/* Tanlangan kategoriya: shu kategoriyadagi mahsulotlar BARCHA do'konlardan — "Super narxlar" TEPASIDA */}
          {category !== 'all' && (
            <section className="market-catprods" data-testid="market-catprods">
              {/* Kategoriya sarlavhasi: karta rasmi (yumaloq), nom, tavsif — ekran kengligiga moslashadi */}
              {(() => {
                const cat = catItems.find((c) => c.key === category);
                const title = category === 'all' ? t('all') : homeCatLabel(cat, lang);
                return (
                  <div className="market-cathead" data-testid="market-cathead">
                    {cat?.cardUrl && <img className="market-cathead__img" src={cat.cardUrl} alt="" loading="lazy" decoding="async" />}
                    <div className="market-cathead__txt">
                      <h2 className="home-restaurants-title">
                        {title}
                        {catProducts.length > 0 && <span className="market-catprods__count"> {catProducts.length}{catQ.hasNextPage ? '+' : ''}</span>}
                      </h2>
                      {cat?.description && <p className="market-cathead__desc">{cat.description}</p>}
                    </div>
                  </div>
                );
              })()}
              {catQ.isLoading ? (
                <div className="mpp-grid">{Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
              ) : catQ.isError ? (
                <div className="home-error">
                  <div className="home-error__title">{t('dataLoadFailed')}</div>
                  <button type="button" onClick={() => catQ.refetch()} className="home-error__btn">{t('retry')}</button>
                </div>
              ) : catProducts.length > 0 ? (
                <>
                  <div className="mpp-grid">
                    {catProducts.map((d) => <DishGridCard key={d._id || d.id} dish={d} onClick={openModal} photoHeight={88} photoFit="contain" />)}
                  </div>
                  {catQ.hasNextPage && (
                    <button type="button" className="market-more" onClick={() => catQ.fetchNextPage()} disabled={catQ.isFetchingNextPage}>
                      {catQ.isFetchingNextPage ? '…' : t('marketShowMore')}
                    </button>
                  )}
                </>
              ) : (
                <div className="market-catempty" data-testid="market-catempty">
                  <div className="market-catempty__art" aria-hidden="true">{catItems.find((c) => c.key === category)?.emoji || '🛒'}</div>
                  <p>{category === 'all' ? t('noProducts') : t('marketCategoryEmpty')}</p>
                </div>
              )}
            </section>
          )}

          {/* Chegirmadagi mahsulotlar — o'zi harakatlanuvchi slayder (Do'konlar tepasida). Kategoriya tanlanganda — o'sha kategoriyanikilar */}
          <DiscountSlider
            title={t('marketDiscounts')}
            items={sumarItems}
            onAll={openAll}
            allLabel={t('all')}
            loading={discQ.isLoading}
            closedIds={closedIds}
            onOpen={openModal}
            emojiOf={(d) => catMap.get(d.marketCategory)?.emoji}
          />

          {/* Do'konlar: sarlavha + "Sizga yaqin do'konlar" (maketdagidek), so'ng bo'limlar orasida o'tish kartalari */}
          <div className="market-stores-head">
            <h2>{t('stores')}</h2>
            <MarketStoreSort mode={sortMode} onChange={chooseSort} locating={locating} />
          </div>
          {sortNote && <div className="msort__note" role="status">{sortNote}</div>}
          <div className="home-restaurants market-stores">
            {storesLoading ? (
              Array.from({ length: 3 }).map((_, i) => <RestaurantCardSkeleton key={i} />)
            ) : storesError ? (
              <div className="home-error">
                <div className="home-error__title">{t('dataLoadFailed')}</div>
                <button type="button" onClick={() => refetch()} className="home-error__btn">{t('retry')}</button>
              </div>
            ) : sortedStores.length > 0 ? (
              sortedStores.map(({ store: st, distanceKm }) => (
                <MarketStoreCard key={st._id || st.id} restaurant={st} distanceKm={distanceKm} recommended={String(st._id || st.id) === recId} />
              ))
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

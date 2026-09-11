import { useState, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { BannerSlider } from '@/components/BannerSlider';
import { RestaurantCard } from '@/components/RestaurantCard';
import { DishScrollCard } from '@/components/DishScrollCard';
import { DishGridCard } from '@/components/DishGridCard';
import { DishModal } from '@/components/DishModal';
import { AdModal } from '@/components/AdModal';
import { BottomNav } from '@/components/BottomNav';
import { CartBar } from '@/components/CartBar';
import { LangSwitch } from '@/components/LangSwitch/LangSwitch';
import { RestaurantCardSkeleton, DishScrollCardSkeleton } from '@/components/Skeleton/Skeleton';
import { useUser } from '@/store/user';
import { useT } from '@/i18n';
import { useOpenPartition, useClosedAlert } from '@/hooks/useOpenStatus';
import { ClosedAlert } from '@/components/ClosedAlert';
import { useRestaurants, useTrendingDishes, useBannersQuery, useAllDishes, useBannerAds, useDishFeed } from '@/hooks/queries';
import { isDiscountedDish } from '@/lib/discount';
import { PullToRefresh } from '@/components/PullToRefresh';
import { API_BASE, api } from '@/api';
import { AddressFlow } from '@/components/AddressFlow/AddressFlow';
import { CategoryIcon } from '@/components/CategoryIcons/CategoryIcon';
import {
  HOME_CATEGORIES,
  shuffled,
  dishMatchesCategory,
  restaurantMatchesCategory,
  filterByCategory,
} from '@/data/categories';

import { AddressSheet } from '@/components/AddressSheet';
import './Home.css';

// Kategoriyalar markaziy ro'yxatdan (src/data/categories.js)

const ROW_LIMIT = 20;

/** Barqaror aralashtirish: seed bir xil bo'lsa natija ham bir xil. */
function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = Math.floor(seed * 10000);
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Bir kafedan to'planmasin — restoran bo'yicha guruhlab, har
 * biridan navbatma-navbat (round-robin) olamiz.
 */
function pickMixed(pool, seed, limit = ROW_LIMIT) {
  if (!pool.length || limit <= 0) return [];
  const byRest = new Map();
  pool.forEach((d, idx) => {
    const key = String(d.restaurantId || d.restaurantName || d.id || d._id || `i${idx}`);
    if (!byRest.has(key)) byRest.set(key, []);
    byRest.get(key).push(d);
  });
  const buckets = [...byRest.values()].map((list, i) => seededShuffle(list, seed + i * 17));
  const queues = seededShuffle(buckets.map((_, i) => i), seed + 99).map((i) => [...buckets[i]]);
  const out = [];
  while (out.length < limit && queues.some((q) => q.length)) {
    for (const q of queues) {
      if (out.length >= limit) break;
      if (q.length) out.push(q.shift());
    }
  }
  return out;
}

/** Id bo'yicha takrorlarni olib tashlaydi (birinchisi qoladi). */
function uniqueById(list) {
  const seen = new Set();
  return list.filter((d) => {
    const id = String(d.id || d._id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/**
 * Qator uchun tanlov: avval OCHIQ restoranlar taomlari (aralash),
 * joy qolsa — YOPIQ restoranlarniki (oxirida, «Hozir yopiq» belgisi
 * bilan). Shunday qilib kategoriyadagi bor taom hech qachon
 * «yo'qolib» qolmaydi, lekin buyurtma berib bo'ladiganlari doim
 * birinchi turadi.
 */
function pickOpenFirst({ open, closed }, seed) {
  const first = pickMixed(open, seed, ROW_LIMIT);
  return first.concat(pickMixed(closed, seed + 3, ROW_LIMIT - first.length));
}

/*
 * Bo'lim sarlavhasi — oddiy, toza matn. Avval oranjevа SVG
 * banner ("Super Chegirmalar") ishlatilgan edi, lekin
 * murakkabligi (o'lcham nomuvofiqligi, kartalar ustiga tushib
 * qolishi) va joylashuv muammolari tufayli olib tashlandi —
 * endi barcha bo'limlar (shu jumladan chegirmadagi taomlar)
 * bir xil, sodda sarlavha uslubida.
 */
/*
 * `onAction` ixtiyoriy — berilmasa xulq ILGARIGIDEK (oddiy matn,
 * bosilmaydi). Faqat `onAction` berilganda tugmaga aylanadi.
 * Shu sababli "Trend taomlar" bo'limi (onAction bermaydi) hech
 * qanday o'zgarishsiz qoladi — faqat "Super Chegirmalar" va
 * "Tavsiya qilamiz" bosiladigan bo'ladi.
 */
const SectionHeader = memo(function SectionHeader({ icon, title, action, onAction }) {
  return (
    <div className="home-section-header">
      <div className="home-section-header__title">
        {icon && <Icon name={icon} size={17} color="var(--appetite)" />} {title}
      </div>
      {action && (
        onAction ? (
          <button type="button" onClick={onAction} className="home-section-header__action home-section-header__action--btn">
            {action}
            <Icon name="chevronRight" size={14} color="var(--brand-600)" />
          </button>
        ) : (
          <div className="home-section-header__action">{action}</div>
        )
      )}
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

  /*
   * KATEGORIYALAR ARALASHTIRILADI — har kirganda boshqacha
   * tartibda.
   *
   * `useMemo(() => ..., [])`: BIR MARTA hisoblanadi, komponent
   * ekranga birinchi chiqqanda (ya'ni sahifa ochilganda/
   * ilova qayta ishga tushganda). Keyingi qayta renderlarda
   * (masalan foydalanuvchi bir kategoriyani bosganda,
   * `category` holati o'zgarganda) QAYTA ARALASHMAYDI —
   * aks holda foydalanuvchi bosgan tugma joyidan siljib,
   * boshqasiga bosilib qolardi.
   *
   * Asl CATEGORIES tartibi buzilmaydi: shuffled() yangi
   * massiv qaytaradi, qidiruv filtri esa hamon sobit
   * tartibdagi ro'yxatdan foydalanadi.
   */
  const categories = useMemo(() => shuffled(HOME_CATEGORIES), []);
  const [modalDish, setModalDish] = useState(null);
  const [showAddressFlow, setShowAddressFlow] = useState(false);
  const [showAddressSheet, setShowAddressSheet] = useState(false);

  // Real data — TanStack Query (cache + background refetch)
  const { data: restaurants = [], isLoading: restLoading, isError: restError, error: restErrorObj, refetch: refetchRest } = useRestaurants();
  const { data: trending = [], isLoading: trendLoading, refetch: refetchTrending } = useTrendingDishes();
  // Reklama bosilganda taomni to'liq ma'lumoti bilan topish uchun
  // (Splash oldindan yuklagan kesh — qo'shimcha so'rov yo'q)
  const { data: allDishes = [] } = useAllDishes();
  const { data: banners = [], refetch: refetchBanners } = useBannersQuery();
  const { data: bannerAds = [], refetch: refetchAds } = useBannerAds();

  /*
   * ═══ «SUPER CHEGIRMALAR» VA «TAVSIYA QILAMIZ» — SERVERDAN ═══
   *
   * Tanlangan kategoriya SERVERGA yuboriladi (/dishes/all?category=)
   * — «Barchasi» sahifasi bilan aynan bir manba. Avval eng yangi
   * 50 taom mijozda filtrlanardi va kategoriya taomlari o'sha
   * 50 talikka tushmasa qatorlar butunlay yo'qolardi.
   */
  const {
    data: discountFeed = [], isLoading: discountLoading, refetch: refetchDiscount,
  } = useDishFeed({ discounted: true, category });
  const {
    data: regularFeed = [], isLoading: regularLoading, refetch: refetchRegular,
  } = useDishFeed({ discounted: false, category });

  // Bosh sahifani pastga tortib yangilash — barcha ma'lumotlarni
  // qayta so'raydi (sahifa qayta yuklanmaydi, faqat ma'lumot
  // yangilanadi — zamonaviy ilovalar shunday ishlaydi)
  const handlePullRefresh = useCallback(() => Promise.all([
    refetchRest(), refetchTrending(), refetchDiscount(), refetchRegular(), refetchBanners(), refetchAds(),
  ]), [refetchRest, refetchTrending, refetchDiscount, refetchRegular, refetchBanners, refetchAds]);

  // Reklamalar (restoran/taom) oddiy bannerlar bilan BITTA
  // karuselda aralashadi — foydalanuvchi uchun farqi yo'q, faqat
  // pastki-o'ng burchakda kichik "Reklama" belgisi bilan
  const [adModal, setAdModal] = useState(null);
  const slidesWithAds = useMemo(() => {
    const adSlides = bannerAds.map((a) => ({
      id: `ad-${a.id}`, isAd: true, imageUrl: a.imageUrl, adData: a,
    }));
    return [...banners, ...adSlides];
  }, [banners, bannerAds]);

  const openAdModal = useCallback((slide) => {
    api.clickAd(slide.adData.id).catch(() => {});
    setAdModal(slide.adData);
  }, []);

  /*
   * ═══ KATEGORIYA BO'YICHA RESTORANLAR ═══
   *
   * MUAMMO: ilgari faqat `r.category === category` tekshirilardi,
   * ya'ni restoranning O'Z turi. Natijada menyusida 19 ta issiq
   * taom bor restoran "Issiq taomlar" filtrida CHIQMASDI —
   * uning o'z turi boshqacha belgilangan edi.
   *
   * `dishCategories` — server tayyorlab beradigan ro'yxat:
   * restoran menyusida qaysi kategoriyalarda taom bori.
   *
   * NIMA UCHUN SERVERDAN: avval buni mijozda, /dishes/all
   * asosida hisoblashga urinildi. Lekin u endpoint
   * SAHIFALANGAN (20 ta) — restoranning taomlari o'sha
   * ro'yxatga tushmasa filtr baribir ishlamasdi.
   *
   * Restoran turi ham hisobga olinadi: menyusi hali
   * to'ldirilmagan yangi choyxona "Choyxona" filtrida
   * ko'rinib turadi.
   */
  const filtered = useMemo(
    () => filterByCategory(restaurants, category, restaurantMatchesCategory),
    [restaurants, category],
  );

  const filteredTrending = useMemo(
    () => filterByCategory(trending, category, dishMatchesCategory),
    [trending, category],
  );

  const { closedInfo, showClosed, hideClosed } = useClosedAlert();

  /*
   * Ikkala tasma birlashtirilib, chegirma YAGONA qoida bo'yicha
   * (oldPrice > price — kartadagi «−N%» belgisi bilan bir xil)
   * qayta ajratiladi. Bu himoya qatlami:
   *   • chegirmali taom HECH QACHON «Tavsiya qilamiz» ga tushmaydi;
   *   • server hali yangilanmagan bo'lsa ham (eski isDiscounted
   *     bayrog'i) bosh sahifa to'g'ri ishlaydi.
   * Kategoriya ham mijozda qayta tekshiriladi — server kategoriya
   * parametrini e'tiborsiz qoldirsa ham noto'g'ri taom chiqmaydi.
   */
  const { discountPool, regularPool } = useMemo(() => {
    const merged = uniqueById([...discountFeed, ...regularFeed])
      .filter((d) => dishMatchesCategory(d, category));
    return {
      discountPool: merged.filter(isDiscountedDish),
      regularPool: merged.filter((d) => !isDiscountedDish(d)),
    };
  }, [discountFeed, regularFeed, category]);

  // Ochiq restoranlar taomlari oldinda, yopiqlari — oxirida
  const discountParts = useOpenPartition(discountPool);
  const regularParts = useOpenPartition(regularPool);

  // Har ochilganda tartib o'zgaradi — sahifa qayta render bo'lganda
  // emas, faqat ilova ochilganda (seed sessiyada saqlanadi)
  const shuffleSeed = useMemo(() => {
    const KEY = 'lokma_shuffle_seed';
    try {
      let v = sessionStorage.getItem(KEY);
      if (!v) {
        v = String(Math.random());
        sessionStorage.setItem(KEY, v);
      }
      return Number(v) || 0.5;
    } catch {
      return Math.random(); // sessionStorage bloklangan bo'lishi mumkin
    }
  }, []);

  // Chegirma — kategoriya + turli restoranlardan, ochiqlari oldinda
  const discountedShown = useMemo(
    () => pickOpenFirst(discountParts, shuffleSeed),
    [discountParts, shuffleSeed],
  );

  // Tavsiya qilamiz — chegirmasizlar, ochiqlari oldinda
  const recommended = useMemo(
    () => pickOpenFirst(regularParts, shuffleSeed + 7),
    [regularParts, shuffleSeed],
  );

  // Ikkala qatordagi yopiq taomlar (kartada belgi uchun)
  const closedIds = useMemo(
    () => new Set([...discountParts.closedIds, ...regularParts.closedIds]),
    [discountParts.closedIds, regularParts.closedIds],
  );

  // «Barchasi» — tanlangan kategoriya bilan birga ochiladi
  const openDiscover = useCallback((type) => {
    const qs = category !== 'all' ? `?category=${encodeURIComponent(category)}` : '';
    navigate(`/discover/${type}${qs}`);
  }, [category, navigate]);

  const defaultAddress = useMemo(
    () => user.addresses.find((a) => a.id === user.defaultAddressId) ?? user.addresses[0],
    [user.addresses, user.defaultAddressId],
  );

  const openModal = useCallback((d) => setModalDish(d), []);
  const closeModal = useCallback(() => setModalDish(null), []);
  const shuffledRestaurants = useMemo(
    () => seededShuffle(filtered, shuffleSeed + 1),
    [filtered, shuffleSeed],
  );

  return (
    <div className="app-shell home">
    <PullToRefresh onRefresh={handlePullRefresh}>
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

      <BannerSlider banners={slidesWithAds} onAdClick={openAdModal} />

      <div className="home-categories no-scrollbar">
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
   {(trendLoading || filteredTrending.length > 0) && (
        <>
          <SectionHeader icon="flame" title={t('trendingDishes')} action={t('all')} />
          <div className="home-scroll-row no-scrollbar">
            {trendLoading
              ? Array.from({ length: 4 }).map((_, i) => <DishScrollCardSkeleton key={i} />)
              : filteredTrending.map((d) => (
                      <DishScrollCard key={d.id || d._id} dish={d} onClick={openModal} />
              ))}
          </div>
        </>
      )}

      {/* Chegirmadagi taomlar — tanlangan kategoriya bo'yicha */}
      {(discountLoading || discountedShown.length > 0) && (
        <>
          <SectionHeader
            icon="discount"
            title={t('discountedDishes')}
            action={t('all')}
            onAction={() => openDiscover('discount')}
          />
          <div className="home-dishes-row no-scrollbar">
            {discountLoading
              ? Array.from({ length: 4 }).map((_, i) => <DishScrollCardSkeleton key={i} />)
              : discountedShown.map((d) => (
                  <DishGridCard
                    key={d.id || d._id}
                    dish={d}
                    onClick={openModal}
                    closed={closedIds.has(String(d.id || d._id))}
                  />
                ))}
          </div>
        </>
      )}

      {/* Tavsiya qilamiz — faqat chegirmasiz taomlar, kategoriya bo'yicha */}
      {(regularLoading || recommended.length > 0) && (
        <>
          <SectionHeader
            title={t('recommended')}
            action={t('all')}
            onAction={() => openDiscover('recommended')}
          />
          <div className="home-dishes-row no-scrollbar">
            {regularLoading
              ? Array.from({ length: 6 }).map((_, i) => <DishScrollCardSkeleton key={i} />)
              : recommended.map((d) => (
                  <DishGridCard
                    key={d.id || d._id}
                    dish={d}
                    onClick={openModal}
                    closed={closedIds.has(String(d.id || d._id))}
                  />
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
            <div className="home-error__title">{t('dataLoadFailed')}</div>
            <div className="home-error__text">
              {restErrorObj?.kind === 'network'
                ? t('networkErrorMsg')
                : `${t('serverNoResponse')}${restErrorObj?.status ? ` (${restErrorObj.status})` : ''}.`}
            </div>
            <button onClick={() => refetchRest()} className="home-error__btn">{t('retry')}</button>
            <details className="home-error__details">
              <summary>{t('technicalInfo')}</summary>
              <div className="home-error__code">
                <div>API: {API_BASE}</div>
                {restErrorObj?.kind && <div>{t('debugType')}: {restErrorObj.kind}</div>}
                {restErrorObj?.status && <div>{t('debugCode')}: {restErrorObj.status}</div>}
                {restErrorObj?.detail && <div>{t('debugDetail')}: {restErrorObj.detail}</div>}
              </div>
            </details>
          </div>
        ) : shuffledRestaurants.length > 0 ? (
  shuffledRestaurants.map((r) => (
    <RestaurantCard
      key={r.id || r._id}
      restaurant={r}
    />
  ))
) : (
  <div className="home-empty">{t('empty')}</div>
)}
      </div>

      <div style={{ flex: 1 }} />
    </PullToRefresh>

      {/* CartBar/BottomNav ATAYLAB PullToRefresh TASHQARISIDA —
          pastga tortilganda faqat kontent (tepadagi) siljishi
          kerak, pastki navigatsiya joyida qotib turishi kerak.
          Aks holda butun ekran (nav bilan birga) bir vaqtda
          siljib, "hammasi qayta yuklanayotgandek" noxush
          taassurot berardi. */}
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

      {/* Restoran/taom reklamasi bosilganda — havola emas, shu
          modal ochiladi (dastur ichida qoladi) */}
      {adModal && (
        <AdModal
          ad={adModal}
          onClose={() => setAdModal(null)}
          onOpenDish={(dish) => {
            setAdModal(null);
            const pool = [...discountFeed, ...regularFeed, ...allDishes];
            const found = pool.find((d) => String(d.id || d._id) === String(dish.id));
            openModal(found || dish);
          }}
          onOpenRestaurant={(restaurantId) => {
            setAdModal(null);
            navigate(`/restaurant/${restaurantId}`);
          }}
        />
      )}
    </div>
  );
}

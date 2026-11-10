import { isFreeDelivery, hasDeliveryTerms } from '@/lib/deliveryInfo';
import { useMemo, useState, useEffect, useRef } from 'react';
import { CATEGORIES } from '@/data/categories';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { DishScrollCard } from '@/components/DishScrollCard';
import { DishModal } from '@/components/DishModal';
import { CartBar } from '@/components/CartBar';
import { BottomNav } from '@/components/BottomNav';
import { useBack } from '@/hooks/useBack';
import { useSyncSection } from '@/hooks/useSyncSection';
import { isStoreRestaurant } from '@/lib/storeKind';
import { RestaurantHero, RestaurantIdentity, RestaurantStats, ReserveBanner } from '@/components/RestaurantPage/RestaurantHeader';
import { SectionChips } from '@/components/RestaurantPage/SectionChips';
import { RestaurantInfoSheet } from '@/components/RestaurantInfoSheet';
import { useI18n } from '@/i18n';
import { isDiscountedDish } from '@/lib/discount';
import { marketCatLabel } from '@/data/market';
import { DiscountSlider } from '@/components/MarketSlider/DiscountSlider';
import { useUser } from '@/store/user';
import { haptic, getTelegram } from '@/lib/telegram';
import { useClosedAlert, useOpenStatus } from '@/hooks/useOpenStatus';
import { ClosedAlert } from '@/components/ClosedAlert';
import { useRestaurant, useDishes, useMarketCategories } from '@/hooks/queries';
import './Restaurant.css';

const REVIEWS_TAB = '__reviews__';
const SALE_TAB = '__sale__';
// Do'kon qoidasi — server services/storeRules.js bilan bir xil (eski serverda isStore bo'lmasa ham)

export function RestaurantPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, lang } = useI18n();
  const [modalDish, setModalDish] = useState(null);
  // Sevimlilar — localStorage'da saqlanadi.
  // Selector primitiv (boolean) qaytarishi shart: massiv qaytarilsa
  // har render'da yangi havola bo'lib, cheksiz qayta render bo'ladi.
  const toggleFavorite = useUser((st) => st.toggleFavorite);
  const isFav = useUser((st) =>
    Boolean(st.user.favorites?.restaurants?.includes(id)));
  const [infoOpen, setInfoOpen] = useState(false);
  const { closedInfo, showClosed, hideClosed } = useClosedAlert();

  const highlightHandled = useRef(false);

  // Real data — TanStack Query
  const { data: restaurant, isLoading: restLoading, error: restError } = useRestaurant(id);
  const { data: rawDishes = [], isLoading: dishesLoading } = useDishes(id);
  const restaurantReviews = restaurant?.reviews || [];

  /*
   * DO'KON (Lokma Market): menyu Lokma Go taom kategoriyalari (Milliy taom, Osh...) bilan
   * EMAS, Market kategoriyalari (Mevalar, Sut, Go'sht...) bo'yicha guruhlanadi, tepada
   * "Chegirmalar". Kategoriyalar ro'yxati serverdan (GET /market/categories).
   */
  const isStore = isStoreRestaurant(restaurant);
  // Havola orqali kirilganda ham bo'lim mazmunga mos bo'ladi (do'kon → Market, restoran → Go): ranglar, pastki menyu, "Назад"
  useSyncSection(restaurant ? isStore : undefined);
  const goBack = useBack();
  const { data: market } = useMarketCategories(isStore);
  const catsLoading = isStore && !market;
  const marketCatMap = useMemo(() => new Map((market?.categories || []).map((c) => [c.value, c])), [market]);

  // Ish vaqti har daqiqada qayta hisoblanadi: restoran ochilganda
  // sahifa o'zi jonlanadi, mijoz yangilashi shart emas
  const { isOpen, hoursLabel, offToday, daysLabel, alertInfo } = useOpenStatus(restaurant);

  // Bo'sh ma'lumotlar ko'rsatilmasin — element umuman chizilmaydi
  // Oyna ichida ko'rsatishga biror narsa bormi
  //
  // `restaurant?.phone` ATAYLAB olib tashlandi: server endi bu
  // maydonni umuman qaytarmaydi (controllers/catalog.js,
  // xavfsizlik tuzatishi) — restoranning shaxsiy telefon
  // raqami mijoz brauzeriga tushmasin uchun.
  const hasInfo = Boolean(
    restaurant?.openTime || restaurant?.closeTime || restaurant?.legalName ||
    restaurant?.legalAddress || restaurant?.inn || restaurant?.address ||
    restaurant?.minOrderAmount > 0 ||
    restaurant?.serviceFeePercent > 0 || hasDeliveryTerms(restaurant),
  );

  /*
   * ═══ RESTORANGACHA YO'NALISH ═══
   *
   * Koordinatalar bo'lmasa tugma UMUMAN ko'rsatilmaydi. Sabab:
   * koordinatasiz Yandex faqat qidiruv oynasini ochardi va
   * mijozda "bosdim, hech narsa bo'lmadi" degan taassurot
   * qolardi. Ishlamaydigan tugmadan ko'ra yo'q tugma yaxshi.
   */
  const hasCoords = Number.isFinite(restaurant?.lat) && Number.isFinite(restaurant?.lng);

  const openRoute = () => {
    if (!hasCoords) return;
    haptic();

    const dest = `${restaurant.lat},${restaurant.lng}`;

    /*
     * `rtext=~` — boshlanish nuqtasi BO'SH qoldiriladi.
     *
     * Mijozning joylashuvini o'zimiz so'rab, uzatishimiz ham
     * mumkin edi, lekin bu yomonroq: brauzer ruxsat so'raydi,
     * mijoz kutadi, rad etsa esa umuman ishlamaydi. Bo'sh
     * qoldirilsa Yandex O'ZI joriy joylashuvni oladi — u
     * allaqachon ruxsatga ega va aniqroq ishlaydi.
     *
     * `rtt=auto` — avtomobil yo'nalishi (kuryer emas, mijoz
     * o'zi borishi uchun).
     */
    const url = `https://yandex.uz/maps/?rtext=~${dest}&rtt=auto&z=16`;

    const tg = getTelegram();
    try {
      if (tg?.openLink) { tg.openLink(url); return; }
    } catch { /* zaxira quyida */ }
    window.open(url, '_blank', 'noopener');
  };

  // Taomlarga restoran meta'sini biriktiramiz (savatга to'g'ri o'tishi uchun)
  const restaurantDishes = useMemo(
    () => rawDishes.map((d) => ({
      ...d,
      // Savat aynan shu maydon bo'yicha guruhlaydi — bo'lmasa buyurtma yaratilmaydi
      restaurantId: d.restaurantId || restaurant?.id || restaurant?._id || id,
      restaurantName: restaurant?.name,
      restaurantTint: restaurant?.tint,
      restaurantIcon: restaurant?.icon,
      restaurantDeliveryMin: restaurant?.deliveryMin,
      restaurantDeliveryMax: restaurant?.deliveryMax,
      restaurantDeliveryFee: restaurant?.deliveryFee,
      // Naqd qabul qilinadimi — savatda to'lov tanlovi uchun
      restaurantCashEnabled: restaurant?.cashEnabled,
    })),
    [rawDishes, restaurant, id],
  );

  const sections = useMemo(() => {
    if (isStore) {
      // Kategoriyalar hali yuklanmagan — vaqtincha bitta guruh (skeleton ko'rsatiladi)
      if (!market) return [[t('otherProducts'), restaurantDishes], [REVIEWS_TAB, []]];
      const byCat = new Map();
      restaurantDishes.forEach((d) => {
        const key = marketCatMap.has(d.marketCategory) ? d.marketCategory : '__other__';
        if (!byCat.has(key)) byCat.set(key, []);
        byCat.get(key).push(d);
      });
      const out = [];
      const sale = restaurantDishes.filter(isDiscountedDish);
      if (sale.length) out.push([SALE_TAB, sale]);
      // Market kategoriyalari — serverdagi (barcha do'konda bir xil) tartibda
      (market.categories || []).forEach((c) => {
        const items = byCat.get(c.value);
        if (items?.length) out.push([`${c.emoji} ${marketCatLabel(c, lang)}`, items]);
      });
      const rest = byCat.get('__other__');
      if (rest?.length) out.push([t('otherProducts'), rest]);
      out.push([REVIEWS_TAB, []]);
      return out;
    }
    /*
     * Taomlar platformaning YAGONA kategoriyalari bo'yicha
     * guruhlanadi (Milliy taom, Osh, Shashlik...), restoran
     * o'zi yozgan erkin "section" matni bo'yicha emas.
     *
     * Sabab: har restoran o'z bilganicha yozadi ("bambuk",
     * "ddb", "zakuska") va mijoz uchun bu hech narsa
     * anglatmaydi. Kategoriya esa taom qo'shilganda ro'yxatdan
     * tanlanadi, ya'ni doim tushunarli va bir xil.
     *
     * Tartib ham CATEGORIES ro'yxatidagidek — barcha restoranda
     * bir xil ketma-ketlik.
     */
    const byId = new Map();
    restaurantDishes.forEach((d) => {
      const key = d.category || '__other__';
      if (!byId.has(key)) byId.set(key, []);
      byId.get(key).push(d);
    });

    const map = new Map();

    // Avval ma'lum kategoriyalar — belgilangan tartibda
    CATEGORIES.forEach(({ id, label }) => {
      const items = byId.get(id);
      if (items?.length) {
        map.set(label, items);
        byId.delete(id);
      }
    });

    // Qolganlari (kategoriyasi yo'q yoki ro'yxatda yo'q) — oxirida
    const rest = [];
    byId.forEach((items) => rest.push(...items));
    if (rest.length) map.set('Boshqa', rest);
    // Bo'sh kategoriya ko'rsatilmaydi — taomi yo'q bo'lim
    // tabda ham, ro'yxatda ham chiqmasligi kerak
    const list = Array.from(map.entries()).filter(([, items]) => items.length > 0);
    list.push([REVIEWS_TAB, []]);
    return list;
  }, [restaurantDishes, isStore, market, marketCatMap, lang, t]);

  // Ulashilган havola bilan kelinса (highlightDish) — o'sha taomni avtomatik ochamiz
  useEffect(() => {
    const targetId = location.state?.highlightDish;
    if (!targetId || highlightHandled.current || restaurantDishes.length === 0) return;
    const dish = restaurantDishes.find((d) => (d.id || d._id) === targetId);
    if (dish) {
      highlightHandled.current = true;
      // Kичик kechikish bilan ochamiz (sahifa render bo'lib ulgursin)
      setTimeout(() => setModalDish(dish), 300);
      // State'ни tozalaymiz (qayta ochilmasligi uchun)
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [restaurantDishes, location.state, location.pathname, navigate]);

  const [active, setActive] = useState('');
  // "Barchasini ko'rish": bo'lim karuseldan 2 ustunli setkaga yoyiladi (tanlanmagan bo'lsa — standart qoida pastda)
  const [expanded, setExpanded] = useState({});
  const tabsRef = useRef(null);
  // Bosilgandan keyin kuzatuvchi darhol boshqa bo'limga
  // o'tkazib yubormasligi uchun qisqa muddat to'xtatiladi
  const lockRef = useRef(0);

  /*
   * MENYU KO'RINISHI — hamma restoranda BIR XIL: har bo'lim gorizontal karusel + "Barchasini ko'rish".
   * Bo'limlar 1–2 ta bo'lsa karusel boshidan YOYILGAN (2 ustunli setka) — sahifada bo'sh joy bor, surish shart emas.
   * Mijoz istalgan bo'limni "Barchasini ko'rish" / "Yig'ish" bilan almashtira oladi.
   */
  const dishSections = sections.filter(([name]) => name !== REVIEWS_TAB && name !== SALE_TAB).length;
  const defaultExpanded = dishSections > 0 && dishSections <= 2;
  const toggleSection = (name) => { haptic(); setExpanded((m) => ({ ...m, [name]: !(m[name] ?? defaultExpanded) })); };

  function scrollTo(name) {
    setActive(name);
    lockRef.current = Date.now() + 700;
    document.getElementById(`sec-${name}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Aylantirilganda joriy bo'lim o'zi belgilanadi (Yandex Eda kabi).
   * Avval faol tab faqat bosilganda o'zgarardi — pastga surilganda
   * yuqorida noto'g'ri bo'lim yonib turardi.
   */
  useEffect(() => {
    if (sections.length === 0) return;

    const nodes = sections
      .map(([name]) => document.getElementById(`sec-${name}`))
      .filter(Boolean);
    if (nodes.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (Date.now() < lockRef.current) return;
        // Ekranning yuqori qismidagi eng birinchi bo'lim
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id.replace('sec-', ''));
      },
      // Tepadagi yopishqoq panel ostidagi tor "o'qish chizig'i"
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 },
    );

    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [sections]);

  /** Faol chip gorizontal ro'yxatda ko'rinib tursin. */
  useEffect(() => {
    if (!active || !tabsRef.current) return;
    const chip = tabsRef.current.querySelector('[data-on="1"]');
    if (chip) chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [active]);

  if (restLoading) {
    return <div className="app-shell rest-loading"><div className="spinner" /></div>;
  }

  // Xato yoki topilmadi — tushunarli xabar va chiqish yo'li
  if (restError || !restaurant) {
    return (
      <div className="app-shell rest-error">
        <Icon name="info" size={48} color="var(--muted-2)" />
        <div className="rest-error__title">{t('restaurantClosedTitle')}</div>
        <p className="rest-error__text">
          {restError?.message?.includes('404') || restError?.status === 404
            ? t('restaurantNotFoundMsg')
            : t('restaurantLoadFailedMsg')}
        </p>
        <div className="rest-error__actions">
          <button onClick={() => window.location.reload()} className="rest-error__btn rest-error__btn--primary">
            Qayta urinish
          </button>
          <button onClick={() => navigate('/')} className="rest-error__btn">
            Bosh sahifa
          </button>
        </div>
      </div>
    );
  }

  // Stol bron qilish: restoranda yoqilgan bo'lsa va bu do'kon bo'lmasa
  const canReserve = restaurant.reservationEnabled !== false && !isStore;
  // Statistika kartasi: ma'lumot bor ustunlargina (3–4 ta). Bepul yetkazish — birinchi ustun yorlig'ida
  const freeDelivery = isFreeDelivery(restaurant);
  const statItems = [
    ...(Number.isFinite(restaurant.deliveryMin) && Number.isFinite(restaurant.deliveryMax) ? [{
      key: 'time', tone: 'accent', icon: 'time',
      value: `${restaurant.deliveryMin}–${restaurant.deliveryMax} ${t('min')}`,
      label: freeDelivery ? `${t('free')} ${t('deliveryLower')}` : t('restDelivery'), accentLabel: freeDelivery,
    }] : []),
    ...(restaurant.rating > 0 ? [{ key: 'rating', tone: 'green', icon: 'star', value: Number(restaurant.rating).toFixed(1), label: t('restRating'), onClick: () => scrollTo(REVIEWS_TAB) }] : []),
    ...(hasCoords ? [{ key: 'route', tone: 'accent', icon: 'nav', value: t('routeLabel'), label: t('routeSubLabel'), onClick: openRoute }] : []),
    ...(hasInfo ? [{ key: 'info', tone: 'blue', icon: 'info', value: t('termsLabel'), label: t('workingHoursLabel'), onClick: () => { haptic(); setInfoOpen(true); } }] : []),
  ];

  return (
    <div className="app-shell restaurant">
      <RestaurantHero
        restaurant={restaurant}
        isFav={isFav}
        onBack={goBack}
        onFav={() => { haptic(); toggleFavorite('restaurant', id); }}
        onMore={() => { haptic(); setInfoOpen(true); }}
        backLabel={t('back')}
        moreLabel={t('restMore')}
      />

      {/* Oq varaq: belgi · NOM · holat · statistika · bron — hamma restoranda bir xil dizayn, har biri o'z ma'lumoti bilan */}
      <div className="rp-sheet">
        <RestaurantIdentity
          restaurant={restaurant}
          isOpen={isOpen}
          offToday={offToday}
          hoursLabel={hoursLabel}
          onHours={() => { haptic(); setInfoOpen(true); }}
          t={t}
        />

        {/* Yopiq bo'lsa sababni aytamiz (ish vaqti/kunlari) */}
        {!isOpen && (
          <div className="rest-closed">
            <Icon name="clock" size={16} color="var(--danger)" />
            <span>
              {offToday ? 'Bugun ishlamaydi (dam olish kuni)' : 'Hozir yopiq'}
              {hoursLabel && <> · Ish vaqti {hoursLabel}</>}
              {daysLabel && <> · Ish kunlari {daysLabel}</>}
            </span>
          </div>
        )}

        <RestaurantStats items={statItems} />

        {/* Stol bron qilish — do'konda stol yo'q (server isStore beradi; eski serverda kind/category bo'yicha ham yashiriladi) */}
        {canReserve && <ReserveBanner label={t('reserveTable')} onClick={() => navigate(`/restaurant/${id}/reserve`)} />}
      </div>

      {/* Bo'limlar — ikonkali chiplar */}
      <SectionChips
        sections={sections}
        active={active}
        onPick={scrollTo}
        innerRef={tabsRef}
        kindOf={(name) => (name === REVIEWS_TAB ? 'reviews' : name === SALE_TAB ? 'sale' : 'dish')}
        labelOf={(name) => (name === REVIEWS_TAB ? `${t('reviewsLabel')} (${restaurantReviews.length})` : name === SALE_TAB ? t('saleTab') : name)}
      />

      {/* Menyu + sharhlar */}
      <div className="rest-content">
        {sections.map(([name, list]) => {
          // Chegirmalar — jonli slayder (Lokma Market bilan bir xil), faqat do'konda
          if (name === SALE_TAB) {
            const closedAll = isOpen ? undefined : new Set(list.map((d) => String(d._id || d.id)));
            return (
              <div key={name} id={`sec-${name}`} className="rest-section">
                <DiscountSlider
                  title={t('saleTab')}
                  items={list}
                  loading={dishesLoading || catsLoading}
                  closedIds={closedAll}
                  emojiOf={(d) => marketCatMap.get(d.marketCategory)?.emoji}
                  onOpen={(d) => {
                    if (!isOpen) { haptic(); showClosed({ name: restaurant?.name, ...alertInfo }); return; }
                    setModalDish(d);
                  }}
                />
              </div>
            );
          }
          if (name === REVIEWS_TAB) {
            return (
              <div key={name} id={`sec-${name}`} className="rest-section rest-reviews">
                <div className="rest-section__title">{t('customerReviewsTitle')}</div>

                {restaurantReviews.length === 0 ? (
                  <div className="rest-reviews__empty">
                    Hozircha sharh yo&apos;q. Birinchi bo&apos;lib baho bering!
                  </div>
                ) : (
                  <>
                    {/* Jamlanma: o'rtacha baho va taqsimot */}
                    <ReviewSummary reviews={restaurantReviews} />

                    <div className="rest-reviews__list">
                      {restaurantReviews.map((rv, i) => (
                        <div key={rv.id || i} className="review-card">
                          <div className="review-card__head">
                            <div className="review-card__author">
                              {rv.photoUrl ? (
                                <img src={rv.photoUrl} alt="" className="review-card__avatar" />
                              ) : (
                                <div className="review-card__avatar">
                                  {(rv.name || 'M').split(' ').map((w) => w[0]).join('').slice(0, 2)}
                                </div>
                              )}
                              <span className="review-card__name">{rv.name}</span>
                            </div>
                            <span className="review-card__date">{rv.date}</span>
                          </div>
                          <div className="review-card__stars">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Icon key={n} name="star" size={13}
                                color={n <= rv.rating ? 'var(--brand)' : '#4A4A4E'}
                                style={n <= rv.rating ? { fill: 'var(--brand)' } : {}} />
                            ))}
                          </div>
                          {rv.comment && <div className="review-card__text">{rv.comment}</div>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          }
          const isExpanded = expanded[name] ?? defaultExpanded;
          const canExpand = !(dishesLoading || catsLoading) && list.length > 3;
          return (
            <div key={name} id={`sec-${name}`} className="rest-section">
              <div className="rp-sec__head">
                <h2 className="rp-sec__title">{name}</h2>
                <span className="rp-sec__count">{list.length}</span>
                {canExpand && (
                  <button type="button" className="rp-sec__all" onClick={() => toggleSection(name)} aria-expanded={isExpanded}>
                    {isExpanded ? t('restCollapse') : t('marketViewAll')}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={isExpanded ? { transform: 'rotate(-90deg)' } : undefined}><path d="M9 5l7 7-7 7" /></svg>
                  </button>
                )}
              </div>

              {/* Gorizontal slayd — har kategoriya o'z qatorida.
                  Vertikal ro'yxatda bitta kategoriya butun ekranni
                  egallab, qolganini topish uchun uzoq surish
                  kerak edi. */}
              <div className={isExpanded && !(dishesLoading || catsLoading) ? 'rest-grid' : 'rest-row no-scrollbar'}>
                {dishesLoading || catsLoading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="rest-row__sk" />
                    ))
                  : list.map((d) => <DishScrollCard
                      key={d.id || d._id}
                      dish={d}
                      onClick={setModalDish}
                      showRestaurant={false}
                      showFav
                      showCurrency
                      photoHeight={100}
                      disabled={!isOpen}
                      onDisabledTap={() => showClosed({
                        name: restaurant?.name,
                        ...alertInfo,
                      })}
                    />)}
              </div>
            </div>
          );
        })}
      </div>

      <CartBar />
      <BottomNav />
      {modalDish && (
        <DishModal
          dish={modalDish}
          restaurant={restaurant}
          onClose={() => setModalDish(null)}
          onClosedAlert={showClosed}
        />
      )}

      <ClosedAlert info={closedInfo} onClose={hideClosed} />

      {infoOpen && (
        <RestaurantInfoSheet
          restaurant={restaurant}
          onClose={() => setInfoOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * Sharhlar jamlanmasi — o'rtacha baho va yulduzlar taqsimoti.
 *
 * Yalpi ro'yxatdan oldin turadi: mijoz "umuman qanday" degan
 * savolga bir qarashda javob oladi, keyin tafsilotga tushadi.
 */
function ReviewSummary({ reviews }) {
  const total = reviews.length;
  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
  const avg = total ? sum / total : 0;

  // 5 dan 1 gacha — har bahoga nechta sharh
  const buckets = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Number(r.rating) === star).length,
  }));

  return (
    <div className="rev-sum">
      <div className="rev-sum__score">
        <div className="rev-sum__avg">{avg.toFixed(1)}</div>
        <div className="rev-sum__stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <Icon key={n} name="star" size={12}
              color={n <= Math.round(avg) ? 'var(--brand)' : '#4A4A4E'}
              style={n <= Math.round(avg) ? { fill: 'var(--brand)' } : {}} />
          ))}
        </div>
        <div className="rev-sum__count">{total} ta baho</div>
      </div>

      <div className="rev-sum__bars">
        {buckets.map(({ star, count }) => (
          <div key={star} className="rev-sum__row">
            <span className="rev-sum__star">{star}</span>
            <span className="rev-sum__track">
              <span
                className="rev-sum__fill"
                style={{ width: total ? `${(count / total) * 100}%` : 0 }}
              />
            </span>
            <span className="rev-sum__n">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

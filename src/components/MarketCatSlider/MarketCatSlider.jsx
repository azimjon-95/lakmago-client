import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DishPhoto, optimizeCloudinary } from '@/components/DishPhoto';
import { ProductImg } from '@/components/ProductImage/ProductImg';
import { formatSomShort } from '@/lib/utils';
import { isDiscountedDish, discountPercent } from '@/lib/discount';
import { unitSuffix } from '@/data/market';
import { haptic } from '@/lib/telegram';
import { useUser } from '@/store/user';
import './MarketCatSlider.css';

/*
 * TANLANGAN KATEGORIYA — 2 qatorli gorizontal slayder (och yashil panel).
 *   Sarlavha: barg/rasm · nom · soni · tavsif · "Barchasini ko'rish ›"
 *   Kartalar: yurakcha, chegirma belgisi, rasm (kesilmaydi), nom, narx nishoni, yashil "+"
 *   Past: ‹ nuqtalar › — sahifalar tarjima qilingan geometriyadan (scrollLeft/clientWidth) hisoblanadi
 *   Oxiriga yaqinlashganda keyingi sahifa AVTOMATIK so'raladi (onNeedMore), yuklanayotganda skeleton ustunlar.
 */
const COLS_PER_PAGE = 3;        // bir "sahifada" ko'rinadigan to'liq ustunlar
const NEAR_END_PAGES = 1.2;     // oxirigacha shuncha sahifa qolganda keyingi so'rovni boshlaymiz
const MAX_DOTS = 6;             // undan ko'p bo'lsa — "3 / 9" matni

const Svg = ({ children, size = 16, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>{children}</svg>
);
const HeartIcon = ({ filled }) => (
  <Svg size={15} fill={filled ? 'currentColor' : 'none'}><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.3 5 6.4 5c1.9 0 3.5 1 4.3 2.4h.6C12.1 6 13.7 5 15.6 5c3.1 0 4.9 3 3.7 6.3C19.5 15.9 12 20.5 12 20.5z" /></Svg>
);
const PlusIcon = () => <Svg size={14} strokeWidth={2.8}><path d="M12 5v14M5 12h14" /></Svg>;
const ChevL = () => <Svg size={20} strokeWidth={2.6}><path d="M15 5l-7 7 7 7" /></Svg>;
const ChevR = () => <Svg size={20} strokeWidth={2.6}><path d="M9 5l7 7-7 7" /></Svg>;
const ChevR12 = () => <Svg size={13} strokeWidth={2.8}><path d="M9 5l7 7-7 7" /></Svg>;
const LeafIcon = () => (
  <svg width="34" height="34" viewBox="0 0 48 48" aria-hidden="true">
    <defs><linearGradient id="mcsLeaf" x1="8" y1="6" x2="40" y2="44" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#3DBE72" /><stop offset="1" stopColor="#12803F" /></linearGradient></defs>
    <path d="M40 6C22 6 8 15 8 30c0 5 2.4 9 6.4 11.6C16 33 22 24 33 18c-8 7-13 14-15.6 24.4C34 41 41 25 40 6z" fill="url(#mcsLeaf)" />
  </svg>
);

const idOf = (d) => String(d?._id || d?.id || '');

/* Mahsulot kartasi */
const SliderCard = memo(function SliderCard({ dish, lang, closed, fav, onOpen, onToggleFav }) {
  const discount = isDiscountedDish(dish);
  const unit = unitSuffix(dish.unit, lang);
  const showUnit = dish.unit && dish.unit !== 'dona';          // "dona" odatiy — yozilmaydi; kg/l kabilar muhim
  const real = dish.imageUrl || dish.images?.[0];
  const priceText = formatSomShort(dish.price);
  const long = priceText.replace(/\s/g, '').length >= 6;       // 100 000+ — nishon sig'ishi uchun kichikroq
  const name = dish.packSize && !String(dish.name).includes(dish.packSize) ? `${dish.name} ${dish.packSize}` : dish.name;
  const open = () => onOpen(dish);
  return (
    <div
      className={`mcs-card${closed ? ' is-closed' : ''}`}
      role="button" tabIndex={0} aria-label={name}
      onClick={open}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
    >
      {discount && <span className="mcs-card__badge">−{discountPercent(dish)}%</span>}
      <button type="button" className={`mcs-card__fav${fav ? ' is-on' : ''}`} aria-pressed={fav} aria-label="♥"
        onClick={(e) => { e.stopPropagation(); onToggleFav(dish); }}>
        <HeartIcon filled={fav} />
      </button>
      <div className="mcs-card__photo">
        {real && String(real).startsWith('http')
          ? <ProductImg src={optimizeCloudinary(real, 240, 'contain')} />
          : <DishPhoto dish={dish} height={46} radius={12} iconSize={22} />}
      </div>
      <div className="mcs-card__name">{name}</div>
      <div className="mcs-card__foot">
        <div className="mcs-card__prices">
          {(discount || showUnit) && (
            <span className="mcs-card__meta">
              {discount && <s className="mcs-card__old">{formatSomShort(dish.oldPrice)} so'm</s>}
              {showUnit && <span className="mcs-card__unit">{unit}</span>}
            </span>
          )}
          <span className={`mcs-card__price${discount ? ' is-sale' : ''}${long ? ' is-long' : ''}`}>
            <b>{priceText}</b><small>so'm</small>
          </span>
        </div>
        <button type="button" className="mcs-card__add" aria-label="+" onClick={(e) => { e.stopPropagation(); open(); }}>
          <PlusIcon />
        </button>
      </div>
    </div>
  );
});

/* Skeleton karta (slayder o'lchamida) */
function SkelCard() {
  return (
    <div className="mcs-card mcs-card--skel" aria-hidden="true">
      <span className="skeleton mcs-skel mcs-skel--photo" />
      <span className="skeleton mcs-skel mcs-skel--l1" />
      <span className="skeleton mcs-skel mcs-skel--l2" />
      <div className="mcs-card__foot"><span className="skeleton mcs-skel mcs-skel--price" /><span className="skeleton mcs-skel mcs-skel--btn" /></div>
    </div>
  );
}

export function MarketCatSlider({
  category, title, description, imageUrl, items, closedIds, lang = 'uz',
  loading = false, error = false, onRetry, hasNext = false, fetchingNext = false, onNeedMore,
  onOpen, onViewAll, viewAllLabel = 'Barchasini ko\'rish', emptyText = '', emptyEmoji = '🛒', retryLabel = 'Qayta urinish',
}) {
  const trackRef = useRef(null);
  const [nav, setNav] = useState({ atStart: true, atEnd: true, page: 0, pages: 1 });
  const favDishes = useUser((s) => s.user.favorites?.dishes);
  const toggleFavorite = useUser((s) => s.toggleFavorite);
  const favSet = useMemo(() => new Set((favDishes || []).map(String)), [favDishes]);
  const onToggleFav = useCallback((d) => { haptic(); toggleFavorite('dish', idOf(d)); }, [toggleFavorite]);

  // Geometriya bo'yicha holat: boshida/oxirida, joriy sahifa, sahifalar soni
  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const first = el.querySelector('.mcs-card');
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const step = first ? (first.offsetWidth + gap) * COLS_PER_PAGE : el.clientWidth;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const pages = Math.max(1, Math.ceil((max + el.clientWidth * 0.9) / Math.max(1, step)));
    const atStart = el.scrollLeft <= 2;
    const atEnd = el.scrollLeft >= max - 2;
    const page = atEnd ? pages - 1 : Math.min(pages - 1, Math.round(el.scrollLeft / Math.max(1, step)));
    setNav((n) => (n.atStart === atStart && n.atEnd === atEnd && n.page === page && n.pages === pages ? n : { atStart, atEnd, page, pages }));
    // Oxiriga yaqinlashdik — keyingi sahifani so'raymiz
    if (hasNext && !fetchingNext && el.scrollWidth - (el.scrollLeft + el.clientWidth) < el.clientWidth * NEAR_END_PAGES) onNeedMore?.();
  }, [hasNext, fetchingNext, onNeedMore]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    let raf = 0;
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onScroll) : null;
    ro?.observe(el);
    measure();
    return () => { cancelAnimationFrame(raf); el.removeEventListener('scroll', onScroll); ro?.disconnect(); };
  }, [measure]);
  // Mahsulotlar soni o'zgarganda (yangi sahifa) qayta o'lchaymiz
  useEffect(() => { measure(); }, [items.length, fetchingNext, loading, measure]);

  const go = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const first = el.querySelector('.mcs-card');
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const step = first ? (first.offsetWidth + gap) * COLS_PER_PAGE : el.clientWidth;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  const count = items.length;
  const empty = !loading && !error && count === 0;

  return (
    <section className="mcs" data-testid="market-catslider" aria-label={title}>
      <header className="mcs__head">
        <div className="mcs__main">
          {imageUrl
            ? <img className="mcs__ico mcs__ico--img" src={imageUrl} alt="" loading="lazy" decoding="async" />
            : <span className="mcs__ico"><LeafIcon /></span>}
          <div className="mcs__txt">
            <h2 className="mcs__title">{title}{count > 0 && <span className="mcs__count" data-testid="mcs-count"> {count}{hasNext ? '+' : ''}</span>}</h2>
            {description && <p className="mcs__desc">{description}</p>}
          </div>
        </div>
        <button type="button" className="mcs__all" onClick={onViewAll} data-testid="mcs-all">
          {viewAllLabel}<ChevR12 />
        </button>
      </header>

      {error && count === 0 ? (
        <div className="mcs__state">
          <button type="button" className="mcs__retry" onClick={onRetry}>{retryLabel}</button>
        </div>
      ) : empty ? (
        <div className="mcs__state mcs__empty" data-testid="market-catempty">
          <span className="mcs__empty-art" aria-hidden="true">{emptyEmoji}</span>
          <p>{emptyText}</p>
        </div>
      ) : (
        <>
          <div className="mcs__track" ref={trackRef} data-testid="mcs-track">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <SkelCard key={i} />)
              : items.map((d) => {
                  const id = idOf(d);
                  return <SliderCard key={id} dish={d} lang={lang} closed={closedIds?.has?.(id)} fav={favSet.has(id)} onOpen={onOpen} onToggleFav={onToggleFav} />;
                })}
            {fetchingNext && Array.from({ length: 4 }).map((_, i) => <SkelCard key={`s${i}`} />)}
          </div>

          <div className="mcs__ctrl">
            <button type="button" className="mcs__arrow" onClick={() => go(-1)} disabled={nav.atStart} aria-label="‹" data-testid="mcs-prev"><ChevL /></button>
            <div className="mcs__dots" aria-hidden="true" data-testid="mcs-dots">
              {nav.pages > MAX_DOTS
                ? <span className="mcs__pagenum">{nav.page + 1} / {nav.pages}</span>
                : Array.from({ length: nav.pages }).map((_, i) => <i key={i} className={i === nav.page ? 'is-on' : ''} />)}
            </div>
            <button type="button" className="mcs__arrow" onClick={() => go(1)} disabled={nav.atEnd && !hasNext} aria-label="›" data-testid="mcs-next"><ChevR /></button>
          </div>
        </>
      )}
    </section>
  );
}

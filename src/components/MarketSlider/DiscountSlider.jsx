import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DishPhoto } from '@/components/DishPhoto';
import { Icon } from '@/components/Icon';
import { formatSomShort } from '@/lib/utils';
import { discountPercent } from '@/lib/discount';
import { unitSuffix } from '@/data/market';
import { useI18n } from '@/i18n';
import './DiscountSlider.css';

/*
 * ═══ CHEGIRMADAGI MAHSULOTLAR — jonli slayder (Lokma Market) ═══
 *
 *   • o'zi harakatlanadi (har 3.6 s da keyingi slayd, silliq), barmoq bilan ham suriladi;
 *   • foydalanuvchi tegsa/surilsa — 6 soniya pauza; ekrandan chiqsa yoki ilova fonga
 *     o'tsa — to'xtaydi (batareya va trafik tejaladi);
 *   • "harakatni kamaytirish" yoqilgan qurilmada animatsiya va avto-surish o'chiq;
 *   • slayd bosilsa — mahsulot oynasi (mavjud DishModal) ochiladi;
 *   • ostida faol slayd chizig'i taymer kabi to'lib boradi.
 */
const AUTO_MS = 3600;
const RESUME_AFTER_MS = 6000;
const MAX_SLIDES = 10;

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const hasPhoto = (d) => {
  const u = d.imageUrl || (d.images && d.images[0]);
  return typeof u === 'string' && u.startsWith('http');
};

const Slide = memo(function Slide({ dish, closed, onOpen, lang, emojiOf }) {
  const pct = discountPercent(dish);
  const unit = unitSuffix(dish.unit, lang);
  return (
    <button type="button" className={`mds-slide${closed ? ' is-closed' : ''}`} onClick={() => onOpen(dish)}>
      <span className="mds-slide__blob mds-slide__blob--a" aria-hidden="true" />
      <span className="mds-slide__blob mds-slide__blob--b" aria-hidden="true" />
      <span className="mds-slide__shine" aria-hidden="true" />

      <span className="mds-slide__info">
        {dish.restaurantName && <span className="mds-slide__store">{dish.restaurantName}</span>}
        <span className="mds-slide__name">{dish.name}</span>
        {dish.packSize && <span className="mds-slide__pack">{dish.packSize}</span>}
        <span className="mds-slide__prices">
          <span className="mds-slide__price">{formatSomShort(dish.price)}<small> so'm{unit ? ` ${unit}` : ''}</small></span>
          <span className="mds-slide__old">{formatSomShort(dish.oldPrice)}</span>
        </span>
      </span>

      <span className="mds-slide__photo-wrap">
        <span className="mds-slide__photo">
          {hasPhoto(dish)
            ? <DishPhoto dish={dish} fill radius={999} iconSize={34} />
            // Rasm yo'q — kategoriya emojisi (bo'sh doira o'rniga)
            : <span className="mds-slide__emoji" aria-hidden="true">{emojiOf?.(dish) || '🛒'}</span>}
        </span>
        {pct > 0 && <span className="mds-slide__badge">−{pct}%</span>}
      </span>
    </button>
  );
});

export function DiscountSlider({ items, loading, closedIds, onOpen, title, emojiOf }) {
  const { lang } = useI18n();
  const trackRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [tick, setTick] = useState(0); // pauza tugagach taymerni qayta ishga tushirish uchun
  const pausedUntil = useRef(0);
  const visibleRef = useRef(true);
  const slides = useMemo(() => items.slice(0, MAX_SLIDES), [items]);
  const n = slides.length;
  const motion = !reduced();

  // Joriy slayd (surish paytida ham to'g'ri nuqta yonib turishi uchun)
  const onScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el || !el.children.length) return;
    const first = el.children[0];
    const step = first.getBoundingClientRect().width + 12;
    setIndex(Math.max(0, Math.min(n - 1, Math.round(el.scrollLeft / step))));
  }, [n]);

  const goTo = useCallback((i) => {
    const el = trackRef.current;
    const child = el?.children[i];
    if (!el || !child) return;
    el.scrollTo({ left: child.offsetLeft - el.offsetLeft - 16, behavior: motion ? 'smooth' : 'auto' });
  }, [motion]);

  // Foydalanuvchi tegsa — avto-surish pauza
  const pause = useCallback(() => { pausedUntil.current = Date.now() + RESUME_AFTER_MS; }, []);

  // Ekranda ko'rinyaptimi (IntersectionObserver) — ko'rinmasa avto-surish yo'q
  useEffect(() => {
    const el = trackRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => { visibleRef.current = e.isIntersecting; }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [n]);

  // Avto-surish: indeks o'zgarganda taymer qayta boshlanadi (chiziq animatsiyasi bilan sinxron)
  useEffect(() => {
    if (n < 2 || !motion) return undefined;
    const timer = setTimeout(() => {
      if (document.hidden || !visibleRef.current || Date.now() < pausedUntil.current) {
        setTick((x) => x + 1); // pauza/ko'rinmaydi — keyingi urinish
        return;
      }
      goTo((index + 1) % n);
    }, AUTO_MS);
    return () => clearTimeout(timer);
  }, [index, tick, n, motion, goTo]);

  if (!loading && n === 0) return null;

  return (
    <section className="mds" aria-label={title}>
      <div className="mds__head">
        <div className="mds__title">
          <span className="mds__fire" aria-hidden="true"><Icon name="flame" size={16} color="#fff" /></span>
          {title}
        </div>
        {n > 0 && <span className="mds__count">{n}</span>}
      </div>

      <div
        ref={trackRef}
        className="mds__track no-scrollbar"
        onScroll={onScroll}
        onTouchStart={pause}
        onPointerDown={pause}
        onWheel={pause}
      >
        {loading
          ? Array.from({ length: 2 }).map((_, i) => <div key={i} className="mds-slide mds-slide--skeleton" />)
          : slides.map((d) => (
            <Slide key={d._id || d.id} dish={d} lang={lang} onOpen={onOpen} emojiOf={emojiOf} closed={closedIds?.has(String(d._id || d.id))} />
          ))}
      </div>

      {n > 1 && (
        <div className="mds__dots" role="tablist" aria-label={title}>
          {slides.map((d, i) => (
            <button
              key={d._id || d.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`${i + 1} / ${n}`}
              className={`mds__dot${i === index ? ' is-active' : ''}`}
              onClick={() => { pause(); goTo(i); }}
            >
              {/* Faol chiziq AUTO_MS davomida to'lib boradi (taymer) */}
              {i === index && motion && <span key={index} className="mds__dot-fill" style={{ animationDuration: `${AUTO_MS}ms` }} />}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

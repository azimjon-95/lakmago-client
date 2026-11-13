import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DishScrollCard } from '@/components/DishScrollCard';
import { useStoreMenuSection } from '@/hooks/queries';

/*
 * ═══ KATTA DO'KON: bitta bo'lim (sarlavha + karusel/setka) — o'z sahifalari bilan ═══
 *
 * 2000+ mahsulotli do'konda hammasi bir yo'la yuklanmaydi:
 *   • bo'lim ekranga yaqinlashganda (≈600px) YUKLANADI — tez o'tib ketilgan bo'limlar so'rov yubormaydi (140ms kechikish);
 *   • birinchi sahifa (24 ta) kelguncha skeleton kartalar — joy o'zgarmaydi, sakrash yo'q;
 *   • karusel oxiriga yaqinlashganda (yonga surilganda) keyingi sahifa olinadi; "yoyilgan" setkada — pastga tushganda;
 *   • xato bo'lsa — "Qayta urinish" (butun sahifa yiqilmaydi); bir mahsulot ikki marta chiqmaydi (id bo'yicha).
 */
const NEAR_MARGIN = '600px 0px';
const ROW_PRELOAD_PX = 700;
const FIRST_SKELETONS = 6;
const MORE_SKELETONS = 3;
const SCREEN_DELAY_MS = 140;

const idOf = (d) => String(d.id || d._id);

export function StoreMenuSection({
  restaurantId, sectionKey, name, count, eager = false, expanded, canExpand, onToggle,
  expandLabel, collapseLabel, attach, onOpen, addLabel, disabled, onDisabledTap,
}) {
  const wrapRef = useRef(null);
  const rowRef = useRef(null);
  const sentinelRef = useRef(null);
  const [near, setNear] = useState(eager);

  // Bo'lim ekranga yaqinlashganda (tez o'tib ketilmasa) so'rov yoqiladi
  useEffect(() => {
    if (near) return undefined;
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setNear(true); return undefined; }
    let timer = 0;
    const io = new IntersectionObserver(([e]) => {
      clearTimeout(timer);
      if (e.isIntersecting) timer = setTimeout(() => setNear(true), SCREEN_DELAY_MS);
    }, { rootMargin: NEAR_MARGIN });
    io.observe(el);
    return () => { clearTimeout(timer); io.disconnect(); };
  }, [near]);

  const q = useStoreMenuSection(restaurantId, sectionKey, near);
  const { data, isError, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = q;

  const items = useMemo(() => {
    if (!data) return [];
    const seen = new Set();
    const out = [];
    for (const page of data.pages) {
      for (const d of page?.items || []) {
        const id = idOf(d);
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(attach ? attach(d) : d);
      }
    }
    return out;
  }, [data, attach]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetching) fetchNextPage();
  }, [hasNextPage, isFetching, fetchNextPage]);

  // Karusel: oxiriga yaqin (yoki hali yetarlicha uzun emas) bo'lsa keyingi sahifa
  const checkRow = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    if (el.scrollWidth - el.clientWidth - el.scrollLeft < ROW_PRELOAD_PX) loadMore();
  }, [loadMore]);

  useEffect(() => {
    if (expanded) return undefined;
    const el = rowRef.current;
    if (!el) return undefined;
    let raf = 0;
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(checkRow); };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { cancelAnimationFrame(raf); el.removeEventListener('scroll', onScroll); };
  }, [expanded, checkRow]);

  // Har sahifadan keyin qayta tekshiriladi: keng ekranda birinchi sahifa yetmasa keyingisi o'zi keladi
  useEffect(() => { if (!expanded && items.length) checkRow(); }, [items.length, expanded, checkRow]);

  // Yoyilgan setka: pastdagi kuzatuvchi
  useEffect(() => {
    if (!expanded) return undefined;
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) loadMore(); }, { rootMargin: '0px 0px 700px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [expanded, loadMore, items.length]);

  const loadingFirst = !data && !isError;
  const skeletons = Math.min(Math.max(count || 0, 1), FIRST_SKELETONS);

  return (
    <div ref={wrapRef} id={`sec-${name}`} className="rest-section" data-section-key={sectionKey}>
      <div className="rp-sec__head">
        <h2 className="rp-sec__title">{name}</h2>
        <span className="rp-sec__count">{count}</span>
        {canExpand && (
          <button type="button" className="rp-sec__all" onClick={onToggle} aria-expanded={expanded}>
            {expanded ? collapseLabel : expandLabel}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={expanded ? { transform: 'rotate(-90deg)' } : undefined}><path d="M9 5l7 7-7 7" /></svg>
          </button>
        )}
      </div>

      <div
        ref={rowRef}
        className={expanded ? 'rest-grid' : 'rest-row no-scrollbar'}
        role="group" aria-label={name} tabIndex={expanded ? undefined : 0}
        aria-busy={loadingFirst || isFetchingNextPage}
      >
        {loadingFirst && Array.from({ length: skeletons }).map((_, i) => <div key={`sk${i}`} className="rest-row__sk" />)}

        {items.map((d) => (
          <DishScrollCard
            key={idOf(d)} dish={d} onClick={onOpen} showRestaurant={false} showFav showCurrency
            photoAspect="1 / 0.85" addLabel={addLabel} disabled={disabled} onDisabledTap={onDisabledTap}
          />
        ))}

        {isFetchingNextPage && Array.from({ length: MORE_SKELETONS }).map((_, i) => <div key={`more${i}`} className="rest-row__sk" />)}
      </div>

      {isError && (
        <div className="rest-more-error" role="alert">
          <span>Yuklab bo&apos;lmadi</span>
          <button type="button" onClick={() => refetch()}>Qayta urinish</button>
        </div>
      )}

      {expanded && <div ref={sentinelRef} className="rest-more-sentinel" aria-hidden="true" />}
    </div>
  );
}

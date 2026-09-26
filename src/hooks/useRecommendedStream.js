import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/api';
import { HOME_FEED_LIMIT } from '@/hooks/queries';
import { useOpenPartition } from '@/hooks/useOpenStatus';
import { drainPool, tailOf } from '@/lib/mixDishes';

/*
 * ═══════════════════════════════════════════════════════════
 * «TAVSIYA QILAMIZ» — CHEKSIZ GORIZONTAL TASMA
 * ═══════════════════════════════════════════════════════════
 *
 * Qator AVVALGIDEK ochiladi (bosh sahifa tanlagan 20 taom). Mijoz
 * oxiriga yaqinlashganda davomi jimgina qo'shib boriladi — oxir-oqibat
 * barcha restoranlarning barcha taomlari ko'rinadi.
 *
 * ─── QAYERDAN ───
 *   1-qadam: bosh sahifa ALLAQACHON yuklagan, lekin qatorga
 *            sig'magan taomlar (birinchi sahifa 50 ta, qatorda 20).
 *            Tarmoq so'rovi YO'Q — darhol.
 *   2-qadam: /dishes/all?discounted=0 ning keyingi sahifalari.
 *
 * ─── CURSOR — SERVER O'ZGARTIRILMAGAN ───
 * Bosh sahifaning so'rovi (useDishFeed) faqat `items`ni saqlaydi,
 * `nextCursor`ni emas. Server cursor'i `${createdAt ISO}|${_id}` —
 * sahifaning OXIRGI taomidan yasaladi (controllers/catalog.js).
 * Javobda har bir taomda shu ikki maydon bor, shuning uchun AYNAN
 * shu cursor mijozda tiklanadi: qo'shimcha so'rov ham, server
 * o'zgarishi ham kerak emas. Birinchi sahifa to'liq kelmagan bo'lsa
 * (< HOME_FEED_LIMIT) — davomi yo'q.
 *
 * ─── "MIJOZ SEZMASIN" ───
 * IntersectionObserver oxiridan ~900px (3-4 karta) OLDIN ishga
 * tushadi — keyingi to'plam mijoz oxiriga yetmasdan tayyor bo'ladi.
 * Qator qayta chizilmaydi: faqat oxiriga yangi kartalar qo'shiladi,
 * mavjudlarining key'i va joyi o'zgarmaydi (scroll sakramaydi).
 *
 * ─── XAVFSIZLIK ───
 *   • Bir vaqtda faqat BITTA so'rov (loadingRef).
 *   • Kategoriya o'zgarsa yoki sahifa yangilansa — eski so'rov bekor
 *     qilinadi va uning kechikkan javobi e'tiborsiz qoldiriladi
 *     (generation hisoblagichi).
 *   • Takror taom chiqmaydi: qatorda bor id'lar o'tkazib yuboriladi.
 *   • Xato bo'lsa — oshib boruvchi pauza bilan qayta urinadi, faqat
 *     mijoz oxirida turgan bo'lsa (bekorga server yuklanmaydi).
 *   • Background refetch (oyna fokusi) qatorni TOZALAMAYDI — aks
 *     holda mijoz aylantirib turganda kartalar yo'qolib qolardi.
 *     Faqat kategoriya yoki pastga tortib yangilash tozalaydi.
 */

const PAGE_SIZE = 30;
const PRELOAD_PX = 900;

const idOf = (d) => String(d?.id || d?._id || '');

/** Server sahifasining oxirgi taomidan keyingi cursor (server formati). */
function cursorAfter(page) {
  const last = page[page.length - 1];
  const id = last?._id || last?.id;
  const at = last?.createdAt ? new Date(last.createdAt) : null;
  if (!id || !at || Number.isNaN(at.getTime())) return null;
  return `${at.toISOString()}|${String(id)}`;
}

/**
 * @param {object} p
 * @param {boolean} p.enabled   — birinchi sahifa yuklangan va qator ko'rinadi
 * @param {Array}   p.firstPage — bosh sahifa yuklagan xom sahifa (server tartibida)
 * @param {Array}   p.shown     — qatorda hozir ko'rinayotgan 20 taom
 * @param {(d) => boolean} p.accept — qatorga tushishi mumkinmi (chegirmasiz, kategoriya)
 * @param {string}  p.category  — o'zgarsa tasma boshidan boshlanadi
 * @param {number}  p.resetKey  — pastga tortib yangilashda oshiriladi
 * @param {number}  p.seed      — aralashtirish urug'i
 */
export function useRecommendedStream({ enabled, firstPage, shown, accept, category, resetKey, seed }) {
  const [extra, setExtra] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [tick, setTick] = useState(0);

  const rowRef = useRef(null);
  const sentinelRef = useRef(null);

  const genRef = useRef(0);
  const cursorRef = useRef(undefined); // undefined — hali boshlanmagan
  const seenRef = useRef(new Set());
  // Kutish havzasi — bitta restoranning ortiqchasi keyingi sahifa
  // bilan aralashishini kutadi (lib/mixDishes.js)
  const poolRef = useRef({ open: [], closed: [], tail: [] });
  const loadingRef = useRef(false);
  const visibleRef = useRef(false);
  const failsRef = useRef(0);
  const abortRef = useRef(null);
  const retryRef = useRef(null);

  // Har renderda yangilanadi — eskirgan qiymat ishlatilmasin
  const live = useRef({});
  live.current = { firstPage, shown, accept, category, seed };

  const reset = useCallback(() => {
    genRef.current += 1;
    abortRef.current?.abort();
    clearTimeout(retryRef.current);
    cursorRef.current = undefined;
    seenRef.current = new Set();
    poolRef.current = { open: [], closed: [], tail: [] };
    loadingRef.current = false;
    failsRef.current = 0;
    /*
     * "Mijoz oxirida turibdi" degan eski ma'lumot ham tozalanadi —
     * aks holda kategoriya almashishi bilan yangi kategoriya taomlari
     * so'ralmasdan oqib kela boshlardi. Qator boshiga qaytadi:
     * observer haqiqiy holatni qayta aytadi.
     */
    visibleRef.current = false;
    if (rowRef.current) rowRef.current.scrollLeft = 0;
    setExtra([]);
    setLoading(false);
    setHasMore(true);
  }, []);

  // Kategoriya yoki qo'lda yangilash — boshidan
  useEffect(() => { reset(); }, [category, resetKey, reset]);

  const loadMore = useCallback(async () => {
    if (!enabled || loadingRef.current) return;
    const { firstPage: page, shown: visible, accept: ok, category: cat, seed: sd } = live.current;

    // ─── 1-qadam: allaqachon yuklangan qoldiq, tarmoqsiz ───
    if (cursorRef.current === undefined) {
      const seen = new Set(visible.map(idOf));
      const leftovers = page.filter((d) => ok(d) && !seen.has(idOf(d)));
      leftovers.forEach((d) => seen.add(idOf(d)));
      seenRef.current = seen;
      // Davomi eski 20 talik qator oxiridan uzluksiz aralashsin
      poolRef.current.tail = tailOf(visible);
      cursorRef.current = page.length >= HOME_FEED_LIMIT ? cursorAfter(page) : null;
      setHasMore(Boolean(cursorRef.current));
      const out = drainPool(poolRef.current, leftovers, sd, !cursorRef.current);
      if (out.length) setExtra(out);
      setTick((n) => n + 1);
      return;
    }

    if (!cursorRef.current) return; // hammasi ko'rsatildi

    // ─── 2-qadam: keyingi sahifa serverdan ───
    const gen = genRef.current;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    loadingRef.current = true;
    setLoading(true);

    try {
      const res = await api.getDishesFeed({
        discounted: false, category: cat, limit: PAGE_SIZE, cursor: cursorRef.current, signal: ctrl.signal,
      });
      if (gen !== genRef.current) return; // eskirgan javob

      const items = Array.isArray(res?.items) ? res.items : [];
      const next = res?.hasMore && res?.nextCursor ? res.nextCursor : null;
      // Server cursor'ni ilgari surmasa — cheksiz aylanib qolmasin
      cursorRef.current = next && next !== cursorRef.current ? next : null;

      const fresh = items.filter((d) => ok(d) && !seenRef.current.has(idOf(d)));
      fresh.forEach((d) => seenRef.current.add(idOf(d)));
      failsRef.current = 0;

      const out = drainPool(poolRef.current, fresh, sd + seenRef.current.size, !cursorRef.current);
      if (out.length) setExtra((prev) => prev.concat(out));
      setHasMore(Boolean(cursorRef.current));
      setTick((n) => n + 1);
    } catch (e) {
      if (e?.name === 'AbortError' || gen !== genRef.current) return;
      failsRef.current += 1;
      const delay = Math.min(30_000, 1500 * 2 ** failsRef.current);
      clearTimeout(retryRef.current);
      retryRef.current = setTimeout(() => {
        if (visibleRef.current) loadMoreRef.current();
      }, delay);
    } finally {
      if (gen === genRef.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, [enabled]);

  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  /*
   * To'plam qo'shilgach mijoz hali ham oxirga yaqin bo'lsa (to'plam
   * kichik bo'lib chiqsa, yoki hammasi filtrdan o'tmagan bo'lsa) —
   * observer qayta ishlamaydi (kesishuv o'zgarmadi), shuning uchun
   * shu yerda davom ettiramiz.
   */
  useEffect(() => {
    if (tick && visibleRef.current && hasMore) loadMoreRef.current();
  }, [tick, hasMore]);

  // Oxiriga yaqinlashishni kuzatish
  useEffect(() => {
    const row = rowRef.current;
    const el = sentinelRef.current;
    if (!enabled || !row || !el) return undefined;

    if (typeof IntersectionObserver === 'function') {
      const io = new IntersectionObserver(([entry]) => {
        visibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting) loadMoreRef.current();
      }, { root: row, rootMargin: `0px ${PRELOAD_PX}px 0px 0px`, threshold: 0 });
      io.observe(el);
      return () => io.disconnect();
    }

    // Juda eski WebView — oddiy scroll bilan
    const onScroll = () => {
      const near = row.scrollLeft + row.clientWidth >= row.scrollWidth - PRELOAD_PX;
      visibleRef.current = near;
      if (near) loadMoreRef.current();
    };
    row.addEventListener('scroll', onScroll, { passive: true });
    return () => row.removeEventListener('scroll', onScroll);
  }, [enabled]);

  // Sahifadan chiqilganda — so'rov va taymer to'xtatiladi
  useEffect(() => () => {
    genRef.current += 1;
    abortRef.current?.abort();
    clearTimeout(retryRef.current);
  }, []);

  /*
   * Background refetch qatordagi 20 taomni almashtirsa, o'sha taom
   * davomida ham bo'lishi mumkin — ekranda ikki marta chiqmasin.
   */
  const extraVisible = useMemo(() => {
    const s = new Set(shown.map(idOf));
    return extra.filter((d) => !s.has(idOf(d)));
  }, [extra, shown]);

  const { closedIds } = useOpenPartition(extraVisible);

  return { extra: extraVisible, closedIds, loading, hasMore, rowRef, sentinelRef };
}

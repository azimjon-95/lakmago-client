import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { dishFeedQuery } from '@/hooks/queries';
import './Splash.css';

/*
 * ═══════════════════════════════════════════════════════════
 * SPLASH — OCHILISH EKRANI
 * ═══════════════════════════════════════════════════════════
 *
 * ─── VAQT MANTIG'I ───
 *
 * Avval splash HAR DOIM 3.8 soniya turardi — internet tez bo'lib,
 * ma'lumot 0.4 soniyada kelgan taqdirda ham. Foydalanuvchi har
 * ochilishda 3 soniyani behuda kutardi.
 *
 * Endi uch shart birga ishlaydi:
 *   MIN_MS  — kamida shuncha turadi, brend ko'rinsin va ekran
 *             "chaqnab" o'tib ketmasin;
 *   ma'lumot tayyor bo'lishi — asosiy so'rovlar tugashi bilan yopiladi;
 *   MAX_MS  — bundan ortiq HECH QACHON ushlab turmaydi. Internet
 *             sekin bo'lsa yoki server javob bermasa ham ilova
 *             ochiladi: bosh sahifada skeletlar bor, bo'sh ekran emas.
 *
 * Amalda: tez internetda ~1.2s, sekinda 3.5s.
 *
 * ─── MEDIA ───
 *
 * Video (webm/mp4) bo'lsa — o'sha ishlatiladi, chunki u GIF'dan
 * ~10 barobar yengil va sifatliroq. Fayl hali qo'yilmagan bo'lsa
 * avtomatik GIF'ga qaytadi — kodga tegish shart emas.
 */

const MIN_MS = 1200;
const MAX_MS = 3500;
const FADE_MS = 400;

/*
 * Video manbalari. Brauzer birinchi qo'llab-quvvatlaganini oladi
 * (webm yengilroq, mp4 — iOS uchun kafolat).
 *
 * Shu fayllar public/ ga qo'yilishi bilan splash o'zi videoga
 * o'tadi. Yo'q bo'lsa — GIF.
 */
const VIDEO_SOURCES = [
  { src: '/splash-courier.webm', type: 'video/webm' },
  { src: '/splash-courier.mp4', type: 'video/mp4' },
];

const GIF_SRC = '/splash-courier.gif';

/*
 * Video yo'qligi bir marta aniqlansa, shu sessiyada qayta
 * urinilmaydi — ortiqcha so'rov ketmasin.
 */
let videoUnavailable = false;

export function Splash({ onDone }) {
  const queryClient = useQueryClient();

  const [leaving, setLeaving] = useState(false);
  const [useGif, setUseGif] = useState(videoUnavailable);

  const doneRef = useRef(false);
  const leftRef = useRef(false);
  const prefetchedRef = useRef(false);
  const onDoneRef = useRef(onDone);

  onDoneRef.current = onDone;

  /** Splash yopilishi — faqat bir marta. */
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDoneRef.current?.();
  }, []);

  /** Ketish animatsiyasi, so'ng yopish. */
  const leave = useCallback(() => {
    if (leftRef.current) return;
    leftRef.current = true;
    setLeaving(true);
    setTimeout(finish, FADE_MS);
  }, [finish]);

  /**
   * Bosh sahifa ma'lumotlarini oldindan yuklash.
   *
   * Promise qaytaradi — splash aynan shu tugashini kutadi.
   * `allSettled`: bitta so'rov xato bersa ham qolganini kutamiz
   * va splash baribir yopiladi.
   */
  const prefetch = useCallback(() => {
    if (prefetchedRef.current) return Promise.resolve();
    prefetchedRef.current = true;

    const queries = [
      { queryKey: ['restaurants'], queryFn: ({ signal }) => api.getRestaurants({ signal }) },
      { queryKey: ['dishes', 'trending'], queryFn: ({ signal }) => api.getTrendingDishes({ signal }) },
      // Bosh sahifadagi «Super Chegirmalar» / «Tavsiya qilamiz»
      // qatorlari — HomePage bilan aynan bir xil kalit
      dishFeedQuery({ discounted: true }),
      dishFeedQuery({ discounted: false }),
      { queryKey: ['dishes', 'all'], queryFn: ({ signal }) => api.getAllDishes({ signal }) },
      { queryKey: ['banners'], queryFn: ({ signal }) => api.getBanners({ signal }) },
    ];

    return Promise.allSettled(queries.map((query) => queryClient.prefetchQuery(query)));
  }, [queryClient]);

  useEffect(() => {
    const startedAt = Date.now();
    const timers = [];

    // So'rovlar darhol boshlanadi — media yuklanishini kutmaydi
    prefetch().then(() => {
      // Ma'lumot tayyor: MIN_MS to'lgan bo'lsa darhol, aks holda kutamiz
      const wait = Math.max(0, MIN_MS - (Date.now() - startedAt));
      timers.push(setTimeout(leave, wait));
    });

    // Yuqori chegara — sekin internetda ham ushlab turmaydi
    timers.push(setTimeout(leave, MAX_MS));

    // Favqulodda zaxira: oq ekranda qolib ketmasin
    timers.push(setTimeout(finish, MAX_MS + FADE_MS + 600));

    return () => timers.forEach(clearTimeout);
  }, [prefetch, leave, finish]);

  /** Video topilmadi yoki ochilmadi — GIF'ga qaytamiz. */
  const handleVideoError = useCallback(() => {
    videoUnavailable = true;
    setUseGif(true);
  }, []);

  return (
    <div className={`splash ${leaving ? 'splash--leaving' : ''}`} aria-hidden="true">
      {useGif ? (
        <img
          className="splash__media"
          src={GIF_SRC}
          alt=""
          draggable="false"
          /*
           * fetchPriority — brauzer GIF'ni birinchi navbatda yuklaydi.
           * decoding="async" — dekodlash asosiy oqimni bloklamaydi.
           */
          fetchPriority="high"
          decoding="async"
        />
      ) : (
        <video
          className="splash__media"
          /*
           * poster QO'YILMAYDI: splash-poster.jpg — eski splashning
           * boshqa surati. Video yuklanguncha fon rangi ko'rinadi,
           * u GIF/video foni bilan bir xil.
           */
          autoPlay
          muted
          playsInline
          preload="auto"
          onError={handleVideoError}
        >
          {VIDEO_SOURCES.map((s) => (
            <source key={s.src} src={s.src} type={s.type} onError={handleVideoError} />
          ))}
        </video>
      )}
    </div>
  );
}

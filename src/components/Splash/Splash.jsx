import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import './Splash.css';

const SHOW_MS = 3400;
const FADE_MS = 400;
const HARD_STOP_MS = 6000;

const FIRST_OPEN_KEY = 'lokmago_first_open_done';

export function Splash({ onDone }) {
  const qc = useQueryClient();

  const videoRef = useRef(null);
  const prefetched = useRef(false);
  const onDoneRef = useRef(onDone);

  const [leaving, setLeaving] = useState(false);

  onDoneRef.current = onDone;

  /*
   * Birinchi ochilishda ham video.
   * Keyingi ochilishlarda ham delivery video.
   *
   * Agar keyinchalik birinchi ochilish uchun alohida
   * brand video kerak bo'lsa, shu flagni yana ishlatish mumkin.
   */
  const [isFirstOpen] = useState(() => {
    try {
      return !localStorage.getItem(FIRST_OPEN_KEY);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!isFirstOpen) return;

    try {
      localStorage.setItem(FIRST_OPEN_KEY, '1');
    } catch {
      // localStorage ishlamasa davom etamiz
    }
  }, [isFirstOpen]);

  /*
   * API ma'lumotlarini oldindan yuklash.
   */
  const prefetch = useCallback(() => {
    if (prefetched.current) return;

    prefetched.current = true;

    Promise.allSettled([
      qc.prefetchQuery({
        queryKey: ['restaurants'],
        queryFn: ({ signal }) =>
          api.getRestaurants({ signal }),
      }),

      qc.prefetchQuery({
        queryKey: ['dishes', 'trending'],
        queryFn: ({ signal }) =>
          api.getTrendingDishes({ signal }),
      }),

      qc.prefetchQuery({
        queryKey: ['dishes', 'discounted'],
        queryFn: ({ signal }) =>
          api.getDiscountedDishes({ signal }),
      }),

      qc.prefetchQuery({
        queryKey: ['dishes', 'all'],
        queryFn: ({ signal }) =>
          api.getAllDishes({ signal }),
      }),

      qc.prefetchQuery({
        queryKey: ['banners'],
        queryFn: ({ signal }) =>
          api.getBanners({ signal }),
      }),
    ]);
  }, [qc]);

  /*
   * Splash timer.
   */
  useEffect(() => {
    const leaveTimer = setTimeout(() => {
      setLeaving(true);
    }, SHOW_MS);

    const doneTimer = setTimeout(() => {
      onDoneRef.current();
    }, SHOW_MS + FADE_MS);

    /*
     * Video hali boshlanmagan bo'lsa ham API
     * yuklanishini juda kechiktirmaymiz.
     */
    const guardTimer = setTimeout(() => {
      prefetch();
    }, 700);

    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
      clearTimeout(guardTimer);
    };
  }, [prefetch]);

  /*
   * Qotib qolishdan himoya.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      onDoneRef.current();
    }, HARD_STOP_MS);

    return () => clearTimeout(timer);
  }, []);

  /*
   * Video haqiqatan ijro etila boshlaganda
   * API preload boshlanadi.
   */
  const handlePlaying = () => {
    prefetch();
  };

  /*
   * Video yuklanish xatosi bo'lsa ham splash
   * ilovani bloklamaydi.
   */
  const handleError = () => {
    prefetch();
  };

  return (
    <div
      className={`splash ${leaving ? 'splash--leaving' : ''}`}
    >
      {/* Fon */}
      <div
        className="splash__fill"
        aria-hidden="true"
      />

      {/* Yumshatuvchi qatlam */}
      <div
        className="splash__veil"
        aria-hidden="true"
      />

      {/* Delivery video */}
      <video
        ref={videoRef}
        className="splash__video"
        poster="/splash-poster.jpg"
        autoPlay
        muted
        playsInline
        preload="auto"
        loop={false}
        disablePictureInPicture
        controls={false}
        onPlaying={handlePlaying}
        onError={handleError}
      >
        {/* Avval WebM — Chrome/Android uchun */}
        <source
          src="/LokmaGo_delivery.webm"
          type="video/webm"
        />

        {/* Fallback — Safari/iPhone va boshqalar */}
        <source
          src="/LokmaGo_delivery.mp4"
          type="video/mp4"
        />
      </video>
    </div>
  );
}
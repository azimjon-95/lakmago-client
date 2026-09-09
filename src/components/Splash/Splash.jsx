import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import './Splash.css';

const SHOW_MS = 3400;
const FADE_MS = 400;
const HARD_STOP_MS = 6000;

const FIRST_OPEN_KEY = 'lokmago_first_open_done';

export function Splash({ onDone }) {
  const queryClient = useQueryClient();

  const [leaving, setLeaving] = useState(false);

  const prefetchedRef = useRef(false);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);

  onDoneRef.current = onDone;

  /*
   * Faqat birinchi ochilishni aniqlaymiz.
   * localStorage yozish useEffect ichida bajariladi.
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
      // localStorage mavjud bo'lmasa hech narsa qilmaymiz
    }
  }, [isFirstOpen]);

  /*
   * Splash yopilishini faqat bir marta bajarish.
   */
  const finish = useCallback(() => {
    if (doneRef.current) return;

    doneRef.current = true;
    onDoneRef.current?.();
  }, []);

  /*
   * Ma'lumotlarni oldindan yuklash.
   */
  const prefetch = useCallback(() => {
    if (prefetchedRef.current) return;

    prefetchedRef.current = true;

    const queries = [
      {
        queryKey: ['restaurants'],
        queryFn: ({ signal }) =>
          api.getRestaurants({ signal }),
      },
      {
        queryKey: ['dishes', 'trending'],
        queryFn: ({ signal }) =>
          api.getTrendingDishes({ signal }),
      },
      {
        queryKey: ['dishes', 'discounted'],
        queryFn: ({ signal }) =>
          api.getDiscountedDishes({ signal }),
      },
      {
        queryKey: ['dishes', 'all'],
        queryFn: ({ signal }) =>
          api.getAllDishes({ signal }),
      },
      {
        queryKey: ['banners'],
        queryFn: ({ signal }) =>
          api.getBanners({ signal }),
      },
    ];

    Promise.allSettled(
      queries.map((query) =>
        queryClient.prefetchQuery(query)
      )
    );
  }, [queryClient]);

  /*
   * Splash lifecycle.
   */
  useEffect(() => {
    // API'larni GIF kutmasdan boshlaymiz.
    const prefetchTimer = setTimeout(prefetch, 150);

    // Normal splash tugashi.
    const leaveTimer = setTimeout(() => {
      setLeaving(true);
    }, SHOW_MS);

    const doneTimer = setTimeout(() => {
      finish();
    }, SHOW_MS + FADE_MS);

    // Favqulodda fallback.
    const hardStopTimer = setTimeout(() => {
      finish();
    }, HARD_STOP_MS);

    return () => {
      clearTimeout(prefetchTimer);
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
      clearTimeout(hardStopTimer);
    };
  }, [prefetch, finish]);

return (
  <div
    className={`splash ${
      leaving ? 'splash--leaving' : ''
    }`}
    aria-hidden="true"
  >
    <img
      className="splash__gif"
      src="/splash-courier.gif"
      alt=""
      draggable="false"
    />
  </div>
);
}
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import './Splash.css';

export function Splash({ onDone }) {
  const qc = useQueryClient();
  const videoRef = useRef(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const prefetch = async () => {
      const tasks = [
        qc.prefetchQuery({
          queryKey: ['restaurants'],
          queryFn: ({ signal }) => api.getRestaurants({ signal }),
        }),

        qc.prefetchQuery({
          queryKey: ['dishes', 'trending'],
          queryFn: ({ signal }) => api.getTrendingDishes({ signal }),
        }),

        qc.prefetchQuery({
          queryKey: ['dishes', 'discounted'],
          queryFn: ({ signal }) => api.getDiscountedDishes({ signal }),
        }),

        qc.prefetchQuery({
          queryKey: ['dishes', 'all'],
          queryFn: ({ signal }) => api.getAllDishes({ signal }),
        }),

        qc.prefetchQuery({
          queryKey: ['banners'],
          queryFn: ({ signal }) => api.getBanners({ signal }),
        }),
      ];

      await Promise.allSettled(tasks);
    };

    prefetch();

    // Video sozlamalari
    if (videoRef.current) {
      videoRef.current.volume = 0.10; // 12% ovoz
    }

    // 6 sekund splash
    const leaveTimer = setTimeout(() => {
      setLeaving(true);
    }, 5600);

    const doneTimer = setTimeout(() => {
      onDone();
    }, 6000);

    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
    };
  }, [qc, onDone]);


  return (
    <div className={`splash ${leaving ? 'splash--leaving' : ''}`}>
      <video
        ref={videoRef}
        className="splash__video"
        src="/gif_yasab_ber.mp4"
        autoPlay
        playsInline
        preload="auto"
      />
    </div>
  );
}
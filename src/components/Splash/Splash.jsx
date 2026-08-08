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

    if (videoRef.current) {
      videoRef.current.volume = 0.1;
    }

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
      {/* Fon — videoning xira/soya nusxasi */}
      <video
        className="splash__background"
        src="/splash.mp4"
        autoPlay
        muted
        loop
        playsInline
      />

      {/* Asosiy video — o'z razmerida */}
      <video
        ref={videoRef}
        className="splash__video"
        src="/splash.mp4"
        autoPlay
        playsInline
      />
    </div>
  );
}
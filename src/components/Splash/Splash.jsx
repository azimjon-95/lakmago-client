import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import './Splash.css';

// ============================================================
//  SPLASH SCREEN — 3 soniyalik logo animatsiyasi
// ------------------------------------------------------------
//  Ilova ochilганда:
//    1) Logo qismlari chiroyли yig'iladi (plastinka, qo'l, bug', "Lakma")
//    2) "Go" alohида o'ngдан uchib keladi
//    3) Shu 3 soniya ичida serverdan datalar OLDINDAN yuklanadi (prefetch)
//    4) Tugagach — main page tayyor ma'lumot bilan ochiladi
// ============================================================
export function Splash({ onDone }) {
  const qc = useQueryClient();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // 3 soniya ичида server datalarини oldindan yuklaймиз (cache'ga)
    const prefetch = async () => {
      const tasks = [
        qc.prefetchQuery({ queryKey: ['restaurants'], queryFn: ({ signal }) => api.getRestaurants({ signal }) }),
        qc.prefetchQuery({ queryKey: ['dishes', 'trending'], queryFn: ({ signal }) => api.getTrendingDishes({ signal }) }),
        qc.prefetchQuery({ queryKey: ['dishes', 'discounted'], queryFn: ({ signal }) => api.getDiscountedDishes({ signal }) }),
        qc.prefetchQuery({ queryKey: ['dishes', 'all'], queryFn: ({ signal }) => api.getAllDishes({ signal }) }),
        qc.prefetchQuery({ queryKey: ['banners'], queryFn: ({ signal }) => api.getBanners({ signal }) }),
      ];
      // Xato bo'lsa ham splash to'xtamaydi (main page o'zi qayta urinadi)
      await Promise.allSettled(tasks);
    };
    prefetch();

    // 3 soniyalik splash: 2.6s ko'rsatamiz + 0.4s chiqish animatsiyasi
    const leaveTimer = setTimeout(() => setLeaving(true), 2600);
    const doneTimer = setTimeout(() => onDone(), 3000);
    return () => { clearTimeout(leaveTimer); clearTimeout(doneTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`splash ${leaving ? 'splash--leaving' : ''}`}>
      <div className="splash__logo">
        <svg viewBox="0 0 100 100" width="140" height="140" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="lg-orange" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#FFB23E"/>
              <stop offset="1" stop-color="#F5751A"/>
            </linearGradient>
          </defs>

          {/* Bug' (steam) — yuqorida, ohista chiqadi */}
          <g className="sp-steam" fill="none" stroke="url(#lg-orange)" stroke-width="2.4" stroke-linecap="round">
            <path d="M46 20 q-3 -4 0 -8 q3 -4 0 -8" />
            <path d="M53 20 q-3 -4 0 -8 q3 -4 0 -8" />
          </g>

          {/* Tezlik chiziqlari (chapда) */}
          <g className="sp-speed" stroke="url(#lg-orange)" stroke-width="3.4" stroke-linecap="round">
            <line x1="8" y1="42" x2="20" y2="42" />
            <line x1="4" y1="49" x2="18" y2="49" />
            <line x1="9" y1="56" x2="22" y2="56" />
          </g>

          {/* Qopqoq (cloche) — yuqoridан tushadi */}
          <g className="sp-dome">
            <circle cx="50" cy="27" r="2.6" fill="url(#lg-orange)" />
            <path d="M28 52 a22 22 0 0 1 44 0 z" fill="url(#lg-orange)" />
            <path d="M34 46 a16 16 0 0 1 13 -12" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.9"/>
          </g>

          {/* Plastinka (tray) — qopqoq ostига */}
          <rect className="sp-tray" x="26" y="53" width="48" height="4.5" rx="2.2" fill="#26262C" />

          {/* Qo'l (hand) — pastдан chiqadi */}
          <path className="sp-hand" d="M30 60 q10 10 24 8 q10 -1 16 -6 q-8 12 -22 12 q-14 0 -20 -8 q-2 -4 2 -6 z" fill="#26262C" />
          <rect className="sp-hand" x="27" y="62" width="7" height="11" rx="2" fill="url(#lg-orange)" transform="rotate(-32 30 67)" />
        </svg>

        {/* Matn: Lakma + Go */}
        <div className="splash__text">
          <span className="sp-lakma">Lakma</span><span className="sp-go">Go</span>
        </div>
        <div className="splash__tagline">BUYURTMA · BRON · DOSTAVKA</div>
      </div>
    </div>
  );
}

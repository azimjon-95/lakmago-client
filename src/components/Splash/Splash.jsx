import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import './Splash.css';

export function Splash({ onDone }) {
  const qc = useQueryClient();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const prefetch = async () => {
      const tasks = [
        qc.prefetchQuery({ queryKey: ['restaurants'], queryFn: ({ signal }) => api.getRestaurants({ signal }) }),
        qc.prefetchQuery({ queryKey: ['dishes', 'trending'], queryFn: ({ signal }) => api.getTrendingDishes({ signal }) }),
        qc.prefetchQuery({ queryKey: ['dishes', 'discounted'], queryFn: ({ signal }) => api.getDiscountedDishes({ signal }) }),
        qc.prefetchQuery({ queryKey: ['dishes', 'all'], queryFn: ({ signal }) => api.getAllDishes({ signal }) }),
        qc.prefetchQuery({ queryKey: ['banners'], queryFn: ({ signal }) => api.getBanners({ signal }) }),
      ];
      await Promise.allSettled(tasks);
    };
    prefetch();

    const leaveTimer = setTimeout(() => setLeaving(true), 2600);
    const doneTimer = setTimeout(() => onDone(), 3000);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(doneTimer);
    };
  }, [qc, onDone]);

  return (
    <div className={`splash ${leaving ? 'splash--leaving' : ''}`}>
      <div className="splash__content">
        {/* Orqa fon uchun markaziy zarxal zarrachalar va nur */}
        <div className="splash__bg-glow" />
        <div className="splash__floor-glow" />

        <div className="splash__logo-container">
          <svg
            className="splash__svg"
            viewBox="0 0 240 200"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Qopqoq / Qo'l yengi gradiyenti */}
              <linearGradient id="orange-3d" x1="0.2" y1="0" x2="0.8" y2="1">
                <stop offset="0%" stopColor="#FFE082" />
                <stop offset="35%" stopColor="#FF9800" />
                <stop offset="85%" stopColor="#E65100" />
                <stop offset="100%" stopColor="#8D2600" />
              </linearGradient>

              {/* Tarelka / Podnos va Qo'lqop gradiyenti */}
              <linearGradient id="dark-gloss" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#424242" />
                <stop offset="50%" stopColor="#1A1A1A" />
                <stop offset="100%" stopColor="#050505" />
              </linearGradient>

              {/* Oltin/Olov rangli tezlik chiziqlari */}
              <linearGradient id="speed-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#FFCC80" stopOpacity="0.2" />
                <stop offset="70%" stopColor="#FFA726" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#FFE082" stopOpacity="1" />
              </linearGradient>

              {/* Bug' (Steam) gradiyenti */}
              <linearGradient id="steam-grad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#FFA726" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#FFCC80" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </linearGradient>

              {/* Qopqoq Nur / Yo'l nur filtri */}
              <filter id="glow-heavy" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* ===== BUG' (STEAM) ===== */}
            <g className="sp-steam" filter="url(#glow-heavy)">
              <path
                d="M115 52 C 108 42, 125 32, 116 20 C 110 12, 122 5, 118 0"
                fill="none"
                stroke="url(#steam-grad)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                d="M125 54 C 120 45, 134 35, 127 24 C 122 16, 132 8, 129 2"
                fill="none"
                stroke="url(#steam-grad)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </g>

            {/* ===== TEZLIK CHIZIQLARI (CHAPDA) ===== */}
            <g className="sp-speed" filter="url(#glow-heavy)">
              <rect x="25" y="70" width="55" height="7" rx="3.5" fill="url(#speed-grad)" />
              <rect x="15" y="86" width="60" height="9" rx="4.5" fill="url(#speed-grad)" />
              <rect x="32" y="102" width="48" height="7" rx="3.5" fill="url(#speed-grad)" />
            </g>

            {/* ===== QOPQOQ (CLOCHE) ===== */}
            <g className="sp-dome">
              {/* Yuqori sharik (knob) */}
              <circle cx="120" cy="56" r="6" fill="url(#orange-3d)" filter="url(#glow-heavy)" />
              <circle cx="120" cy="56" r="3" fill="#FFE082" />
              <path d="M116 60 H124 V63 H116 Z" fill="#E65100" />

              {/* Asosiy Qopqoq (Kupol) */}
              <path
                d="M75 106 C75 70, 165 70, 165 106 Z"
                fill="url(#orange-3d)"
                filter="url(#glow-heavy)"
              />
              {/* Qopqoq ustidagi Yaltiroq Nur (Highlight) */}
              <path
                d="M90 98 C95 80, 130 76, 145 80 C130 77, 98 84, 90 98 Z"
                fill="#FFFFFF"
                opacity="0.55"
              />

              {/* Qopqoqning pastki cheti (Rim) */}
              <path
                d="M70 106 C 70 102, 170 102, 170 106 L 167 111 C 167 111, 73 111, 73 111 Z"
                fill="url(#orange-3d)"
              />
            </g>

            {/* ===== TARELKA / PODNOS (TRAY) ===== */}
            <g className="sp-tray">
              {/* Tarelka asosi */}
              <path
                d="M62 112 H178 C182 112, 184 116, 180 119 L172 124 C170 125, 70 125, 68 124 L60 119 C56 116, 58 112, 62 112 Z"
                fill="url(#dark-gloss)"
                stroke="#FF9800"
                strokeWidth="0.8"
              />
              {/* Tarelka ostidagi Apelsin Nur Konturi */}
              <path
                d="M66 122 Q120 128 174 122"
                fill="none"
                stroke="#FF9800"
                strokeWidth="2.5"
                filter="url(#glow-heavy)"
              />
            </g>

            {/* ===== QO'L (HAND & SLEEVE) ===== */}
            <g className="sp-hand">
              {/* Qora Gloss Qo'lqop */}
              <path
                d="M100 130 C115 130, 148 122, 158 132 C162 136, 150 148, 138 154 C120 162, 102 152, 94 142 Z"
                fill="url(#dark-gloss)"
                stroke="#555"
                strokeWidth="0.5"
              />
              {/* Bosh barmoq va kaft burmasi */}
              <path
                d="M138 130 C145 130, 154 135, 148 141 C140 146, 130 142, 122 136 Z"
                fill="#1A1A1A"
              />

              {/* Apelsin rang Manshet / Yeng */}
              <rect
                x="80"
                y="142"
                width="22"
                height="32"
                rx="6"
                fill="url(#orange-3d)"
                transform="rotate(-35 91 158)"
                filter="url(#glow-heavy)"
              />
              {/* Manshet Knopkasi */}
              <circle cx="81" cy="158" r="2.5" fill="#FFFFFF" opacity="0.9" />
            </g>
          </svg>

          {/* ===== MATN LOKMAGO ===== */}
          <div className="splash__text">
            <span className="sp-lokma">Lokma</span>
            <span className="sp-go">
              Go
              <span className="sp-go-blur">Go</span>
            </span>
          </div>

          {/* ===== TAGLINE ===== */}
          <div className="splash__tagline">
            <span className="sp-line">BUYURTMA</span>
            <span className="sp-dot">•</span>
            <span className="sp-line">BRON</span>
            <span className="sp-dot">•</span>
            <span className="sp-line">DOSTAVKA</span>
          </div>
        </div>
      </div>
    </div>
  );
}
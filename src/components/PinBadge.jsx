import { useId } from 'react';

/*
 * Kichik REAL (vektor) pin — kanselyar knopkasi (push pin / thumbtack):
 * yumshoq gradientli bosh, korpus, tag-plastinka va po'lat igna, ~40° qiyalikda
 * (kartaga "qadalgan" ko'rinish). Rasm emas, emoji emas — SVG: har qanday
 * ekranda o'tkir, bir necha baytga teng.
 *
 * Gradient id'lari `useId` bilan noyob: ro'yxatda o'nlab karta bor, takroriy id
 * brauzerni adashtirmasin.
 */
export function PinBadge({ label = '' }) {
  const uid = useId().replace(/:/g, '');
  const head = `pb-head-${uid}`;
  const body = `pb-body-${uid}`;
  const metal = `pb-metal-${uid}`;

  return (
    <span className="pinbadge" role="img" aria-label={label} title={label}>
      <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={head} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FF9A57" />
            <stop offset="1" stopColor="#F2610F" />
          </linearGradient>
          <linearGradient id={body} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#FF6A1A" />
            <stop offset="0.55" stopColor="#E85500" />
            <stop offset="1" stopColor="#B83F00" />
          </linearGradient>
          <linearGradient id={metal} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#D9DDE2" />
            <stop offset="1" stopColor="#8E959D" />
          </linearGradient>
        </defs>
        <g transform="rotate(38 12 12)">
          {/* igna */}
          <path d="M12 12.6 L12.9 12.6 L12.3 22.2 Q12 22.8 11.7 22.2 L11.1 12.6 Z" fill={`url(#${metal})`} />
          {/* tag-plastinka */}
          <rect x="6.4" y="10.2" width="11.2" height="2.7" rx="1.35" fill={`url(#${body})`} />
          {/* korpus */}
          <path d="M9 4.9 H15 L14.2 10.3 H9.8 Z" fill={`url(#${body})`} />
          {/* bosh */}
          <rect x="7.6" y="2" width="8.8" height="3.4" rx="1.7" fill={`url(#${head})`} />
          {/* yaltiroq chiziq */}
          <path d="M10.2 5.6 L10.7 9.7" stroke="#fff" strokeOpacity="0.45" strokeWidth="0.9" strokeLinecap="round" />
          <path d="M9.3 3.1 H12.4" stroke="#fff" strokeOpacity="0.55" strokeWidth="0.8" strokeLinecap="round" />
        </g>
      </svg>
    </span>
  );
}

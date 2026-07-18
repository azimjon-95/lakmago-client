// Dispetcher (qo'llab-quvvatlash operatori) avatarи — real SVG.
// Emoji emas: chiroyли, brendга mos, har qanaqa ekranда aniq ko'rinadi.
export function OperatorAvatar({ size = 56, online = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <clipPath id="op-clip"><circle cx="32" cy="32" r="32" /></clipPath>
        <linearGradient id="op-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FAC775" />
          <stop offset="100%" stopColor="#EF9F27" />
        </linearGradient>
      </defs>

      <g clipPath="url(#op-clip)">
        {/* Fon */}
        <rect width="64" height="64" fill="url(#op-bg)" />

        {/* Yelka / kiyim */}
        <path d="M8 64c0-12 10.7-19 24-19s24 7 24 19H8z" fill="#2C1400" />
        <path d="M26 46c2 4 10 4 12 0l-2-4h-8l-2 4z" fill="#F0C9A0" />

        {/* Bo'yin */}
        <rect x="28" y="36" width="8" height="10" rx="4" fill="#F0C9A0" />

        {/* Yuz */}
        <ellipse cx="32" cy="27" rx="12" ry="13.5" fill="#FBDCBC" />

        {/* Soch (qiz — uzun) */}
        <path d="M32 11c-8.2 0-13 5.4-13 13 0 3 .6 5.4 1.4 7.2.5-4 1.2-6.6 2-8.2 4.4 2 15.4 2.4 20.4-1.6.6 2 1 5.4 1.2 9.8.9-1.9 1.5-4.3 1.5-7.2 0-7.6-5.3-13-13.5-13z" fill="#3A2418" />
        <path d="M19.5 24c-2.2 1-3.5 3.6-3.5 7 0 4 1.6 7.6 3.5 9.5-1-5.4-1-11.4 0-16.5z" fill="#3A2418" />
        <path d="M44.5 24c2.2 1 3.5 3.6 3.5 7 0 4-1.6 7.6-3.5 9.5 1-5.4 1-11.4 0-16.5z" fill="#3A2418" />

        {/* Ko'zlar */}
        <ellipse cx="27" cy="27" rx="1.6" ry="2" fill="#2C1810" />
        <ellipse cx="37" cy="27" rx="1.6" ry="2" fill="#2C1810" />
        {/* Qosh */}
        <path d="M24.5 23.5c1.4-.9 3.4-.9 4.8 0" stroke="#2C1810" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M34.7 23.5c1.4-.9 3.4-.9 4.8 0" stroke="#2C1810" strokeWidth="1.2" strokeLinecap="round" />
        {/* Tabassum */}
        <path d="M28.5 32.5c1.8 1.8 5.2 1.8 7 0" stroke="#C2683F" strokeWidth="1.5" strokeLinecap="round" />

        {/* Garnitura (dispetcher belgisi) */}
        <path d="M19 27a13 13 0 0 1 26 0" stroke="#1A1A1E" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <rect x="16.5" y="26" width="5" height="8.5" rx="2.5" fill="#1A1A1E" />
        <rect x="42.5" y="26" width="5" height="8.5" rx="2.5" fill="#1A1A1E" />
        {/* Mikrofon */}
        <path d="M19 34.5v3.5c0 2.2 1.8 4 4 4h3" stroke="#1A1A1E" strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle cx="27" cy="42" r="2.2" fill="#1A1A1E" />
      </g>

      {/* Onlayn belgisi */}
      {online && (
        <>
          <circle cx="52" cy="52" r="9" fill="#1A1A1E" />
          <circle cx="52" cy="52" r="6" fill="#5DCAA5" />
        </>
      )}
    </svg>
  );
}

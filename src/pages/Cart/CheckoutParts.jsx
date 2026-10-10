import { Icon } from '@/components/Icon';

/*
 * SAVAT — buyurtma bo'limlari uchun TAQDIMOT komponentlari (faqat ko'rinish).
 * Holat, shartlar va bosish mantiqi CartPage'da qoladi — bu yerda hech qanday biznes mantiq yo'q.
 */

/**
 * Sarlavha belgilari — dizaynda TO'LDIRILGAN to'q sariq (chiziqli Lucide emas).
 * Oq tafsilotlar ("teshik", qo'l) belgi ichida chiziladi.
 */
function HeadIcon({ name }) {
  const brand = 'var(--brand)';
  const common = { width: 24, height: 24, viewBox: '0 0 24 24', 'aria-hidden': 'true', style: { flexShrink: 0 } };
  switch (name) {
    case 'bag': // buyurtma turi
      return (
        <svg {...common}>
          <path d="M6.2 8h11.6a1 1 0 0 1 1 .92l.9 11a1.6 1.6 0 0 1-1.6 1.73H5.9a1.6 1.6 0 0 1-1.6-1.73l.9-11A1 1 0 0 1 6.2 8z" fill={brand} />
          <path d="M8.6 8V7a3.4 3.4 0 0 1 6.8 0v1" fill="none" stroke={brand} strokeWidth="2" strokeLinecap="round" />
          <path d="M9.2 12.2a2.8 2.8 0 0 0 5.6 0" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      );
    case 'clock': // qachon
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10.2" fill={brand} />
          <path d="M12 6.6V12l3.6 2.1" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'pin': // manzil
      return (
        <svg {...common}>
          <path d="M12 22.3s7.4-6.5 7.4-12.4a7.4 7.4 0 1 0-14.8 0c0 5.9 7.4 12.4 7.4 12.4z" fill={brand} />
          <circle cx="12" cy="9.8" r="2.7" fill="#fff" />
        </svg>
      );
    case 'phone': // bog'lanish
      return (
        <svg {...common}>
          <path d="M21.5 16.9v2.9a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 1.6 4.1 2 2 0 0 1 3.6 2h2.9a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L7.5 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.9 2z" fill={brand} stroke={brand} strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      );
    case 'wallet': // to'lov
      return (
        <svg {...common}>
          <path d="M5 3.6h12.6A1.4 1.4 0 0 1 19 5v2H5.2A2 2 0 0 1 5 3.6z" fill={brand} opacity="0.75" />
          <rect x="2" y="6" width="20" height="15" rx="3.2" fill={brand} />
          <path d="M16.2 11.4H22v5.2h-5.8a2.6 2.6 0 0 1 0-5.2z" fill="#fff" />
          <circle cx="17.2" cy="14" r="1.15" fill={brand} />
        </svg>
      );
    default:
      return <Icon name={name} size={22} color={brand} />;
  }
}

/** Oq karta: tepada belgi + sarlavha, ichida kontent. */
export function CoCard({ icon, title, warn = false, className = '', children }) {
  return (
    <section className={`co-card ${warn ? 'co-card--warn' : ''} ${className}`}>
      <h3 className="co-card__head">
        <HeadIcon name={icon} />
        <span>{title}</span>
      </h3>
      {children}
    </section>
  );
}

/** Tanlangan holat belgisi (to'ldirilgan doira + oq galochka). */
export function CheckBadge({ className = '' }) {
  return (
    <span className={`co-check ${className}`} aria-hidden="true">
      <Icon name="check" size={13} color="#fff" strokeWidth={3.2} />
    </span>
  );
}

/** Variant kartasi (buyurtma turi, to'lov usuli). */
export function CoOption({ active, disabled, locked = false, onClick, media, title, sub, testId }) {
  // locked — tanlab bo'lmaydi, lekin BOSILADI (sababini ko'rsatish uchun): naqd o'chirilgan mijoz
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-disabled={locked || undefined}
      data-testid={testId}
      className={`co-opt ${active ? 'is-active' : ''} ${disabled ? 'is-disabled' : ''} ${locked ? 'is-locked' : ''}`}
    >
      {locked && <span className="co-opt__lock" aria-hidden="true">🔒</span>}
      <span className="co-opt__media">{media}</span>
      <span className="co-opt__body">
        <span className="co-opt__title">{title}</span>
        {sub ? <span className="co-opt__sub">{sub}</span> : null}
      </span>
      {active && <CheckBadge className="co-opt__check" />}
    </button>
  );
}

/** Yetkazib berish belgisi: to'q sariq doira ichida oq skuter. */
export function ScooterBadge() {
  return (
    <span className="co-scooter">
      <Icon name="scooter" size={26} color="#fff" strokeWidth={2.1} />
    </span>
  );
}

/** Naqd pul — yashil banknotalar dastasi (SVG, rasm fayli kerak emas). */
export function CashArt() {
  return (
    <svg width="46" height="38" viewBox="0 0 46 38" aria-hidden="true">
      <defs>
        <linearGradient id="co-cash-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#B7E3A5" /><stop offset="1" stopColor="#7DBB63" />
        </linearGradient>
        <linearGradient id="co-cash-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#D5F0C6" /><stop offset="1" stopColor="#9BD083" />
        </linearGradient>
      </defs>
      <rect x="3" y="14" width="38" height="20" rx="3.2" fill="#5E9C47" transform="rotate(-5 22 24)" />
      <rect x="4" y="10" width="38" height="20" rx="3.2" fill="url(#co-cash-a)" stroke="#5E9C47" strokeWidth="1" transform="rotate(-2 23 20)" />
      <rect x="5" y="6" width="38" height="20" rx="3.2" fill="url(#co-cash-b)" stroke="#5E9C47" strokeWidth="1" />
      <circle cx="24" cy="16" r="6" fill="#7DBB63" stroke="#4F8A39" strokeWidth="1" />
      <text x="24" y="19.6" textAnchor="middle" fontSize="9" fontWeight="800" fill="#2F5F1F" fontFamily="system-ui, sans-serif">$</text>
      <circle cx="10.5" cy="16" r="1.6" fill="#7DBB63" /><circle cx="37.5" cy="16" r="1.6" fill="#7DBB63" />
    </svg>
  );
}

/** Plastik karta — oltin-ko'k gradient, chip va chiziq (SVG). */
export function CardArt() {
  return (
    <svg width="46" height="38" viewBox="0 0 46 38" aria-hidden="true">
      <defs>
        <linearGradient id="co-card-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F6E3A6" /><stop offset="0.55" stopColor="#E7C874" /><stop offset="1" stopColor="#C99B3E" />
        </linearGradient>
      </defs>
      <rect x="3" y="6" width="40" height="27" rx="4.5" fill="#00000014" transform="translate(0 1.5)" />
      <rect x="3" y="5" width="40" height="27" rx="4.5" fill="url(#co-card-a)" stroke="#B88B30" strokeWidth="1" />
      <rect x="3" y="10.5" width="40" height="5.2" fill="#3C4F7A" opacity="0.88" />
      <rect x="7" y="19.5" width="9" height="6.5" rx="1.6" fill="#F4F1E6" stroke="#B88B30" strokeWidth="0.8" />
      <rect x="20" y="22" width="14" height="1.8" rx="0.9" fill="#8A6A22" opacity="0.55" />
      <rect x="20" y="25.4" width="9" height="1.8" rx="0.9" fill="#8A6A22" opacity="0.45" />
    </svg>
  );
}

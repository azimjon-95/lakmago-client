import { RestaurantBanner } from '@/components/DishPhoto';
import { monogram, nameFontSize } from '@/lib/restaurantUi';
import './RestaurantHeader.css';

/*
 * RESTORAN / DO'KON SAHIFASI — YAGONA SARLAVHA DIZAYNI (hamma restoranda bir xil).
 *   Muqova (+ orqaga · sevimli · ma'lumot)  →  oq varaq: belgi, NOM, tasdiq, tur, holat/ish vaqti
 *   →  statistika kartasi  →  "Stol bron qilish" banneri.
 * Hammasi restoranning O'Z ma'lumotidan (nom, tur, soat, reyting...); rang bo'limga qarab: Go — to'q sariq, Market — yashil.
 */

const S = ({ children, size = 20, sw = 2, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>{children}</svg>
);
export const IcoBack = () => <S size={20} sw={2.4}><path d="M19 12H5M11 6l-6 6 6 6" /></S>;
export const IcoHeart = ({ filled }) => <S size={19} sw={2.2} fill={filled ? 'currentColor' : 'none'}><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.3 5 6.4 5c1.9 0 3.5 1 4.3 2.4h.6C12.1 6 13.7 5 15.6 5c3.1 0 4.9 3 3.7 6.3C19.5 15.9 12 20.5 12 20.5z" /></S>;
export const IcoDots = () => <S size={20} sw={0}><circle cx="12" cy="5" r="1.9" fill="currentColor" /><circle cx="12" cy="12" r="1.9" fill="currentColor" /><circle cx="12" cy="19" r="1.9" fill="currentColor" /></S>;
const IcoPin = () => <S size={16} sw={2}><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.4" /></S>;
const IcoClock = ({ size = 17 }) => <S size={size} sw={2}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></S>;
const IcoChevDown = () => <S size={16} sw={2.4}><path d="M6 9l6 6 6-6" /></S>;
const IcoChevRight = () => <S size={18} sw={2.8}><path d="M9 5l7 7-7 7" /></S>;
const IcoStar = () => <S size={22} sw={2}><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></S>;
const IcoNav = () => <S size={22} sw={2}><path d="M12 3l7.5 17.5L12 16l-7.5 4.5z" /></S>;
const IcoInfo = () => <S size={22} sw={2}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></S>;
const IcoClockBig = () => <IcoClock size={22} />;
const IcoCalPlus = () => <S size={22} sw={2}><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17M12 13v5M9.5 15.5h5" /></S>;

const VerifiedBadge = ({ label }) => (
  <svg className="rp-verified" width="22" height="22" viewBox="0 0 24 24" role="img" aria-label={label}>
    <path d="M12 1.8l2.5 1.7 3-.3 1.3 2.7 2.7 1.3-.3 3L22.9 12l-1.7 2.5.3 3-2.7 1.3-1.3 2.7-3-.3L12 22.9l-2.5-1.7-3 .3-1.3-2.7-2.7-1.3.3-3L1.1 12l1.7-2.5-.3-3 2.7-1.3 1.3-2.7 3 .3z" fill="#1FA55B" />
    <path d="M7.6 12.2l3 3 5.8-6.2" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function RestaurantHero({ restaurant, isFav, onBack, onFav, onMore, backLabel, moreLabel }) {
  return (
    <div className="rp-hero">
      <RestaurantBanner restaurant={restaurant} height={216} />
      <div className="rp-hero__shade" aria-hidden="true" />
      <button type="button" className="rp-hbtn rp-hbtn--back" onClick={onBack} aria-label={backLabel}><IcoBack /></button>
      <div className="rp-hero__right">
        <button type="button" className={`rp-hbtn${isFav ? ' is-fav' : ''}`} onClick={onFav} aria-pressed={isFav} aria-label="♥"><IcoHeart filled={isFav} /></button>
        <button type="button" className="rp-hbtn" onClick={onMore} aria-label={moreLabel}><IcoDots /></button>
      </div>
    </div>
  );
}

export function RestaurantIdentity({ restaurant, isOpen, offToday, hoursLabel, onHours, t }) {
  const logo = restaurant.logoUrl || restaurant.logo;
  const status = isOpen ? t('restOpenNow') : (offToday ? t('restOffToday') : t('restClosedNow'));
  return (
    <div className="rp-id" data-testid="rp-identity">
      <div className="rp-logo" aria-hidden="true">
        {logo && String(logo).startsWith('http')
          ? <img src={logo} alt="" loading="lazy" decoding="async" />
          : <span className="rp-logo__mono">{monogram(restaurant.name)}</span>}
      </div>
      <div className="rp-id__main">
        <h1 className="rp-name" style={{ fontSize: nameFontSize(restaurant.name) }}>
          <span className="rp-name__t">{restaurant.name}</span><VerifiedBadge label={t('restVerified')} />
        </h1>
        {restaurant.cuisine && <div className="rp-cuisine"><IcoPin /><span>{restaurant.cuisine}</span></div>}
        <div className="rp-pills">
          <span className={`rp-status ${isOpen ? 'is-open' : 'is-closed'}`} data-testid="rp-status"><i />{status}</span>
          {hoursLabel && (
            <button type="button" className="rp-hours" onClick={onHours} data-testid="rp-hours">
              <IcoClock /><span>{hoursLabel}</span><IcoChevDown />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** items: [{ key, tone, icon, value, label, onClick? }] — 3-4 ustun, bo'lmagan ma'lumot ustuni chizilmaydi */
export function RestaurantStats({ items }) {
  const ico = { time: <IcoClockBig />, star: <IcoStar />, nav: <IcoNav />, info: <IcoInfo /> };
  return (
    <div className="rp-stats" style={{ '--n': items.length }} data-testid="rp-stats">
      {items.map((it) => {
        const Tag = it.onClick ? 'button' : 'div';
        return (
          <Tag key={it.key} type={it.onClick ? 'button' : undefined} className={`rp-stat rp-stat--${it.tone}`} onClick={it.onClick}>
            <span className="rp-stat__ico">{ico[it.icon]}</span>
            <span className="rp-stat__val">{it.value}</span>
            <span className={`rp-stat__lbl${it.accentLabel ? ' is-accent' : ''}`}>{it.label}</span>
          </Tag>
        );
      })}
    </div>
  );
}

export function ReserveBanner({ label, onClick }) {
  return (
    <button type="button" className="rp-reserve" onClick={onClick} data-testid="rp-reserve">
      <picture className="rp-reserve__pic" aria-hidden="true">
        <source srcSet="/restaurant/reserve-table.webp" type="image/webp" />
        <img src="/restaurant/reserve-table.png" alt="" loading="lazy" decoding="async" draggable="false" />
      </picture>
      <span className="rp-reserve__label"><IcoCalPlus /><b>{label}</b></span>
      <span className="rp-reserve__go" aria-hidden="true"><IcoChevRight /></span>
    </button>
  );
}

import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../Icon';
import { useCart } from '@/store/cart';
import { useUser } from '@/store/user';
import { useT } from '@/i18n';
import { useSection } from '@/store/section';
import './BottomNav.css';

const tabs = [
  { path: '/', icon: 'home', key: 'navHome' },
  { path: '/search', icon: 'search', key: 'navSearch' },
  { path: '/orders', icon: 'bag', key: 'navOrders' },
  { path: '/profile', icon: 'user', key: 'navProfile' },
];

/*
 * Pastki menyu — Instagram uslubidagi suzuvchi shisha kapsula (floating-nav.css). Faqat ikonkalar (nomi aria-label'da),
 * faol tab ortida silliq suriluvchi yumshoq "pill"; rang bo'limga qarab (Go — to'q sariq, Market — yashil).
 * To'yxonalar bo'limi alohida saytda — u uchun bir xil dizayn paketi: docs/wedding-floating-nav/.
 */
/*
 * --bottom-nav-h = menyu egallagan balandlik XAVFSIZ ZONASIZ (iste'molchilar unga `+ var(--tg-bottom-offset)` qo'shadi):
 * 6 (tepa) + 58 (kapsula) + max(10, zona + 2) (past) − zona.  Zona 20 px → 66 px; zona 0 → 74 px.
 */
export const BOTTOM_NAV_H = 'calc(6px + 58px + max(10px, calc(var(--tg-bottom-offset, 0px) + 2px)) - var(--tg-bottom-offset, 0px))';

export function BottomNav() {
  // Pastki menyu bor-yo'qligini bildiramiz. Savat paneli shu qiymatga
  // tayanadi — menyusiz sahifada (restoran, savat) pastga tushadi.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--bottom-nav-h', BOTTOM_NAV_H);
    return () => root.style.setProperty('--bottom-nav-h', '0px');
  }, []);

  const { pathname } = useLocation();
  const navigate = useNavigate();
  const t = useT();
  const cartCount = useCart((s) => s.totalCount());
  // Profil uchun Telegram rasmi — bo'lmasa ikonka ko'rsatiladi
  const photoUrl = useUser((st) => st.user.photoUrl);
  // Market'da "Bosh" — Market bosh sahifasi (Lokma Go'ga tashlab yubormaydi)
  const market = useSection((s) => s.section === 'market');
  const homePath = market ? '/market' : '/';
  const targetOf = (tab) => (tab.path === '/' ? homePath : tab.path);
  const activeIndex = tabs.findIndex((tab) => pathname === targetOf(tab));

  return (
    <nav className="bottom-nav" aria-label="Lokma">
      <div className="fnav" style={{ '--fn-i': Math.max(activeIndex, 0), '--fn-n': tabs.length }} data-active={activeIndex >= 0 ? 'true' : 'false'} data-testid="floating-nav">
        <span className="fnav__pill" aria-hidden="true" />
        {tabs.map((tab, i) => {
          const active = i === activeIndex;
          const label = t(tab.key);
          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => navigate(targetOf(tab))}
              className={`fnav__tab ${active ? 'is-active' : ''}`}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              title={label}
              data-testid={`fnav-${tab.icon}`}
            >
              <span className="fnav__ic">
                {tab.path === '/profile' && photoUrl ? (
                  <img src={photoUrl} alt="" className="fnav__photo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <Icon name={tab.icon} size={26} strokeWidth={active ? 2.3 : 1.9} />
                )}
                {tab.path === '/orders' && cartCount > 0 && <span className="fnav__badge">{cartCount > 99 ? '99+' : cartCount}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

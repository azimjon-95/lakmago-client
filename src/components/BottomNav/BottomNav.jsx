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

export function BottomNav() {
  // Pastki menyu bor-yo'qligini bildiramiz. Savat paneli shu qiymatga
  // tayanadi — menyusiz sahifada (restoran, savat) pastga tushadi.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--bottom-nav-h', '62px');
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

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const target = tab.path === '/' ? homePath : tab.path;
        const active = pathname === target;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(target)}
            className={`bottom-nav__tab ${active ? 'is-active' : ''}`}
          >
            {tab.path === '/profile' && photoUrl ? (
              <img
                src={photoUrl}
                alt=""
                className="bottom-nav__photo"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <Icon name={tab.icon} size={22} />
            )}
            <span>{t(tab.key)}</span>
            {tab.path === '/orders' && cartCount > 0 && (
              <span className="bottom-nav__badge">{cartCount}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

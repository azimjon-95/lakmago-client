import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../Icon';
import { useCart } from '@/store/cart';
import { useT } from '@/i18n';
import './BottomNav.css';

const tabs = [
  { path: '/', icon: 'home', key: 'navHome' },
  { path: '/search', icon: 'search', key: 'navSearch' },
  { path: '/orders', icon: 'bag', key: 'navOrders' },
  { path: '/favorites', icon: 'heart', key: 'navProfile' },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const t = useT();
  const cartCount = useCart((s) => s.totalCount());

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const active = pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`bottom-nav__tab ${active ? 'is-active' : ''}`}
          >
            <Icon name={tab.icon} size={22} />
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

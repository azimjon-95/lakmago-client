import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { useCart } from '@/store/cart';

const tabs = [
  { path: '/', icon: 'home', label: 'Bosh' },
  { path: '/search', icon: 'search', label: 'Qidirish' },
  { path: '/orders', icon: 'bag', label: 'Buyurtmalar' },
  { path: '/favorites', icon: 'heart', label: 'Sevimli' },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const cartCount = useCart((s) => s.totalCount());

  return (
    <nav className="sticky bottom-0 flex justify-around py-2.5 border-t border-line bg-surface z-20">
      {tabs.map((t) => {
        const active = pathname === t.path;
        return (
          <button
            key={t.path}
            onClick={() => navigate(t.path)}
            className="relative flex flex-col items-center gap-0.5"
            style={{ color: active ? '#BA7517' : '#9A9A94' }}
          >
            <Icon name={t.icon} size={22} />
            <span className="text-[10px]">{t.label}</span>
            {t.path === '/orders' && cartCount > 0 && (
              <span className="absolute -top-0.5 right-1 bg-brand-400 text-brand-text text-[9px] font-semibold rounded-full px-[5px]">
                {cartCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

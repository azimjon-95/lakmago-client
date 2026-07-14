import { useNavigate, useLocation } from 'react-router-dom';
import { useOrders } from '@/store/orders';
import { useT } from '@/i18n';
import './ActiveOrderBadge.css';

// Mijoz buyurtma bergач har sahifada chekkada ko'rinadigan kichik tugma.
// Bosilsa — faol buyurtmalar sahifasiga o'tadi.
export function ActiveOrderBadge() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeOrder = useOrders((s) => s.activeOrder);
  const t = useT();

  // Buyurtma yo'q yoki allaqachon kuzatuv sahifasidamiz — ko'rsatmaymiz
  if (!activeOrder) return null;
  if (location.pathname === '/order/track' || location.pathname === '/orders') return null;

  // Umumiy holat: eng "orqada" turgan sub-buyurtma statusi
  const statusOrder = ['accepted', 'preparing', 'delivering', 'delivered'];
  const subs = activeOrder.subOrders || [];
  const minStatus = subs.reduce((acc, s) => {
    const i = statusOrder.indexOf(s.status);
    return i < acc ? i : acc;
  }, statusOrder.length - 1);
  const statusKey = ['orderAccepted', 'orderPreparing', 'orderDelivering', 'orderDelivered'][minStatus] || 'orderAccepted';

  return (
    <button className="active-order-badge" onClick={() => navigate('/order/track')}>
      <span className="active-order-badge__pulse" />
      <span className="active-order-badge__icon">🛵</span>
      <span className="active-order-badge__text">
        <span className="active-order-badge__title">{t('yourOrder')}</span>
        <span className="active-order-badge__status">{t(statusKey)}</span>
      </span>
      <span className="active-order-badge__arrow">›</span>
    </button>
  );
}

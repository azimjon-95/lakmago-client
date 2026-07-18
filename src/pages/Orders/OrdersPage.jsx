import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { BottomNav } from '@/components/BottomNav';
import { useOrders } from '@/store/orders';
import { useT } from '@/i18n';
import { formatSom } from '@/lib/utils';
import './Orders.css';

export function OrdersPage() {
  const navigate = useNavigate();
  const t = useT();
  const activeOrder = useOrders((s) => s.activeOrder);
  const pastOrders = useOrders((s) => s.pastOrders);

  if (!activeOrder && pastOrders.length === 0) {
    return (
      <div className="app-shell orders">
        <header className="orders-header">{t('navOrders')}</header>
        <div className="empty-state">
          <Icon name="bag" size={48} color="#A99C8C" />
          <div className="empty-state__title">{t('noActiveOrders')}</div>
          <p className="empty-state__hint">{t('cartEmptyHint')}</p>
          <button onClick={() => navigate('/')} className="btn-primary" style={{ marginTop: 20 }}>
            {t('allRestaurants')}
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="app-shell orders">
      <header className="orders-header">{t('navOrders')}</header>

      <div className="orders-list">
        {activeOrder && (
          <>
            <div className="orders-section-label">{t('activeOrders')}</div>
            <button onClick={() => navigate('/order/track')} className="active-order-card">
              <div className="active-order-card__top">
                <span className="active-order-card__id">{t('orderNumber')} #{activeOrder.id}</span>
                <Icon name="chevronRight" size={16} color="#FFCE7A" />
              </div>
              <div className="active-order-card__names">
                {activeOrder.subOrders.map((s) => s.restaurant.name).join(' + ')}
              </div>
              <div className="active-order-card__meta">
                {activeOrder.subOrders.filter((s) => s.status === 'delivered').length}/{activeOrder.subOrders.length} {t('orderDelivered').toLowerCase()} · {formatSom(activeOrder.total)}
              </div>
            </button>
          </>
        )}

        {pastOrders.length > 0 && (
          <>
            <div className="orders-section-label">{t('orderHistory')}</div>
            {pastOrders.map((o) => (
              <div key={o.id} className="past-order-card">
                <div className="past-order-card__top">
                  <span className="past-order-card__id">#{o.id}</span>
                  <span className="past-order-card__status">{t('orderDelivered')}</span>
                </div>
                <div className="past-order-card__meta">
                  {o.subOrders.map((s) => s.restaurant.name).join(' + ')} · {formatSom(o.total)}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

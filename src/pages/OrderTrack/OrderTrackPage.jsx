import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { useOrders } from '@/store/orders';
import { useOrderTracking } from '@/hooks/useOrderTracking';
import { useT } from '@/i18n';
import './OrderTrack.css';

const STEP_INDEX = { accepted: 0, preparing: 1, ready: 2, delivering: 3, delivered: 4 };
const DEMO = (import.meta.env.VITE_API_URL ?? '/api') === 'mock';

export function OrderTrackPage() {
  const navigate = useNavigate();
  const t = useT();
  const order = useOrders((s) => s.activeOrder);
  const updateSubOrderStatus = useOrders((s) => s.updateSubOrderStatus);
  const applyBackendStatus = useOrders((s) => s.applyBackendStatus);
  const rateSubOrder = useOrders((s) => s.rateSubOrder);
  const finishOrder = useOrders((s) => s.finishOrder);

  const STEPS = [
    { status: 'accepted', label: t('orderAccepted'), icon: 'checks' },
    { status: 'preparing', label: t('orderPreparing'), icon: 'kitchen' },
    { status: 'ready', label: t('orderReady'), icon: 'circleCheck' },
    { status: 'delivering', label: t('orderDelivering'), icon: 'bike' },
    { status: 'delivered', label: t('orderDelivered'), icon: 'homeCheck' },
  ];

  // Demo rejimда (backend yo'q) — timer bilan simulyatsiya.
  // Haqiqiy rejimда statusni RESTORAN boshqaradi (socket orqali keladi), timer ishlamaydi.
  useEffect(() => {
    if (!order || !DEMO) return;
    const timers = order.subOrders.map((sub) => {
      const speed = 2200 + (sub.etaMinutes % 5) * 400;
      return setInterval(() => {
        const cur = useOrders.getState().activeOrder?.subOrders.find((s) => s.id === sub.id);
        if (!cur) return;
        const currentIdx = STEP_INDEX[cur.status];
        // delivering'gача avtomatik; delivered'ni mijoz o'zi bosadi
        if (currentIdx < STEP_INDEX.delivering) {
          updateSubOrderStatus(order.id, sub.id, STEPS[currentIdx + 1].status);
        }
      }, speed);
    });
    return () => timers.forEach(clearInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  // Haqiqiy rejim: backend socket'dan status keladi
  useOrderTracking(
    order?.subOrders.map((s) => s.backendId).filter(Boolean) ?? [],
    (backendId, status) => applyBackendStatus(backendId, status),
  );

  if (!order) {
    return (
      <div className="app-shell order-track-empty">
        <div className="text-muted">{t('noActiveOrders')}</div>
        <button onClick={() => navigate('/')} className="btn-primary" style={{ marginTop: 16 }}>{t('navHome')}</button>
      </div>
    );
  }

  const allDelivered = order.subOrders.every((s) => s.status === 'delivered');
  const allConfirmed = order.subOrders.every((s) => s.rated || s.status !== 'delivered');

  return (
    <div className="app-shell order-track">
      <header className="page-header">
        <button onClick={() => navigate('/')} aria-label={t('close')}>
          <Icon name="x" size={22} color="#F2F1EE" />
        </button>
        <h1>{t('orderNumber')} #{order.id}</h1>
      </header>

      {order.subOrders.length > 1 && (
        <div className="order-track__multi">
          <Icon name="bag" size={16} color="#EF9F27" />
          <span>{order.subOrders.length} ta restoran — har biri alohida kuzatiladi</span>
        </div>
      )}

      <div className="order-track__list">
        {order.subOrders.map((sub) => (
          <SubOrderCard key={sub.id} sub={sub} orderId={order.id} rateSubOrder={rateSubOrder} steps={STEPS} t={t} />
        ))}
      </div>

      <div style={{ flex: 1 }} />
      {allDelivered && allConfirmed && (
        <div className="order-track__footer">
          <button onClick={() => { finishOrder(); navigate('/'); }} className="btn-primary btn-block">
            {t('navHome')}
          </button>
        </div>
      )}
    </div>
  );
}

function SubOrderCard({ sub, orderId, rateSubOrder, steps, t }) {
  const stepIndex = STEP_INDEX[sub.status];
  const isDone = sub.status === 'delivered';
  const eta = Math.max(0, sub.etaMinutes - stepIndex * Math.round(sub.etaMinutes / 4));
  const itemsText = sub.items.map((i) => `${i.dish.name} ×${i.quantity}`).join(', ');

  return (
    <div className="suborder">
      <div className="suborder__head">
        <div className="suborder__icon" style={{ background: sub.restaurant.tint }}>
          <Icon name={sub.restaurant.icon} size={18} color="#EF9F27" />
        </div>
        <div className="suborder__info">
          <div className="suborder__name">{sub.restaurant.name}</div>
          <div className="suborder__items">{itemsText}</div>
        </div>
        <div className={`suborder__eta ${isDone ? 'is-done' : ''}`}>
          {isDone ? t('orderDelivered') : `${eta} ${t('min')}`}
        </div>
      </div>

      {/* Progress */}
      <div className="suborder__steps">
        {steps.map((step, i) => {
          const done = i < stepIndex;
          const active = i === stepIndex;
          return (
            <div key={step.status} className="suborder__step-wrap">
              <div className={`suborder__dot ${done ? 'is-done' : ''} ${active ? 'is-active' : ''}`}>
                <Icon name={step.icon} size={13} color={done || active ? (done ? '#fff' : '#2C1400') : '#6B6B66'} />
              </div>
              {i < steps.length - 1 && (
                <div className={`suborder__line ${i < stepIndex ? 'is-done' : ''}`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="suborder__labels">
        {steps.map((step, i) => (
          <div key={step.status} className={`suborder__label ${i === stepIndex ? 'is-active' : ''}`}>
            {step.label}
          </div>
        ))}
      </div>

      {sub.status === 'delivering' && (
        <div className="suborder__courier">
          <div className="suborder__courier-avatar">
            {sub.courierName.split(' ').map((w) => w[0]).join('')}
          </div>
          <div className="suborder__courier-info">
            <div className="suborder__courier-name">{sub.courierName}</div>
            <div className="suborder__courier-role">{t('courier')}</div>
          </div>
          <button className="suborder__courier-call" aria-label="☎">
            <Icon name="phone" size={14} color="#EF9F27" />
          </button>
        </div>
      )}

      {isDone && !sub.rated && <ConfirmDelivery sub={sub} orderId={orderId} rateSubOrder={rateSubOrder} t={t} />}
      {isDone && sub.rated && (
        <div className="suborder__thanks">
          <Icon name="circleCheck" size={15} color="#5DCAA5" /> {t('save')} ✓
        </div>
      )}
    </div>
  );
}

function ConfirmDelivery({ sub, orderId, rateSubOrder, t }) {
  const [confirmed, setConfirmed] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  if (!confirmed) {
    return (
      <div className="suborder__confirm">
        <button onClick={() => setConfirmed(true)} className="btn-primary btn-block">
          <Icon name="check" size={15} color="#2C1400" /> {t('orderDelivered')} ✓
        </button>
      </div>
    );
  }

  return (
    <div className="suborder__rate">
      <div className="suborder__rate-title">{sub.restaurant.name} — {t('rating')}?</div>
      <div className="suborder__stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} aria-label={`${n}`}>
            <Icon name="star" size={26} color={n <= rating ? '#EF9F27' : '#4A4A4E'} style={n <= rating ? { fill: '#EF9F27' } : {}} />
          </button>
        ))}
      </div>
      <input
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t('comment')}
        className="input-field"
        style={{ marginBottom: 10 }}
      />
      <button onClick={() => rateSubOrder(orderId, sub.id, rating, comment)} disabled={rating === 0} className="btn-primary btn-block">
        {t('send')}
      </button>
    </div>
  );
}

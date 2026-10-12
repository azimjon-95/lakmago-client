import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { useOrders } from '@/store/orders';
import { useOrderTracking } from '@/hooks/useOrderTracking';
import { useT } from '@/i18n';
import { formatSom } from '@/lib/utils';
import { haptic } from '@/lib/telegram';
import { api } from '@/api';
import { TrackMap } from './TrackMap';
import './OrderTrack.css';

const FLOW = [
  { key: 'accepted', label: 'Qabul qilindi', icon: 'check' },
  { key: 'preparing', label: 'Tayyorlanmoqda', icon: 'flame' },
  { key: 'delivering', label: "Kuryer yo'lda", icon: 'bike' },
  { key: 'ready', label: 'Yetib keldi', icon: 'bag' }, // ready = olib ketish / yetib kelish
  { key: 'delivered', label: 'Tugadi', icon: 'circleCheck' },
];

const STATUS_UI = {
  pending: { title: 'Tasdiq kutilmoqda', sub: 'Restoran javobini kutmoqda…', eta: true },
  accepted: { title: 'Buyurtmangiz qabul qilindi', sub: 'Tayyorlash boshlanadi…', eta: true },
  preparing: { title: 'Buyurtmangiz tayyorlanmoqda', sub: 'Restorandan olib chiqilishi kutilmoqda…', eta: true },
  ready: { title: 'Buyurtma tayyor', sub: 'Kuryer yoki olib ketish kutilmoqda', eta: true },
  delivering: { title: "Kuryer manzilingizga yetib bormoqda", sub: 'Taxminiy yetib kelish vaqti', eta: true },
  delivered: { title: 'Yetkazildi', sub: 'Yoqimli ishtaha!', eta: false },
  cancelled: { title: 'Bekor qilindi', sub: '', eta: false },
};

function stepIndexOf(status) {
  const map = { pending: 0, accepted: 0, preparing: 1, ready: 2, delivering: 2, delivered: 4 };
  return map[status] ?? 0;
}

function fmtTime(d) {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function timeForStep(sub, key) {
  if (key === 'accepted') return fmtTime(sub.acceptedAt || sub.createdAt);
  if (key === 'preparing') return fmtTime(sub.acceptedAt); // preparingAt yo'q — accepted dan
  if (key === 'delivering') return fmtTime(sub.deliveringAt);
  if (key === 'ready') return fmtTime(sub.readyAt || sub.deliveringAt);
  if (key === 'delivered') return fmtTime(sub.deliveredAt);
  return '';
}

export function OrderTrackPage() {
  const navigate = useNavigate();
  const t = useT();
  const order = useOrders((s) => s.activeOrder);
  const applyBackendStatus = useOrders((s) => s.applyBackendStatus);
  const rateSubOrder = useOrders((s) => s.rateSubOrder);
  const finishOrder = useOrders((s) => s.finishOrder);
  const loadActive = useOrders((s) => s.loadActive);

  // Sahifa yangilanganda activeOrder tiklanadi
  useEffect(() => {
    if (!order) loadActive?.();
  }, [order, loadActive]);

  useOrderTracking(
    order?.subOrders.map((s) => s.backendId).filter(Boolean) ?? [],
    (backendId, status) => applyBackendStatus(backendId, status),
  );

  if (!order) {
    return (
      <div className="app-shell order-track-empty">
        <div className="text-muted">{t('noActiveOrders') || 'Faol buyurtma yo‘q'}</div>
        <button onClick={() => navigate('/')} className="btn-primary" style={{ marginTop: 16 }}>
          {t('navHome') || 'Bosh sahifa'}
        </button>
      </div>
    );
  }

  // Rasm bitta restoran ko'rsatadi — birinchi faol sub
  const sub = order.subOrders.find((s) => !['delivered', 'cancelled'].includes(s.status))
    || order.subOrders[0];

  const itemsText = (sub.items || [])
    .map((i) => `${i.dish?.name || i.name || 'Taom'} ×${i.quantity || 1}`)
    .join(', ');

  const st = STATUS_UI[sub.status] || STATUS_UI.accepted;
  const idx = stepIndexOf(sub.status);
  const eta = Math.max(0, (sub.etaMinutes ?? 30) - idx * 6);

  const rLat = sub.restaurantLat ?? sub.restaurant?.lat;
  const rLng = sub.restaurantLng ?? sub.restaurant?.lng;
  const cLat = sub.addressLat;
  const cLng = sub.addressLng;

  const phone = sub.restaurantPhone || sub.restaurant?.phone || '';
  const dist = sub.distanceKm != null ? `${Number(sub.distanceKm).toFixed(1)} km` : null;

  const openMaps = () => {
    if (!Number.isFinite(rLat) || !Number.isFinite(rLng)) return;
    haptic();
    window.open(`https://yandex.com/maps/?rtext=~${rLat},${rLng}&rtt=auto`, '_blank', 'noopener');
  };

  const callRestaurant = () => {
    if (!phone) return;
    haptic();
    window.location.href = `tel:${phone.replace(/\s/g, '')}`;
  };

  const allDelivered = order.subOrders.every((s) => s.status === 'delivered');

  return (
    <div className="track-page">
      {/* Header */}
      <header className="track-header">
        <button className="track-header__back" onClick={() => navigate(-1)} aria-label="Orqaga">
          <Icon name="arrowLeft" size={22} color="var(--ink)" />
          <span>Orqaga</span>
        </button>
        <button className="track-header__close" onClick={() => navigate('/')} aria-label="Yopish">
          <Icon name="x" size={22} color="var(--ink)" />
        </button>
      </header>

      <div className="track-header__title-block">
        <h1 className="track-header__title">
          Buyurtma #{sub.orderNumber || order.id}
        </h1>
        <p className="track-header__sub">{itemsText}</p>
      </div>

      {/* Status banner */}
      <div className="track-status">
        <div className="track-status__left">
          <span className="track-status__icon">
            <Icon name="clock" size={18} color="#fff" />
          </span>
          <div>
            <div className="track-status__title">{st.title}</div>
            <div className="track-status__sub">{st.sub}</div>
          </div>
        </div>
        {st.eta && (
          <div className="track-status__eta">
            <Icon name="clock" size={14} color="#fff" />
            {eta} daqiqa
          </div>
        )}
      </div>

      {/* Restoran card */}
      <div className="track-rest">
        <div className="track-rest__info">
          {sub.restaurantImage || sub.restaurant?.imageUrl ? (
            <img
              src={sub.restaurantImage || sub.restaurant.imageUrl}
              alt=""
              className="track-rest__img"
            />
          ) : (
            <div className="track-rest__img track-rest__img--ph">
              <Icon name="bag" size={20} color="var(--brand)" />
            </div>
          )}
          <div>
            <div className="track-rest__name">{sub.restaurant?.name || 'Restoran'}</div>
            <div className="track-rest__meta">
              <span className="track-rest__dot" /> Restoran
              {dist && <> · 🚲 {dist}</>}
            </div>
          </div>
        </div>
        <button type="button" className="track-rest__nav" onClick={openMaps}>
          <Icon name="navigation" size={16} color="var(--brand)" />
          Yo‘nalish
        </button>
      </div>

      {/* MAP */}
      <TrackMap
        restaurantLat={rLat}
        restaurantLng={rLng}
        customerLat={cLat}
        customerLng={cLng}
        restaurantName={sub.restaurant?.name}
        itemLabel={(sub.items?.[0]?.dish?.name || sub.items?.[0]?.name) || ''}
      />

      {/* Bottom sheet */}
      <div className="track-sheet">
        {/* Courier */}
        {['delivering', 'ready', 'delivered'].includes(sub.status) && (
          <div className="track-courier">
            <div className="track-courier__avatar">
              {(sub.courierName || 'K')[0]}
            </div>
            <div className="track-courier__info">
              <div className="track-courier__name">{sub.courierName || 'Kuryer'}</div>
              <div className="track-courier__meta">🚲 Yetkazib berish</div>
            </div>
            {phone && (
              <button className="track-courier__btn" onClick={callRestaurant} aria-label="Qo‘ng‘iroq">
                <Icon name="phone" size={18} color="var(--ink)" />
              </button>
            )}
          </div>
        )}

        {sub.status === 'delivering' && (
          <div className="track-live">
            <div>
              <div className="track-live__title">Kuryer manzilingizga yetib bormoqda</div>
              <div className="track-live__sub">Taxminiy yetib kelish: {eta} daqiqa</div>
            </div>
            <span className="track-live__badge">
              <Icon name="radio" size={14} color="var(--success)" />
              Jonli kuzatish
            </span>
          </div>
        )}

        {/* Timeline */}
        <div className="track-timeline">
          {FLOW.map((step, i) => {
            const done = i < idx || (i === idx && sub.status === 'delivered');
            const active = i === idx && sub.status !== 'delivered';
            return (
              <div key={step.key} className={`track-tl ${done ? 'is-done' : ''} ${active ? 'is-active' : ''}`}>
                <div className="track-tl__dot">
                  <Icon name={step.icon} size={12} color={done || active ? '#fff' : 'var(--muted)'} />
                </div>
                {i < FLOW.length - 1 && <div className={`track-tl__line ${i < idx ? 'is-done' : ''}`} />}
                <div className="track-tl__label">{step.label}</div>
                <div className="track-tl__time">{timeForStep(sub, step.key)}</div>
              </div>
            );
          })}
        </div>

        {/* Items + sum */}
        <div className="track-sum">
          {(sub.items || []).map((it, i) => (
            <div key={i} className="track-sum__item">
              <div className="track-sum__name">
                <strong>{it.dish?.name || it.name}</strong>
                <span>{it.quantity} × {formatSom(it.unitPrice || it.dish?.unitPrice || 0)}</span>
              </div>
              <div className="track-sum__price">
                {formatSom((it.unitPrice || 0) * (it.quantity || 1))}
              </div>
            </div>
          ))}
          {(sub.deliveryFee > 0) && (
            <div className="track-sum__row">
              <span>Yetkazib berish</span>
              <span>{formatSom(sub.deliveryFee)}</span>
            </div>
          )}
          <div className="track-sum__row track-sum__row--total">
            <span>Jami</span>
            <span>{formatSom(sub.total ?? order.total)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="track-actions">
          <button
            type="button"
            className="track-actions__sec"
            onClick={() => { haptic(); navigate('/'); /* yoki support chat */ }}
          >
            <Icon name="headphones" size={18} color="var(--ink)" />
            Savol berish
          </button>
          <button
            type="button"
            className="track-actions__pri"
            onClick={callRestaurant}
            disabled={!phone}
          >
            <Icon name="phone" size={18} color="#fff" />
            Restoran bilan bog‘lanish
          </button>
        </div>

        {allDelivered && (
          <button
            type="button"
            className="track-actions__pri"
            style={{ width: '100%', marginTop: 8 }}
            onClick={() => { finishOrder(); navigate('/'); }}
          >
            Bosh sahifa
          </button>
        )}
      </div>
    </div>
  );
}
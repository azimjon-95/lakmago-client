import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { BottomNav } from '@/components/BottomNav';
import { api } from '@/api';
import { getSocket, joinUserRoom } from '@/lib/socket';
import { useUser } from '@/store/user';
import { formatSom, formatUzDate } from '@/lib/utils';
import { useT } from '@/i18n';
import { haptic, getTelegram } from '@/lib/telegram';
import './Orders.css';

// Buyurtma holatlari — bosqichma-bosqich
const FLOW = ['pending', 'accepted', 'preparing', 'ready', 'delivering', 'delivered'];

const STATUS = {
  awaiting_payment: { label: "To'lov kutilmoqda", icon: 'card', color: '#E0A96D' },
  pending: { label: 'Tasdiq kutilmoqda', icon: 'clock', color: '#E0A96D' },
  accepted: { label: 'Qabul qilindi', icon: 'check', color: '#6FBF73' },
  preparing: { label: 'Tayyorlanmoqda', icon: 'flame', color: '#F5A524' },
  ready: { label: 'Tayyor', icon: 'bag', color: '#6FBF73' },
  delivering: { label: "Yo'lda", icon: 'scooter', color: '#F5A524' },
  delivered: { label: 'Yetkazildi', icon: 'check', color: '#6FBF73' },
  cancelled: { label: 'Bekor qilindi', icon: 'x', color: '#E14B42' },
};

// Faol = hali yetkazilmagan va bekor qilinmagan
// To'lov kutilayotgan ham faol — mijoz uni ko'rishi va
// to'lovni davom ettirishi kerak
const isActive = (s) => !['delivered', 'cancelled'].includes(s);

function fmtDate(d) {
  const date = new Date(d);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const time = date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (isToday) return `Bugun, ${time}`;
  const yesterday = new Date(today.getTime() - 86400000);
  if (date.toDateString() === yesterday.toDateString()) return `Kecha, ${time}`;
  return `${formatUzDate(date)}, ${time}`;
}

export function OrdersPage() {
  const navigate = useNavigate();
  const t = useT();
  const userId = useUser((s) => s.user?._id || s.user?.id);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(() => {
    api.getMyOrders()
      .then((list) => setOrders(Array.isArray(list) ? list : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Real-time: holat o'zgarsa ro'yxat yangilanadi
  useEffect(() => {
    if (!userId) return;
    const socket = getSocket();
    joinUserRoom(userId);
    const refresh = () => load();
    socket.on('order:status', refresh);
    return () => socket.off('order:status', refresh);
  }, [userId, load]);

  const active = orders.filter((o) => isActive(o.status));
  const past = orders.filter((o) => !isActive(o.status));

  const toggle = (id) => {
    haptic();
    setOpenId((cur) => (cur === id ? null : id));
  };

  if (loading) {
    return (
      <div className="app-shell orders">
        <header className="orders-header">{t('navOrders')}</header>
        <div className="orders-empty">Yuklanmoqda...</div>
        <BottomNav />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="app-shell orders">
        <header className="orders-header">{t('navOrders')}</header>
        <div className="orders-empty">
          <Icon name="bag" size={56} color="#7D7264" />
          <div className="orders-empty__title">Buyurtmalar yo'q</div>
          <p className="orders-empty__hint">Menyudan taom tanlang</p>
          <button onClick={() => navigate('/')} className="orders-empty__btn">
            Barcha restoranlar
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
        {/* Faol buyurtmalar — yuqorida, ajralib turadi */}
        {active.length > 0 && (
          <>
            <div className="orders-section-label">
              <span className="orders-live-dot" /> Faol buyurtmalar
            </div>
            {active.map((o) => (
              <OrderCard
                key={o._id}
                order={o}
                open={openId === o._id}
                onToggle={() => toggle(o._id)}
                onChanged={load}
                highlight
              />
            ))}
          </>
        )}

        {/* Tugagan buyurtmalar */}
        {past.length > 0 && (
          <>
            <div className="orders-section-label orders-section-label--muted">
              Tarix
            </div>
            {past.map((o) => (
              <OrderCard
                key={o._id}
                order={o}
                open={openId === o._id}
                onToggle={() => toggle(o._id)}
                onRepeat={() => navigate(`/restaurant/${o.restaurantId}`)}
              />
            ))}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

// Bitta buyurtma kartasi — bosilsa tafsilot ochiladi
function OrderCard({ order: o, open, onToggle, onRepeat, onChanged, highlight }) {
  const st = STATUS[o.status] || STATUS.pending;
  const stepIndex = FLOW.indexOf(o.status);
  const itemCount = (o.items || []).reduce((s, i) => s + (i.quantity || 1), 0);

  return (
    <div className={`ord-card ${highlight ? 'ord-card--active' : ''}`}>
      <button onClick={onToggle} className="ord-card__head">
        <div className="ord-card__main">
          <div className="ord-card__top">
            <span className="ord-card__rest">{o.restaurantName}</span>
            <span className="ord-card__status" style={{ color: st.color }}>
              <Icon name={st.icon} size={13} color={st.color} /> {st.label}
            </span>
          </div>
          <div className="ord-card__meta">
            {fmtDate(o.createdAt)} · {itemCount} ta taom
          </div>
        </div>
        <div className="ord-card__right">
          <span className="ord-card__total">{formatSom(o.total)}</span>
          <Icon name={open ? 'chevronDown' : 'chevronRight'} size={17} color="#A99C8C" />
        </div>
      </button>

      {/* Bosqich chizig'i — faqat faol buyurtmada */}
      {highlight && stepIndex >= 0 && (
        <div className="ord-steps">
          {FLOW.slice(0, 5).map((s, i) => (
            <span
              key={s}
              className={`ord-steps__bar ${i <= stepIndex ? 'is-done' : ''}`}
            />
          ))}
        </div>
      )}

      {/* Tafsilot */}
      {open && (
        <div className="ord-card__body">
          <div className="ord-items">
            {(o.items || []).map((it, i) => (
              <div key={i} className="ord-item">
                <span className="ord-item__qty">{it.quantity}×</span>
                <span className="ord-item__name">{it.name}</span>
                <span className="ord-item__price">{formatSom(it.unitPrice * it.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="ord-sum">
            <div className="ord-sum__row">
              <span>Taomlar</span><span>{formatSom(o.subtotal)}</span>
            </div>
            {o.deliveryFee > 0 && (
              <div className="ord-sum__row">
                <span>Yetkazish</span><span>{formatSom(o.deliveryFee)}</span>
              </div>
            )}
            {o.serviceFee > 0 && (
              <div className="ord-sum__row">
                <span>Xizmat haqi</span><span>{formatSom(o.serviceFee)}</span>
              </div>
            )}
            {o.bonusUsed > 0 && (
              <div className="ord-sum__row ord-sum__row--bonus">
                <span>Bonus</span><span>−{formatSom(o.bonusUsed)}</span>
              </div>
            )}
            <div className="ord-sum__row ord-sum__row--total">
              <span>Jami</span><span>{formatSom(o.total)}</span>
            </div>
          </div>

          {o.address && (
            <div className="ord-card__addr">
              <Icon name="pin" size={14} color="#A99C8C" /> {o.address}
            </div>
          )}
          {o.fulfillment === 'pickup' && (
            <div className="ord-card__addr">
              <Icon name="bag" size={14} color="#A99C8C" /> O'zim olib ketaman
            </div>
          )}

          {/* Bekor qilish — faqat naqd va restoran qabul qilgunicha */}
          {o.status === 'pending' && !o.isPaid && (
            <div className="ord-card__actions">
              <button
                onClick={async () => {
                  haptic();
                  if (!window.confirm('Buyurtma bekor qilinsinmi?')) return;
                  try {
                    await api.cancelOrder(o._id);
                    onChanged?.();
                  } catch (e) {
                    alert(e.message || 'Bekor qilib bo\u2018lmadi');
                  }
                }}
                className="ord-btn ord-btn--danger"
              >
                Bekor qilish
              </button>
            </div>
          )}

          {/* To'lov tugallanmagan — davom ettirish */}
          {o.status === 'awaiting_payment' && (
            <div className="ord-card__actions">
              <button
                onClick={async () => {
                  haptic();
                  try {
                    const provider = o.paymentMethod === 'click' ? 'click' : 'payme';
                    const { url } = await api.getPaymentLink(o._id, provider);
                    const tg = getTelegram();
                    if (tg?.openLink) tg.openLink(url);
                    else window.location.href = url;
                  } catch (e) {
                    alert(e.message || 'To\u2018lovni boshlab bo\u2018lmadi');
                  }
                }}
                className="ord-btn ord-btn--primary"
              >
                To'lovni davom ettirish
              </button>
            </div>
          )}

          {onRepeat && (
            <div className="ord-card__actions">
              <button onClick={onRepeat} className="ord-btn">
                Qayta buyurtma
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

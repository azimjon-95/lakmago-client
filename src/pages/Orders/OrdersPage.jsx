import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { BottomNav } from '@/components/BottomNav';
import { api } from '@/api';
import { getSocket, joinUserRoom } from '@/lib/socket';
import { useUser } from '@/store/user';
import { formatSom, formatUzDate } from '@/lib/utils';
import { useT } from '@/i18n';
import { haptic } from '@/lib/telegram';
import './Orders.css';

// Buyurtma holatlari — bosqichma-bosqich
const FLOW = ['pending', 'accepted', 'preparing', 'ready', 'delivering', 'delivered'];

const STATUS = {
  awaiting_payment: { label: "To'lov kutilmoqda", icon: 'card', color: 'var(--info)' },
  pending: { label: 'Tasdiq kutilmoqda', icon: 'clock', color: 'var(--info)' },
  accepted: { label: 'Qabul qilindi', icon: 'check', color: 'var(--success)' },
  preparing: { label: 'Tayyorlanmoqda', icon: 'flame', color: 'var(--brand)' },
  ready: { label: 'Tayyor', icon: 'bag', color: 'var(--success)' },
  delivering: { label: "Yo'lda", icon: 'scooter', color: 'var(--brand)' },
  delivered: { label: 'Yetkazildi', icon: 'check', color: 'var(--success)' },
  cancelled: { label: 'Bekor qilindi', icon: 'x', color: 'var(--danger)' },
};

// Faol = hali yetkazilmagan va bekor qilinmagan.
// 'awaiting_payment' bu yerga UMUMAN kirmaydi — u ro'yxatga
// tushishdan oldin butunlay filtrlanadi (pastda, `visible`).
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

  /*
   * ═══ BU SAHIFA — FAQAT KUZATUV ═══
   *
   * Buyurtmalar bo'limi endi sof TARIX/HOLAT ekrani: bekor
   * qilish, o'chirish va to'lovni davom ettirish tugmalari
   * YO'Q. Bu qaror ataylab:
   *
   *   - To'lov FAQAT Savat sahifasida boshlanadi. Bu yerda
   *     "to'lovni davom ettirish" tugmasi bo'lishi ikki xil
   *     to'lov yo'lini yaratardi va aynan shu tugma orqali
   *     noto'g'ri provayder (Payme) chaqirilib, "payme hali
   *     ulanmagan" xatosi chiqardi — bu yerda umuman yo'q edi.
   *
   *   - Karta bilan to'lanadigan buyurtma pul YECHILMAGUNCHA
   *     bu ro'yxatda UMUMAN ko'rinmaydi. `awaiting_payment`
   *     holati aynan shuni bildiradi: karta tanlangan, lekin
   *     pul hali yechilmagan. Bunday buyurtma restoranga ham
   *     ko'rinmaydi (server: restaurantPanel.js). Pul yechilgach
   *     server holatni 'pending' ga o'tkazadi va shu payt
   *     buyurtma HAM shu yerda, HAM restoranda paydo bo'ladi —
   *     ikkalasi bir vaqtda, bitta haqiqat manbaidan (to'lov
   *     webhook'i).
   *
   *   - Naqd buyurtma bu filtrga umuman tushmaydi: u
   *     yaratilgandayoq 'pending' bilan boshlanadi (server:
   *     misc.js), ya'ni darhol ko'rinadi va darhol restoranga
   *     boradi — kartaga xos kutish bosqichi yo'q.
   */
  const visible = orders.filter((o) => o.status !== 'awaiting_payment');
  const active = visible.filter((o) => isActive(o.status));
  const past = visible.filter((o) => !isActive(o.status));

  const toggle = (id) => {
    haptic();
    setOpenId((cur) => (cur === id ? null : id));
  };

  if (loading) {
    return (
      <div className="app-shell orders">
        <header className="orders-header">{t('navOrders')}</header>
        <div className="orders-empty">{t('loading')}</div>
        <BottomNav />
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="app-shell orders">
        <header className="orders-header">{t('navOrders')}</header>
        <div className="orders-empty">
          <Icon name="bag" size={56} color="var(--muted-2)" />
          <div className="orders-empty__title">{t('ordersEmptyTitle')}</div>
          <p className="orders-empty__hint">{t('ordersEmptyHint')}</p>
          <button onClick={() => navigate('/')} className="orders-empty__btn">
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
function OrderCard({ order: o, open, onToggle, onRepeat, highlight }) {
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
          <Icon name={open ? 'chevronDown' : 'chevronRight'} size={17} color="var(--muted)" />
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
              <span>{t('dishes')}</span><span>{formatSom(o.subtotal)}</span>
            </div>
            {o.deliveryFee > 0 && (
              <div className="ord-sum__row">
                <span>{t('delivery')}</span><span>{formatSom(o.deliveryFee)}</span>
              </div>
            )}
            {o.serviceFee > 0 && (
              <div className="ord-sum__row">
                <span>{t('serviceFee')}</span><span>{formatSom(o.serviceFee)}</span>
              </div>
            )}
            {o.bonusUsed > 0 && (
              <div className="ord-sum__row ord-sum__row--bonus">
                <span>{t('bonus')}</span><span>−{formatSom(o.bonusUsed)}</span>
              </div>
            )}
            <div className="ord-sum__row ord-sum__row--total">
              <span>{t('total')}</span><span>{formatSom(o.total)}</span>
            </div>
          </div>

          {o.address && (
            <div className="ord-card__addr">
              <Icon name="pin" size={14} color="var(--muted)" /> {o.address}
            </div>
          )}
          {o.fulfillment === 'pickup' && (
            <div className="ord-card__addr">
              <Icon name="bag" size={14} color="var(--muted)" /> O'zim olib ketaman
            </div>
          )}

          {/*
            Bekor qilish va to'lov tugmalari ATAYLAB YO'Q.
            Sabab yuqorida, sahifa boshidagi izohda ("BU SAHIFA
            — FAQAT KUZATUV"). Bekor qilish kerak bo'lsa mijoz
            restoran/qo'llab-quvvatlash bilan bog'lanadi —
            buyurtma allaqachon oshxonaga ketgan bo'lishi
            mumkin va bir tugma bosish bilan bekor qilinishi
            xavfli.
          */}

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

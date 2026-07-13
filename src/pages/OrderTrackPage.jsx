import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Icon } from '@/components/Icon';
import { useOrders } from '@/store/orders';
import { useOrderTracking } from '@/hooks/useOrderTracking';

const STEPS = [
{ status: 'accepted', label: 'Qabul qilindi', icon: 'checks' },
{ status: 'preparing', label: 'Tayyorlanmoqda', icon: 'kitchen' },
{ status: 'delivering', label: "Yo'lda", icon: 'bike' },
{ status: 'delivered', label: 'Yetkazildi', icon: 'homeCheck' }];

const STEP_INDEX = { accepted: 0, preparing: 1, delivering: 2, delivered: 3 };

export function OrderTrackPage() {
  const navigate = useNavigate();
  const order = useOrders((s) => s.activeOrder);
  const updateSubOrderStatus = useOrders((s) => s.updateSubOrderStatus);
  const rateSubOrder = useOrders((s) => s.rateSubOrder);
  const finishOrder = useOrders((s) => s.finishOrder);

  // Har sub-buyurtma o'z tezligida ilgarilaydi (restoran tayyorlash vaqtiga qarab)
  useEffect(() => {
    if (!order) return;
    const timers = order.subOrders.map((sub) => {
      const speed = 1400 + sub.etaMinutes % 5 * 300;
      return setInterval(() => {
        const currentIdx = STEP_INDEX[sub.status];
        if (currentIdx < STEPS.length - 1) {
          updateSubOrderStatus(order.id, sub.id, STEPS[currentIdx + 1].status);
        }
      }, speed);
    });
    return () => timers.forEach(clearInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  // Real ilovada bu Socket.IO orqali keladi (backend ulangan bo'lsa); aks holda
  // mahalliy timer (yuqoridagi useEffect) har sub-order progressini simulyatsiya qiladi.
  useOrderTracking(
    order?.id ?? null,
    order?.subOrders.map((s) => s.id) ?? [],
    (subId, status) => order && updateSubOrderStatus(order.id, subId, status)
  );

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-8">
        <div className="text-muted text-sm">Faol buyurtma topilmadi</div>
        <button onClick={() => navigate('/')} className="mt-4 bg-brand-ink text-white text-sm font-medium px-6 py-3 rounded-xl">
          Bosh sahifaga qaytish
        </button>
      </div>);

  }

  const allDelivered = order.subOrders.every((s) => s.status === 'delivered');
  const allConfirmed = order.subOrders.every((s) => s.rated || s.status !== 'delivered');

  return (
    <div className="min-h-screen bg-canvas max-w-[420px] mx-auto flex flex-col">
      <div className="px-4 pt-3.5 pb-3 bg-surface flex items-center gap-3 border-b border-line sticky top-0 z-10">
        <button onClick={() => navigate('/')} aria-label="Yopish">
          <Icon name="x" size={22} color="#1A1A17" />
        </button>
        <div className="text-lg font-medium text-ink">Buyurtma #{order.id}</div>
      </div>

      {order.subOrders.length > 1 &&
      <div className="mx-4 mt-3 bg-brand-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
          <Icon name="bag" size={16} color="#BA7517" />
          <span className="text-xs text-brand-800">
            {order.subOrders.length} ta restorandan bitta buyurtma — har biri alohida kuzatiladi
          </span>
        </div>
      }

      <div className="p-4 flex flex-col gap-3.5">
        {order.subOrders.map((sub) =>
        <SubOrderCard key={sub.id} sub={sub} orderId={order.id} rateSubOrder={rateSubOrder} />
        )}
      </div>

      <div className="flex-1" />
      {allDelivered && allConfirmed &&
      <div className="p-4">
          <button
          onClick={() => {
            finishOrder();
            navigate('/');
          }}
          className="w-full bg-brand-ink text-white text-[15px] font-medium py-3.5 rounded-xl">
          
            Bosh sahifaga qaytish
          </button>
        </div>
      }
    </div>);

}

function SubOrderCard({
  sub,
  orderId,
  rateSubOrder




}) {
  const stepIndex = STEP_INDEX[sub.status];
  const isDone = sub.status === 'delivered';
  const eta = Math.max(0, sub.etaMinutes - stepIndex * Math.round(sub.etaMinutes / 4));
  const itemsText = sub.items.map((i) => `${i.dish.name} ×${i.quantity}`).join(', ');

  return (
    <div className="bg-surface border border-line rounded-2xl overflow-hidden">
      <div className="p-3.5 flex items-center gap-2.5 border-b border-line">
        <div className="w-[34px] h-[34px] rounded-[9px] flex-none flex items-center justify-center" style={{ background: sub.restaurant.tint }}>
          <Icon name={sub.restaurant.icon} size={18} color="#EF9F27" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-ink">{sub.restaurant.name}</div>
          <div className="text-[11px] text-muted overflow-hidden text-ellipsis whitespace-nowrap">{itemsText}</div>
        </div>
        <div className="text-right flex-none">
          <div className="text-[15px] font-medium" style={{ color: isDone ? '#0F6E56' : '#BA7517' }}>
            {isDone ? 'Yetkazildi' : `${eta} daq`}
          </div>
        </div>
      </div>

      <div className="px-3.5 pt-3.5 pb-1 flex items-center gap-1">
        {STEPS.map((step, i) => {
          const done = i < stepIndex;
          const active = i === stepIndex;
          return (
            <div key={step.status} className="contents">
              <div className="flex flex-col items-center gap-1">
                <div
                  className="w-[26px] h-[26px] rounded-full flex items-center justify-center"
                  style={{
                    background: done || active ? '#EF9F27' : '#F0EEE7',
                    border: active ? '2px solid #EF9F27' : 'none'
                  }}>
                  
                  <Icon name={step.icon} size={13} color={done || active ? done ? '#fff' : '#2C1400' : '#B4B2A9'} />
                </div>
              </div>
              {i < STEPS.length - 1 &&
              <div className="flex-1 h-0.5 mb-[22px]" style={{ background: i < stepIndex ? '#EF9F27' : '#EAE7DF' }} />
              }
            </div>);

        })}
      </div>
      <div className="px-3.5 pb-3 flex justify-between">
        {STEPS.map((step, i) =>
        <div
          key={step.status}
          className="text-center w-[50px]"
          style={{ fontSize: 9.5, color: i === stepIndex ? '#BA7517' : '#9A9A94', fontWeight: i === stepIndex ? 500 : 400 }}>
          
            {step.label}
          </div>
        )}
      </div>

      {sub.status === 'delivering' &&
      <div className="mx-3.5 mb-3.5 bg-canvas rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="w-[34px] h-[34px] rounded-full bg-brand-50 flex items-center justify-center text-brand-800 font-medium text-xs">
            {sub.courierName.split(' ').map((w) => w[0]).join('')}
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-medium text-ink">{sub.courierName}</div>
            <div className="text-[11px] text-muted">Sizning kuryeringiz</div>
          </div>
          <button className="w-8 h-8 rounded-full bg-surface border border-line flex items-center justify-center" aria-label="Qo'ng'iroq">
            <Icon name="phone" size={14} color="#BA7517" />
          </button>
        </div>
      }

      {isDone && !sub.rated && <ConfirmDelivery sub={sub} orderId={orderId} rateSubOrder={rateSubOrder} />}
      {isDone && sub.rated &&
      <div className="mx-3.5 mb-3.5 flex items-center gap-1.5 text-[#0F6E56] text-xs">
          <Icon name="circleCheck" size={15} color="#0F6E56" /> Rahmat, bahoingiz yuborildi
        </div>
      }
    </div>);

}

function ConfirmDelivery({
  sub,
  orderId,
  rateSubOrder




}) {
  const [confirmed, setConfirmed] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  if (!confirmed) {
    return (
      <div className="mx-3.5 mb-3.5">
        <button
          onClick={() => setConfirmed(true)}
          className="w-full bg-brand-ink text-white text-[13px] font-medium py-2.5 rounded-[10px] flex items-center justify-center gap-1.5">
          
          <Icon name="check" size={15} color="#fff" /> Ha, oldim
        </button>
      </div>);

  }

  return (
    <div className="mx-3.5 mb-3.5 bg-canvas rounded-xl p-3">
      <div className="text-xs font-medium text-ink mb-2">{sub.restaurant.name} — qanday baholaysiz?</div>
      <div className="flex gap-1.5 mb-2.5">
        {[1, 2, 3, 4, 5].map((n) =>
        <button key={n} onClick={() => setRating(n)} aria-label={`${n} yulduz`}>
            <Icon name="star" size={26} color={n <= rating ? '#EF9F27' : '#D3D1C7'} style={n <= rating ? { fill: '#EF9F27' } : {}} />
          </button>
        )}
      </div>
      <input
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Izoh qoldiring (ixtiyoriy)"
        className="w-full box-border px-3 py-2.5 border border-line rounded-[10px] text-[16px] mb-2.5 outline-none bg-surface" />
      
      <button
        onClick={() => rateSubOrder(orderId, sub.id, rating, comment)}
        disabled={rating === 0}
        className="w-full bg-brand-400 text-brand-text text-[13px] font-medium py-2.5 rounded-[10px] disabled:opacity-50">
        
        Yuborish
      </button>
    </div>);

}

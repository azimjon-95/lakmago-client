import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { DishPhoto } from '@/components/DishPhoto';
import { haptic } from '@/lib/telegram';
import { useT } from '@/i18n';
import { formatSom, formatSomShort } from '@/lib/utils';
import { restaurants, dishes } from '@/data/mock';
import './Reservation.css';

const TIMES = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
const WEEKDAYS = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Sha'];

function nextDays(count, todayLabel) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    out.push({ date: d, label: i === 0 ? todayLabel : WEEKDAYS[d.getDay()] });
  }
  return out;
}

export function ReservationPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const t = useT();
  const restaurant = restaurants.find((r) => r.id === id);

  const days = useMemo(() => nextDays(7, 'Bugun'), []);
  const [dayIdx, setDayIdx] = useState(0);
  const [time, setTime] = useState('18:30');
  const [guests, setGuests] = useState(4);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('form');
  const [preOrderDishes, setPreOrderDishes] = useState([]);

  const selectedDate = days[dayIdx].date;
  const dateLabel = selectedDate.toLocaleDateString('uz', { day: 'numeric', month: 'long' });
  const valid = name.trim().length >= 2 && phone.trim().length >= 7;

  function finishReservation(chosen) {
    setPreOrderDishes(chosen);
    setStep('done');
  }

  if (step === 'preorder' && restaurant) {
    return (
      <PreOrderScreen
        restaurant={restaurant}
        reservationInfo={{ dateLabel, time, guests }}
        onSkip={() => finishReservation([])}
        onConfirm={(chosen) => finishReservation(chosen)}
        onBack={() => setStep('form')}
        t={t}
      />
    );
  }

  if (step === 'done') {
    return (
      <div className="app-shell resv-done">
        <div className="resv-done__icon"><Icon name="calendarPlus" size={32} color="#EF9F27" /></div>
        <div className="resv-done__title">{t('reservationSent')}</div>
        <p className="resv-done__text">
          {restaurant?.name} · {dateLabel}, {time}, {guests} {t('guests').toLowerCase()}.
        </p>
        {preOrderDishes.length > 0 && (
          <div className="resv-done__preorder">
            <div className="resv-done__preorder-title">OLDINDAN TANLANGAN TAOMLAR</div>
            {preOrderDishes.map((d) => (
              <div key={d.dish.id} className="resv-done__preorder-row">
                <span>{d.dish.name} ×{d.qty}</span>
                <span>{formatSomShort(d.dish.price * d.qty)}</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => navigate('/')} className="btn-primary" style={{ marginTop: 24 }}>{t('navHome')}</button>
      </div>
    );
  }

  return (
    <div className="app-shell reservation">
      <header className="page-header">
        <button onClick={() => navigate(`/restaurant/${id}`)} aria-label={t('back')}>
          <Icon name="arrowLeft" size={22} color="#F2F1EE" />
        </button>
        <h1>{t('reserveTable')}</h1>
      </header>

      <div className="resv-body">
        {restaurant && (
          <div className="resv-restaurant">
            <div className="resv-restaurant__icon" style={{ background: restaurant.tint }}>
              <Icon name={restaurant.icon} size={26} color="#EF9F27" />
            </div>
            <div>
              <div className="resv-restaurant__name">{restaurant.name}</div>
              <div className="resv-restaurant__meta">
                <Icon name="star" size={12} color="#EF9F27" /> {restaurant.rating.toFixed(1)} · Toshkent
              </div>
            </div>
          </div>
        )}

        <div className="resv-label">{t('date')}</div>
        <div className="resv-days no-scrollbar">
          {days.map((d, i) => (
            <button key={i} onClick={() => setDayIdx(i)} className={`resv-day ${i === dayIdx ? 'is-active' : ''}`}>
              <div className="resv-day__label">{d.label}</div>
              <div className="resv-day__num">{d.date.getDate()}</div>
            </button>
          ))}
        </div>

        <div className="resv-label">{t('time')}</div>
        <div className="resv-times">
          {TIMES.map((tm) => (
            <button key={tm} onClick={() => setTime(tm)} className={`resv-time ${tm === time ? 'is-active' : ''}`}>
              {tm}
            </button>
          ))}
        </div>

        <div className="resv-label">{t('guests')}</div>
        <div className="resv-guests">
          <span className="resv-guests__label"><Icon name="users" size={16} color="#9A9A96" /> {t('guests')}</span>
          <div className="qty-control">
            <button onClick={() => setGuests((g) => Math.max(1, g - 1))} className="qty-btn qty-btn--minus" aria-label="−">
              <Icon name="minus" size={16} color="#9A9A96" />
            </button>
            <span className="qty-value">{guests}</span>
            <button onClick={() => setGuests((g) => g + 1)} className="qty-btn qty-btn--plus" aria-label="+">
              <Icon name="plus" size={16} color="#2C1400" />
            </button>
          </div>
        </div>

        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('profile')} className="input-field resv-input" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon" inputMode="tel" className="input-field resv-input" />

        <button onClick={() => { haptic(); setStep('preorder'); }} disabled={!valid} className="btn-primary btn-block">
          {t('confirmReservation')} · {dateLabel}, {time}
        </button>
      </div>
    </div>
  );
}

function PreOrderScreen({ restaurant, reservationInfo, onSkip, onConfirm, onBack, t }) {
  const restaurantDishes = dishes.filter((d) => d.restaurantId === restaurant.id);
  const [selections, setSelections] = useState({});

  const sections = useMemo(() => {
    const map = new Map();
    restaurantDishes.forEach((d) => {
      if (!map.has(d.section)) map.set(d.section, []);
      map.get(d.section).push(d);
    });
    return Array.from(map.entries());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant.id]);

  function setQty(dishId, qty) {
    setSelections((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[dishId];
      else next[dishId] = qty;
      return next;
    });
  }

  const selectedList = Object.entries(selections).map(([dishId, qty]) => ({
    dish: restaurantDishes.find((d) => d.id === dishId),
    qty,
  }));
  const totalCount = selectedList.reduce((s, i) => s + i.qty, 0);
  const totalPrice = selectedList.reduce((s, i) => s + i.dish.price * i.qty, 0);

  return (
    <div className="app-shell reservation">
      <header className="page-header">
        <button onClick={onBack} aria-label={t('back')}><Icon name="arrowLeft" size={22} color="#F2F1EE" /></button>
        <h1>{t('extras')}</h1>
      </header>

      <div className="resv-preorder-hint">
        <div className="resv-preorder-hint__title">
          <Icon name="calendarPlus" size={18} color="#EF9F27" /> {reservationInfo.dateLabel}, {reservationInfo.time}
        </div>
        <div className="resv-preorder-hint__text">
          Kelishingizga tayyor bo'lib tursin — hoziroq tanlang yoki joyida buyurtma bering.
        </div>
      </div>

      <div className="resv-preorder-list">
        {sections.map(([name, list]) => (
          <div key={name}>
            <div className="resv-preorder-section">{name}</div>
            <div className="resv-preorder-dishes">
              {list.map((d) => {
                const qty = selections[d.id] ?? 0;
                return (
                  <div key={d.id} className="resv-preorder-dish">
                    <div className="resv-preorder-dish__photo"><DishPhoto dish={d} height={56} radius={12} iconSize={26} /></div>
                    <div className="resv-preorder-dish__body">
                      <div className="resv-preorder-dish__name">{d.name}</div>
                      <div className="resv-preorder-dish__price">{formatSomShort(d.price)} {t('som')}</div>
                    </div>
                    {qty === 0 ? (
                      <button onClick={() => setQty(d.id, 1)} className="resv-preorder-dish__select">{t('add')}</button>
                    ) : (
                      <div className="qty-control">
                        <button onClick={() => setQty(d.id, qty - 1)} className="qty-btn qty-btn--minus" aria-label="−"><Icon name="minus" size={16} color="#9A9A96" /></button>
                        <span className="qty-value">{qty}</span>
                        <button onClick={() => setQty(d.id, qty + 1)} className="qty-btn qty-btn--plus" aria-label="+"><Icon name="plus" size={16} color="#2C1400" /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="resv-preorder-footer">
        {totalCount > 0 && (
          <div className="resv-preorder-total">
            <span>{totalCount} · {t('addToCart')}</span>
            <span className="resv-preorder-total__price">{formatSom(totalPrice)}</span>
          </div>
        )}
        <div className="resv-preorder-actions">
          <button onClick={onSkip} className="btn-secondary" style={{ flex: 1 }}>{t('cancel')}</button>
          <button onClick={() => onConfirm(selectedList)} disabled={totalCount === 0} className="btn-primary" style={{ flex: 1.4 }}>
            {totalCount > 0 ? `${t('send')} · ${formatSom(totalPrice)}` : t('addToCart')}
          </button>
        </div>
      </div>
    </div>
  );
}

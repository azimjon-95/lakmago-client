import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { haptic } from '@/lib/telegram';
import { useT } from '@/i18n';
import { api } from '@/api';
import { useUser } from '@/store/user';
import { formatSomShort, formatUzDate, uzWeekday } from '@/lib/utils';
import { useRestaurant } from '@/hooks/queries';
import { buildSlots, keepOrReset } from '@/lib/reservationSlots';
import { TimePicker } from './TimePicker';
import { PreOrderScreen } from './PreOrderScreen';
import { RestaurantLocationMap } from './RestaurantLocationMap';
import './Reservation.css';

// Telefon raqamni chiroyli formatlash: +998 90 123 45 67
function formatPhone(v) {
  const digits = String(v).replace(/\D/g, '').slice(0, 12);
  if (!digits) return '';
  let out = '+';
  if (digits.length <= 3) return out + digits;
  out += digits.slice(0, 3);
  if (digits.length > 3) out += ' ' + digits.slice(3, 5);
  if (digits.length > 5) out += ' ' + digits.slice(5, 8);
  if (digits.length > 8) out += ' ' + digits.slice(8, 10);
  if (digits.length > 10) out += ' ' + digits.slice(10, 12);
  return out;
}


function nextDays(count, todayLabel) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    out.push({ date: d, label: i === 0 ? todayLabel : uzWeekday(d) });
  }
  return out;
}

export function ReservationPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const t = useT();
  const { data: restaurant } = useRestaurant(id);

  const days = useMemo(() => nextDays(7, 'Bugun'), []);
  const [dayIdx, setDayIdx] = useState(0);
  const [time, setTime] = useState(null);
  const [timeOpen, setTimeOpen] = useState(false);
  const [guests, setGuests] = useState(4);
  // Profildagi ma'lumot bilan avtomatik to'ldiriladi (qayta yozish shart emas)
  const user = useUser((st) => st.user);
  const [name, setName] = useState(() =>
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim());
  const [phone, setPhone] = useState(() => user?.phone || '');
  const [step, setStep] = useState('form');
  const [preOrderDishes, setPreOrderDishes] = useState([]);

  const selectedDate = days[dayIdx].date;

  // Bo'sh vaqtlar restoran ish vaqtidan hosil qilinadi.
  // Sana o'zgarsa qayta hisoblanadi — bugungi kunda o'tib
  // ketgan vaqtlar chiqmaydi.
  const slots = useMemo(
    () => buildSlots(restaurant, selectedDate),
    [restaurant, selectedDate],
  );

  // Tanlangan vaqt yangi ro'yxatda bo'lmasa — eng yaqiniga o'tadi
  useEffect(() => {
    setTime((prev) => keepOrReset(prev, slots));
  }, [slots]);
  const dateLabel = formatUzDate(selectedDate);
  // Tekshiruv: ism kamida 2 harf, telefon kamida 9 raqam
  const phoneDigits = phone.replace(/\D/g, '');
  const valid = Boolean(time) && name.trim().length >= 2 && phoneDigits.length >= 9;

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const submittingRef = useRef(false);

  // Bronni serverga saqlaydi — restoran shu orqali ko'radi,
  // mijozga bot orqali eslatma keladi.
  async function finishReservation(chosen) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    setSaveError(null);

    // Sana YYYY-MM-DD formatida (server shuni kutadi)
    const d = selectedDate;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    try {
      await api.createReservation({
        restaurantId: id,
        restaurantName: restaurant?.name || 'Restoran',
        date: dateStr,
        time,
        guests,
        name: name.trim(),
        phone: phone.trim(),
        // Oldindan tanlangan taomlar izohga yoziladi
        // Oldindan tanlangan taomlar — nom va soni bilan
        preOrder: chosen
          .filter((c) => c.dish)
          .map((c) => ({
            dishId: c.dish.id || c.dish._id,
            name: c.dish.name,
            quantity: c.qty || 1,
            price: c.dish.price || 0,
          })),
        note: '',
      });
      setPreOrderDishes(chosen);
      setStep('done');
    } catch (e) {
      setSaveError(e.message || 'Bron saqlanmadi');
      submittingRef.current = false;
    } finally {
      setSaving(false);
    }
  }

  if (step === 'preorder' && restaurant) {
    return (
      <PreOrderScreen
        restaurant={restaurant}
        reservationInfo={{ dateLabel, time, guests }}
        onCancelAll={() => { haptic(); navigate(-1); }}
        onConfirm={(chosen) => finishReservation(chosen)}
        saving={saving}
        saveError={saveError}
        onBack={() => setStep('form')}
        t={t}
      />
    );
  }

  if (step === 'done') {
    return (
      <div className="app-shell resv-done">
        <div className="resv-done__icon"><Icon name="calendarPlus" size={32} color="var(--brand)" /></div>
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
        {/* replace: true — tarix stekiga yangi yozuv qo'shmaydi.
            Aks holda Restoran<->Bron orasida bir necha marta
            o'tilsa, stek o'sib ketib, boshqa sahifalardagi
            "orqaga" tugmalari kutilmagan joyga olib borardi. */}
        <button onClick={() => navigate(`/restaurant/${id}`, { replace: true })} aria-label={t('back')}>
          <Icon name="arrowLeft" size={22} color="var(--ink)" />
        </button>
        <h1>{t('reserveTable')}</h1>
      </header>

      <div className="resv-body">
        {restaurant && (
          <div className="resv-restaurant">
            <div className="resv-restaurant__icon" style={{ background: restaurant.tint }}>
              <Icon name={restaurant.icon} size={26} color="var(--brand)" />
            </div>
            <div>
              <div className="resv-restaurant__name">{restaurant.name}</div>
              <div className="resv-restaurant__meta">
                <Icon name="star" size={12} color="var(--brand)" /> {restaurant.rating.toFixed(1)} · Toshkent
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
        <TimePicker
          value={time}
          slots={slots}
          onChange={setTime}
          open={timeOpen}
          onOpen={() => setTimeOpen(true)}
          onClose={() => setTimeOpen(false)}
        />

        <div className="resv-label">{t('guests')}</div>
        <div className="resv-guests">
          <span className="resv-guests__label"><Icon name="users" size={16} color="var(--muted)" /> {t('guests')}</span>
          <div className="qty-control">
            <button onClick={() => setGuests((g) => Math.max(1, g - 1))} className="qty-btn qty-btn--minus" aria-label="−">
              <Icon name="minus" size={16} color="var(--muted)" />
            </button>
            <span className="qty-value">{guests}</span>
            <button onClick={() => setGuests((g) => g + 1)} className="qty-btn qty-btn--plus" aria-label="+">
              <Icon name="plus" size={16} color="var(--brand-text)" />
            </button>
          </div>
        </div>

        {/* Aloqa ma'lumotlari — restoran siz bilan bog'lanishi uchun */}
        <div className="resv-field">
          <label className="resv-field__label">Ism va familiya *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Masalan: Aziz Karimov"
            autoComplete="name"
            className="input-field resv-input"
          />
        </div>

        <div className="resv-field">
          <label className="resv-field__label">Telefon raqam *</label>
          <input
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="+998 90 123 45 67"
            inputMode="tel"
            autoComplete="tel"
            className="input-field resv-input"
          />
          <p className="resv-field__hint">Restoran bron bo'yicha shu raqamga qo'ng'iroq qiladi</p>
        </div>

        <RestaurantLocationMap restaurant={restaurant} />

        <button onClick={() => { haptic(); setStep('preorder'); }} disabled={!valid} className="btn-primary btn-block">
          {t('confirmReservation')}{time ? ` · ${dateLabel}, ${time}` : ''}
        </button>
      </div>
    </div>
  );
}

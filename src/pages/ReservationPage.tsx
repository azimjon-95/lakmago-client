import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { DishPhoto } from '@/components/DishPhoto';
import { haptic } from '@/lib/telegram';
import { formatSom, formatSomShort } from '@/lib/utils';
import { restaurants, dishes } from '@/data/mock';
import type { Dish, Restaurant } from '@/types';

const TIMES = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30'];
const WEEKDAYS = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Sha'];

function nextDays(count: number) {
  const out: { date: Date; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    out.push({ date: d, label: i === 0 ? 'Bugun' : WEEKDAYS[d.getDay()] });
  }
  return out;
}

export function ReservationPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const restaurant = restaurants.find((r) => r.id === id);

  const days = useMemo(() => nextDays(7), []);
  const [dayIdx, setDayIdx] = useState(0);
  const [time, setTime] = useState('18:30');
  const [guests, setGuests] = useState(4);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'form' | 'preorder' | 'done'>('form');
  const [preOrderDishes, setPreOrderDishes] = useState<{ dish: Dish; qty: number }[]>([]);

  const selectedDate = days[dayIdx].date;
  const dateLabel = selectedDate.toLocaleDateString('uz', { day: 'numeric', month: 'long' });
  const valid = name.trim().length >= 2 && phone.trim().length >= 7;

  function goToPreOrder() {
    haptic();
    setStep('preorder');
  }

  function finishReservation(chosen: { dish: Dish; qty: number }[]) {
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
      />
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-surface max-w-[420px] mx-auto flex flex-col items-center justify-center px-8 text-center">
        <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center">
          <Icon name="calendarPlus" size={32} color="#EF9F27" />
        </div>
        <div className="text-lg font-medium text-ink mt-4">So'rov yuborildi</div>
        <p className="text-sm text-muted mt-1.5 leading-relaxed">
          {restaurant?.name} · {dateLabel}, {time}, {guests} kishi.
          <br />
          Restoran tasdiqlagach, xabar keladi.
        </p>
        {preOrderDishes.length > 0 && (
          <div className="mt-3.5 w-full bg-brand-50 rounded-xl p-3.5 text-left">
            <div className="text-xs font-medium text-brand-800 mb-1.5">OLDINDAN TANLANGAN TAOMLAR</div>
            {preOrderDishes.map((d) => (
              <div key={d.dish.id} className="text-[13px] text-brand-text flex justify-between py-0.5">
                <span>{d.dish.name} ×{d.qty}</span>
                <span>{formatSomShort(d.dish.price * d.qty)}</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => navigate('/')} className="mt-6 bg-brand-ink text-white text-sm font-medium px-6 py-3 rounded-xl">
          Bosh sahifaga qaytish
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface max-w-[420px] mx-auto flex flex-col">
      <div className="px-4 py-3.5 flex items-center gap-3 border-b border-line">
        <button onClick={() => navigate(`/restaurant/${id}`)} aria-label="Orqaga">
          <Icon name="arrowLeft" size={22} color="#1A1A17" />
        </button>
        <div className="text-lg font-medium text-ink">Stol bron qilish</div>
      </div>

      <div className="p-4">
        {restaurant && (
          <div className="flex gap-3 items-center mb-5">
            <div className="w-[52px] h-[52px] rounded-xl flex items-center justify-center" style={{ background: restaurant.tint }}>
              <Icon name={restaurant.icon} size={26} color="#EF9F27" />
            </div>
            <div>
              <div className="text-[15px] font-medium text-ink">{restaurant.name}</div>
              <div className="text-xs text-muted flex items-center gap-1">
                <Icon name="star" size={12} color="#EF9F27" /> {restaurant.rating.toFixed(1)} · Toshkent
              </div>
            </div>
          </div>
        )}

        <div className="text-[13px] font-medium text-ink mb-2">Sana</div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5">
          {days.map((d, i) => {
            const active = i === dayIdx;
            return (
              <button
                key={i}
                onClick={() => setDayIdx(i)}
                className="flex-none text-center px-3.5 py-2 rounded-xl"
                style={active ? { background: '#411E00' } : { border: '0.5px solid #EAE7DF' }}
              >
                <div className="text-[11px]" style={{ color: active ? '#FAC775' : '#9A9A94' }}>{d.label}</div>
                <div className="text-base font-medium" style={{ color: active ? '#fff' : '#1A1A17' }}>{d.date.getDate()}</div>
              </button>
            );
          })}
        </div>

        <div className="text-[13px] font-medium text-ink mb-2">Vaqt</div>
        <div className="flex flex-wrap gap-2 mb-5">
          {TIMES.map((t) => {
            const active = t === time;
            return (
              <button
                key={t}
                onClick={() => setTime(t)}
                className="px-4 py-2 rounded-xl text-sm"
                style={active ? { background: '#EF9F27', color: '#2C1400', fontWeight: 500 } : { border: '0.5px solid #EAE7DF', color: '#1A1A17' }}
              >
                {t}
              </button>
            );
          })}
        </div>

        <div className="text-[13px] font-medium text-ink mb-2">Mehmonlar soni</div>
        <div className="flex items-center justify-between border border-line rounded-xl px-4 py-2.5 mb-4">
          <span className="text-sm text-ink flex items-center gap-1.5">
            <Icon name="users" size={16} color="#6B6B66" /> Kishilar
          </span>
          <div className="flex items-center gap-4">
            <button onClick={() => setGuests((g) => Math.max(1, g - 1))} aria-label="Kamaytirish">
              <Icon name="minus" size={18} color="#9A9A94" />
            </button>
            <span className="text-base font-medium text-ink w-4 text-center">{guests}</span>
            <button onClick={() => setGuests((g) => g + 1)} aria-label="Ko'paytirish">
              <Icon name="plus" size={18} color="#BA7517" />
            </button>
          </div>
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ismingiz"
          className="w-full box-border px-3.5 py-3 border border-line rounded-xl text-[16px] mb-2.5 outline-none focus:border-brand-400"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Telefon raqamingiz"
          inputMode="tel"
          className="w-full box-border px-3.5 py-3 border border-line rounded-xl text-[16px] mb-4 outline-none focus:border-brand-400"
        />

        <button
          onClick={goToPreOrder}
          disabled={!valid}
          className="w-full text-white text-[15px] font-medium py-3.5 rounded-xl transition-opacity disabled:opacity-50"
          style={{ background: '#411E00' }}
        >
          Bron qilish · {dateLabel}, {time}
        </button>
      </div>
    </div>
  );
}

function PreOrderScreen({
  restaurant,
  reservationInfo,
  onSkip,
  onConfirm,
  onBack,
}: {
  restaurant: Restaurant;
  reservationInfo: { dateLabel: string; time: string; guests: number };
  onSkip: () => void;
  onConfirm: (chosen: { dish: Dish; qty: number }[]) => void;
  onBack: () => void;
}) {
  const restaurantDishes = dishes.filter((d) => d.restaurantId === restaurant.id);
  const [selections, setSelections] = useState<Record<string, number>>({});

  const sections = useMemo(() => {
    const map = new Map<string, Dish[]>();
    restaurantDishes.forEach((d) => {
      if (!map.has(d.section)) map.set(d.section, []);
      map.get(d.section)!.push(d);
    });
    return Array.from(map.entries());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant.id]);

  function setQty(dishId: string, qty: number) {
    setSelections((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[dishId];
      else next[dishId] = qty;
      return next;
    });
  }

  const selectedList = Object.entries(selections).map(([dishId, qty]) => ({
    dish: restaurantDishes.find((d) => d.id === dishId)!,
    qty,
  }));
  const totalCount = selectedList.reduce((s, i) => s + i.qty, 0);
  const totalPrice = selectedList.reduce((s, i) => s + i.dish.price * i.qty, 0);

  return (
    <div className="min-h-screen bg-surface max-w-[420px] mx-auto flex flex-col">
      <div className="px-4 py-3.5 flex items-center gap-3 border-b border-line">
        <button onClick={onBack} aria-label="Orqaga">
          <Icon name="arrowLeft" size={22} color="#1A1A17" />
        </button>
        <div className="text-lg font-medium text-ink">Oldindan taom tanlash</div>
      </div>

      <div className="m-4 bg-brand-50 rounded-2xl p-3.5">
        <div className="text-sm font-medium text-brand-text flex items-center gap-2">
          <Icon name="calendarPlus" size={18} color="#BA7517" /> Stolingiz {reservationInfo.dateLabel}, {reservationInfo.time} ga bron qilindi
        </div>
        <div className="text-[13px] text-brand-800 mt-1.5 leading-relaxed">
          Qaysi taomlar siz kelishingizga tayyor bo'lib tursin? Xohlasangiz hoziroq tanlang, xohlasangiz joyida buyurtma bering.
        </div>
      </div>

      <div className="flex-1">
        {sections.map(([name, list]) => (
          <div key={name}>
            <div className="px-4 pt-2.5 pb-1.5 text-[15px] font-medium text-ink">{name}</div>
            <div className="px-4 pb-2.5 flex flex-col gap-3">
              {list.map((d) => {
                const qty = selections[d.id] ?? 0;
                return (
                  <div key={d.id} className="flex gap-3 items-center">
                    <div className="w-14 h-14 flex-none">
                      <DishPhoto dish={d} height={56} radius={12} iconSize={26} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink">{d.name}</div>
                      <div className="text-[13px] text-muted mt-0.5">{formatSomShort(d.price)} so'm</div>
                    </div>
                    {qty === 0 ? (
                      <button
                        onClick={() => setQty(d.id, 1)}
                        className="px-3.5 py-1.5 rounded-[10px] text-[13px] font-medium text-[#BA7517]"
                        style={{ border: '1px solid #EF9F27' }}
                      >
                        Tanlash
                      </button>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <button onClick={() => setQty(d.id, qty - 1)} className="w-7 h-7 rounded-lg border border-line flex items-center justify-center" aria-label="Kamaytirish">
                          <Icon name="minus" size={16} color="#6B6B66" />
                        </button>
                        <span className="text-[15px] font-medium text-ink w-3 text-center">{qty}</span>
                        <button onClick={() => setQty(d.id, qty + 1)} className="w-7 h-7 rounded-lg bg-brand-400 flex items-center justify-center" aria-label="Ko'paytirish">
                          <Icon name="plus" size={16} color="#2C1400" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 bg-surface border-t border-line p-4 flex flex-col gap-2.5">
        {totalCount > 0 && (
          <div className="flex justify-between text-[13px] text-muted px-0.5">
            <span>{totalCount} ta taom tanlandi</span>
            <span className="text-ink font-medium">{formatSom(totalPrice)}</span>
          </div>
        )}
        <div className="flex gap-2.5">
          <button onClick={onSkip} className="flex-1 bg-surface text-muted text-sm font-medium py-3.5 rounded-xl border border-line">
            Joyida tanlayman
          </button>
          <button
            onClick={() => onConfirm(selectedList)}
            disabled={totalCount === 0}
            className="flex-[1.4] bg-brand-ink text-white text-sm font-medium py-3.5 rounded-xl disabled:opacity-50"
          >
            {totalCount > 0 ? `Tanlab yuborish · ${formatSom(totalPrice)}` : 'Taom tanlang'}
          </button>
        </div>
      </div>
    </div>
  );
}

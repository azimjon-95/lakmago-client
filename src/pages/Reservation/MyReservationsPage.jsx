import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { BottomNav } from '@/components/BottomNav';
import { api } from '@/api';
import { haptic } from '@/lib/telegram';
import './MyReservations.css';

const STATUS = {
  pending: { label: 'Tasdiq kutilmoqda', cls: 'is-pending' },
  confirmed: { label: 'Tasdiqlandi', cls: 'is-ok' },
  coming: { label: 'Boramiz', cls: 'is-ok' },
  on_way: { label: "Yo'ldamiz", cls: 'is-ok' },
  arrived: { label: 'Keldik', cls: 'is-ok' },
  completed: { label: 'Yakunlandi', cls: 'is-done' },
  rejected: { label: 'Rad etildi', cls: 'is-bad' },
  cancelled: { label: 'Bekor qilindi', cls: 'is-done' },
  not_coming: { label: 'Bora olmaymiz', cls: 'is-bad' },
};

export function MyReservationsPage() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    api.getMyReservations()
      .then(setList)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const cancel = async (id) => {
    haptic();
    if (!window.confirm('Bronni bekor qilasizmi?')) return;
    setBusyId(id);
    try {
      await api.cancelReservation(id);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const canCancel = (s) => ['pending', 'confirmed', 'coming'].includes(s);

  return (
    <div className="app-shell">
      <header className="myresv-header">
        <button onClick={() => navigate(-1)} aria-label="Orqaga" className="myresv-header__btn">
          <Icon name="arrowLeft" size={22} color="#F7F2EA" />
        </button>
        <h1 className="myresv-header__title">Bronlarim</h1>
      </header>

      <div className="myresv-body">
        {loading ? (
          <div className="myresv-empty">Yuklanmoqda...</div>
        ) : list.length === 0 ? (
          <div className="myresv-empty">
            <Icon name="calendarPlus" size={44} color="#7D7264" />
            <div className="myresv-empty__title">Bron yo'q</div>
            <p className="myresv-empty__hint">
              Restoran sahifasidan stol bron qilishingiz mumkin
            </p>
          </div>
        ) : (
          list.map((r) => {
            const st = STATUS[r.status] || { label: r.status, cls: '' };
            return (
              <div key={r._id} className="myresv-card">
                <div className="myresv-card__top">
                  <span className="myresv-card__name">{r.restaurantName}</span>
                  <span className={`myresv-card__status ${st.cls}`}>{st.label}</span>
                </div>
                <div className="myresv-card__row">
                  <Icon name="clock" size={14} color="#A99C8C" />
                  {r.date} · {r.time}
                  <span className="myresv-card__sep" />
                  <Icon name="users" size={14} color="#A99C8C" />
                  {r.guests} kishi
                </div>
                {r.note && <div className="myresv-card__note">Izoh: {r.note}</div>}
                {r.rejectReason && (
                  <div className="myresv-card__reject">Sabab: {r.rejectReason}</div>
                )}
                {canCancel(r.status) && (
                  <button
                    onClick={() => cancel(r._id)}
                    disabled={busyId === r._id}
                    className="myresv-card__cancel"
                  >
                    {busyId === r._id ? '...' : 'Bekor qilish'}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
}

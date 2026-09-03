import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { BottomNav } from '@/components/BottomNav';
import { api } from '@/api';
import { haptic } from '@/lib/telegram';
import { useT } from '@/i18n';
import './MyReservations.css';

const STATUS_KEYS = {
  pending: { key: 'statusPending', cls: 'is-pending' },
  confirmed: { key: 'statusConfirmed', cls: 'is-ok' },
  coming: { key: 'statusComing', cls: 'is-ok' },
  on_way: { key: 'statusOnWay', cls: 'is-ok' },
  arrived: { key: 'statusArrived', cls: 'is-ok' },
  completed: { key: 'statusCompleted', cls: 'is-done' },
  rejected: { key: 'statusRejected', cls: 'is-bad' },
  cancelled: { key: 'statusCancelled', cls: 'is-done' },
  not_coming: { key: 'statusNotComing', cls: 'is-bad' },
};

export function MyReservationsPage() {
  const t = useT();
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
    if (!window.confirm(t('cancelBookingConfirm'))) return;
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
        <button onClick={() => navigate(-1)} aria-label={t('back')} className="myresv-header__btn">
          <Icon name="arrowLeft" size={22} color="var(--ink)" />
        </button>
        <h1 className="myresv-header__title">{t('myReservations')}</h1>
      </header>

      <div className="myresv-body">
        {loading ? (
          <div className="myresv-empty">{t('loading')}</div>
        ) : list.length === 0 ? (
          <div className="myresv-empty">
            <Icon name="calendarPlus" size={44} color="var(--muted-2)" />
            <div className="myresv-empty__title">{t('noReservationsTitle')}</div>
            <p className="myresv-empty__hint">
              {t('noReservationsHint')}
            </p>
          </div>
        ) : (
          list.map((r) => {
            const stDef = STATUS_KEYS[r.status];
            const st = stDef ? { label: t(stDef.key), cls: stDef.cls } : { label: r.status, cls: '' };
            return (
              <div key={r._id} className="myresv-card">
                <div className="myresv-card__top">
                  <span className="myresv-card__name">{r.restaurantName}</span>
                  <span className={`myresv-card__status ${st.cls}`}>{st.label}</span>
                </div>
                <div className="myresv-card__row">
                  <Icon name="clock" size={14} color="var(--muted)" />
                  {r.date} · {r.time}
                  <span className="myresv-card__sep" />
                  <Icon name="users" size={14} color="var(--muted)" />
                  {r.guests} {t('guestsCount')}
                </div>
                {r.note && <div className="myresv-card__note">{t('noteLabel')}: {r.note}</div>}
                {r.rejectReason && (
                  <div className="myresv-card__reject">{t('reasonLabel')}: {r.rejectReason}</div>
                )}
                {canCancel(r.status) && (
                  <button
                    onClick={() => cancel(r._id)}
                    disabled={busyId === r._id}
                    className="myresv-card__cancel"
                  >
                    {busyId === r._id ? '...' : t('cancelBooking')}
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

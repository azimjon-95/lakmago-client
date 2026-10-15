import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrders } from '@/store/orders';
import { useT } from '@/i18n';
import { Icon } from '@/components/Icon';
import './ActiveOrderBadge.css';

/*
 * ═══ "SIZNING BUYURTMANGIZ" NISHONI ═══
 * Buyurtma berilgach bosh sahifada chiqadi; bosilsa shu buyurtmaning kuzatuv sahifasi ochiladi.
 *
 *  • Holat JONLI almashadi (soket + davriy so'rov — hooks/useActiveOrderSync): Tasdiq kutilmoqda →
 *    Qabul qilindi → Tayyorlanmoqda → Tayyor → Yo'lda. Almashganda matn tepaga siljib o'zgaradi,
 *    ikonka sakraydi, nishon bir lahza yaltirab oladi, pastdagi 5 bosqichli chiziq to'lib boradi.
 *  • Buyurtma YAKUNLANSA yoki bekor qilinsa — nishon ko'rinmaydi (qaytib chiqmaydi).
 *  • Sahifa yangilansa ham chiqib turadi — faol buyurtma serverdan tiklanadi.
 *  Ko'rinish joyi (faqat bosh sahifa) — App.jsx FloatingLayer.
 */
const STAGES = [
  { key: 'pending', i18n: 'orderPending', icon: 'clock' },
  { key: 'accepted', i18n: 'orderAccepted', icon: 'check' },
  { key: 'preparing', i18n: 'orderPreparing', icon: 'flame' },
  { key: 'ready', i18n: 'orderReady', icon: 'bag' },
  { key: 'delivering', i18n: 'orderDelivering', icon: 'scooter' },
];
const FINISHED = ['delivered', 'cancelled'];

/** Sub-buyurtmaning bosqichi (haqiqiy holatdan) */
function stageOf(sub) {
  const raw = sub.rawStatus || sub.status;
  const i = STAGES.findIndex((s) => s.key === raw);
  if (i >= 0) return i;
  if (sub.status === 'accepted') return 1;
  return 1;
}

export function ActiveOrderBadge() {
  const navigate = useNavigate();
  const activeOrder = useOrders((s) => s.activeOrder);
  const t = useT();
  const subs = activeOrder?.subOrders || [];
  const open = subs.filter((s) => !FINISHED.includes(s.rawStatus || s.status));

  // Bir nechta restoran bo'lsa — eng "orqada" turgani ko'rsatiladi
  const stage = open.length ? Math.min(...open.map(stageOf)) : -1;
  const prev = useRef(stage);
  const [changed, setChanged] = useState(0);
  useEffect(() => {
    if (stage >= 0 && prev.current >= 0 && stage !== prev.current) {
      setChanged((n) => n + 1);          // key o'zgaradi → animatsiya qayta ishga tushadi
    }
    prev.current = stage;
  }, [stage]);

  // Hammasi yakunlangan / buyurtma yo'q — nishon yo'q
  if (!activeOrder || !open.length) return null;

  const cur = STAGES[stage];
  const goTrack = () => {
    const s = open[0];
    navigate(s?.backendId ? `/order/track/${s.backendId}` : '/order/track');
  };

  return (
    <button
      type="button"
      className={`aob${changed ? ' aob--flash' : ''}`}
      key={`aob-${changed}`}
      onClick={goTrack}
      aria-live="polite"
    >
      <span className="aob__row">
        <span className="aob__icon" key={cur.key}>
          <Icon name={cur.icon} size={20} color="#fff" strokeWidth={2.4} />
        </span>
        <span className="aob__text">
          <span className="aob__title">{t('yourOrder')}</span>
          <span className="aob__status" key={cur.key}>
            <i className="aob__live" aria-hidden="true" />
            {t(cur.i18n)}
          </span>
        </span>
        <span className="aob__arrow" aria-hidden="true">›</span>
      </span>
      <span className="aob__bar" aria-hidden="true">
        {STAGES.map((s, i) => (
          <span key={s.key} className={`aob__seg${i < stage ? ' is-done' : ''}${i === stage ? ' is-now' : ''}`} />
        ))}
      </span>
    </button>
  );
}

import { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { useT } from '@/i18n';
import { isOpenNow, isOffToday, workHoursLabel } from '@/lib/workHours';
import './AllStores.css';

/*
 * "Barcha do'konlar" — sahifa pastidagi ixcham ro'yxat: kategoriya filtridan
 * QAT'I NAZAR hamma do'kon (ochiqlari oldinda). Katta kartalar yuqorida ("Do'konlar").
 */
const optimize = (url) => (url && url.includes('/upload/') ? url.replace('/upload/', '/upload/f_auto,q_auto,w_160,c_fill/') : url);

const Row = memo(function Row({ store: s }) {
  const t = useT();
  const navigate = useNavigate();
  const id = s.id || s._id;
  const open = s.isOpen === false ? false : isOpenNow(s);
  const off = isOffToday(s);
  const hours = workHoursLabel(s);
  const img = optimize(s.imageUrl || (s.images || []).find((u) => typeof u === 'string' && u.startsWith('http')));
  return (
    <button type="button" className="mas-row" onClick={() => navigate(`/restaurant/${id}`)}>
      <span className="mas-row__thumb">
        {img ? <img src={img} alt="" loading="lazy" decoding="async" /> : <span className="mas-row__emoji" aria-hidden="true">🏪</span>}
      </span>
      <span className="mas-row__body">
        <span className="mas-row__name">{s.name}</span>
        {(s.cuisine || s.description) && <span className="mas-row__desc">{s.cuisine || s.description}</span>}
        <span className="mas-row__meta">
          <span className={`mas-row__status ${open ? 'is-open' : 'is-closed'}`}>
            {open ? t('currentlyOpen') : (off ? t('closedToday') : t('currentlyClosed'))}
          </span>
          {hours && <span className="mas-row__hours"><Icon name="clock" size={11} color="currentColor" /> {hours}</span>}
        </span>
      </span>
      <Icon name="chevronRight" size={18} color="var(--muted)" />
    </button>
  );
});

export function AllStores({ stores }) {
  const t = useT();
  const sorted = useMemo(
    () => [...stores].sort((a, b) => Number(b.isOpen !== false) - Number(a.isOpen !== false) || String(a.name).localeCompare(String(b.name))),
    [stores],
  );
  if (!sorted.length) return null;
  return (
    <section className="mas">
      <h2 className="home-restaurants-title">{t('allStores')}</h2>
      <div className="mas__list">
        {sorted.map((s) => <Row key={s.id || s._id} store={s} />)}
      </div>
    </section>
  );
}

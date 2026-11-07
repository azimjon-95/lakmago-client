import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/Icon';
import { useT } from '@/i18n';
import '@/components/MarketCategories/MarketCategories.css';
import './MarketStoreSort.css';

/*
 * "Sizga yaqin do'konlar ⌄" tugmasi (dizayn maketi) + saralash oynasi: yaqin / reyting / tez yetkazish.
 * Joylashuv faqat foydalanuvchi "Sizga yaqin" ni TANLAGANDA so'raladi (ilova ochilishida hech narsa so'ralmaydi).
 */
const OPTIONS = [
  { id: 'near', icon: 'pin', label: 'storeSortNear' },
  { id: 'rating', icon: 'star', label: 'storeSortRating' },
  { id: 'fast', icon: 'zap', label: 'storeSortFast' },
];

export function MarketStoreSort({ mode, onChange, locating = false, note = '' }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const cur = OPTIONS.find((o) => o.id === mode) || OPTIONS[0];

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <>
      <button type="button" className="msort" onClick={() => setOpen(true)} aria-haspopup="dialog" data-testid="market-sort">
        {locating ? <span className="msort__spin" aria-hidden="true" /> : <Icon name={cur.icon} size={13} strokeWidth={2.4} />}
        <span className="msort__label">{t(cur.label)}</span>
        <Icon name="chevronDown" size={13} strokeWidth={2.4} />
      </button>
      {note && <div className="msort__note" role="status">{note}</div>}
      {open && createPortal(
        <div className="mcsheet" role="dialog" aria-modal="true" aria-label={t('storeSortTitle')} data-testid="market-sort-sheet">
          <div className="mcsheet__backdrop" onClick={() => setOpen(false)} />
          <div className="mcsheet__panel">
            <div className="mcsheet__handle" aria-hidden="true" />
            <div className="mcsheet__head">
              <h3>{t('storeSortTitle')}</h3>
              <button type="button" className="mcsheet__close" onClick={() => setOpen(false)} aria-label={t('close')}><Icon name="x" size={18} strokeWidth={2.4} /></button>
            </div>
            <div className="msort__list">
              {OPTIONS.map((o) => (
                <button key={o.id} type="button" className={`msort__opt ${o.id === mode ? 'is-on' : ''}`} aria-pressed={o.id === mode}
                  onClick={() => { setOpen(false); onChange(o.id); }} data-testid={`market-sort-${o.id}`}>
                  <span className="msort__optic"><Icon name={o.icon} size={18} strokeWidth={2.2} /></span>
                  <span className="msort__optlabel">{t(o.label)}</span>
                  {o.id === mode && <Icon name="check" size={18} strokeWidth={2.6} />}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

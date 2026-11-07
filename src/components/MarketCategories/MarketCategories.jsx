import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/Icon';
import { MARKET_HOME_CATEGORIES, catImage, homeCatLabel } from '@/data/marketHomeCategories';
import './MarketCategories.css';

/*
 * ═══ MARKET: KATEGORIYALAR (dizayn maketi 1:1) ═══
 *   [■ Barchasi] (●)(●)(●)(●)(●) [› Boshqa kategoriyalar]
 * Qatorda "Barchasi" + `visible` ta kategoriya (avval MAHSULOTI BORLARI, keyin ro'yxat tartibi) + "Boshqa kategoriyalar".
 * "Boshqa kategoriyalar" — pastdan chiqadigan oynada BARCHA kategoriyalar (4 ustunli setka).
 * Tanlangan kategoriya qatorda doim ko'rinadi (yashirinlar orasida bo'lsa — birinchi o'ringa chiqadi).
 * `available` (Set | null): mahsuloti bor kalitlar; yo'qlari xira (bosish mumkin).
 */
export function MarketCategories({
  value, onChange, available = null, lang = 'uz', visible = 4,
  allLabel = 'Barchasi', moreLabel = 'Boshqa kategoriyalar', sheetTitle = 'Barcha kategoriyalar', ariaLabel = '', closeLabel = 'Yopish',
}) {
  const [open, setOpen] = useState(false);

  const row = useMemo(() => {
    const has = (c) => (available ? available.has(c.key) : true);
    const ordered = [...MARKET_HOME_CATEGORIES.filter(has), ...MARKET_HOME_CATEGORIES.filter((c) => !has(c))];
    let first = ordered.slice(0, visible);
    if (value !== 'all' && !first.some((c) => c.key === value)) {
      const sel = MARKET_HOME_CATEGORIES.find((c) => c.key === value);
      if (sel) first = [sel, ...first.slice(0, visible - 1)];
    }
    return first;
  }, [available, value, visible]);

  const pick = (key) => { onChange(key); setOpen(false); };
  const dim = (key) => Boolean(available) && !available.has(key);

  return (
    <>
      <div className="mcats" role="group" aria-label={ariaLabel} data-testid="market-cats">
        <button type="button" className={`mcat mcat--all ${value === 'all' ? 'is-active' : ''}`} aria-pressed={value === 'all'} onClick={() => pick('all')} data-testid="mcat-all">
          <span className="mcat__art"><Icon name="layoutGrid" size={22} strokeWidth={2.2} /></span>
          <span className="mcat__label">{allLabel}</span>
        </button>
        {row.map((c) => (
          <CatTile key={c.key} c={c} lang={lang} active={value === c.key} dim={dim(c.key)} onClick={() => pick(value === c.key ? 'all' : c.key)} />
        ))}
        <button type="button" className="mcat mcat--more" onClick={() => setOpen(true)} aria-haspopup="dialog" data-testid="mcat-more">
          <span className="mcat__art"><Icon name="chevronRight" size={18} strokeWidth={2.4} /></span>
          <span className="mcat__label">{moreLabel}</span>
        </button>
      </div>
      {open && (
        <CategorySheet title={sheetTitle} closeLabel={closeLabel} onClose={() => setOpen(false)}>
          <button type="button" className={`mcat mcat--all mcat--lg ${value === 'all' ? 'is-active' : ''}`} aria-pressed={value === 'all'} onClick={() => pick('all')}>
            <span className="mcat__art"><Icon name="layoutGrid" size={26} strokeWidth={2.2} /></span>
            <span className="mcat__label">{allLabel}</span>
          </button>
          {MARKET_HOME_CATEGORIES.map((c) => (
            <CatTile key={c.key} c={c} lang={lang} large active={value === c.key} dim={dim(c.key)} onClick={() => pick(c.key)} />
          ))}
        </CategorySheet>
      )}
    </>
  );
}

function CatTile({ c, lang, active, dim, large = false, onClick }) {
  const img = catImage(c.key);
  return (
    <button type="button" aria-pressed={active} data-testid={`mcat-${c.key}`} onClick={onClick}
      className={`mcat ${large ? 'mcat--lg' : ''} ${active ? 'is-active' : ''} ${dim ? 'is-empty' : ''}`}>
      <span className="mcat__art">
        {img
          ? <img src={img} alt="" width="64" height="64" loading="lazy" decoding="async" draggable="false" />
          : <span className="mcat__emoji" aria-hidden="true">{c.emoji}</span>}
      </span>
      <span className="mcat__label">{homeCatLabel(c, lang)}</span>
    </button>
  );
}

/** Pastdan chiqadigan oyna: barcha kategoriyalar. Esc / fon / X yopadi; orqa sahifa skrolli qulflanadi. */
function CategorySheet({ title, closeLabel, onClose, children }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [onClose]);
  return createPortal(
    <div className="mcsheet" role="dialog" aria-modal="true" aria-label={title} data-testid="mcat-sheet">
      <div className="mcsheet__backdrop" onClick={onClose} />
      <div className="mcsheet__panel">
        <div className="mcsheet__handle" aria-hidden="true" />
        <div className="mcsheet__head">
          <h3>{title}</h3>
          <button type="button" className="mcsheet__close" onClick={onClose} aria-label={closeLabel}><Icon name="x" size={18} strokeWidth={2.4} /></button>
        </div>
        <div className="mcsheet__grid">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

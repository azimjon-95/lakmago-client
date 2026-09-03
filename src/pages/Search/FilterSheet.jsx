import { Icon } from '@/components/Icon';
import { CategoryIcon } from '@/components/CategoryIcons/CategoryIcon';
import { haptic } from '@/lib/telegram';
import { CATEGORIES as CATS } from '@/data/categories';
import { useT } from '@/i18n';

// Maxsus istaklar (Uzum uslubida)
export const SPECIALS = [
  { id: 'discount', labelKey: 'specialDiscount', icon: 'discount', color: 'var(--appetite)' },
  { id: 'free', labelKey: 'specialFreeDelivery', icon: 'bike', color: 'var(--success)' },
  { id: 'top', labelKey: 'specialTopRating', icon: 'star', color: 'var(--brand-100)' },
  { id: 'fresh', labelKey: 'specialFresh', icon: 'flame', color: 'var(--brand)' },
];

// Yetkazish vaqti
export const TIMES = [30, 45, 60, null]; // null = 60+

// Kategoriyalar markaziy ro'yxatdan — bosh sahifa bilan bir xil
export { CATEGORIES } from '@/data/categories';

// Saralash
export const SORTS = [
  { id: 'default', labelKey: 'sortDefault' },
  { id: 'rating', labelKey: 'sortRating' },
  { id: 'fast', labelKey: 'sortFast' },
];

export function FilterSheet({
  specials, setSpecials,
  maxTime, setMaxTime,
  categories, setCategories,
  sort, setSort,
  onReset, onClose, resultCount,
}) {
  const t = useT();
  const toggleSpecial = (id) => {
    haptic();
    setSpecials((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };
  const toggleCategory = (id) => {
    haptic();
    setCategories((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  return (
    <div className="filter-overlay" onClick={onClose}>
      <div className="filter-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="filter-sheet__grabber" />

        <div className="filter-sheet__header">
          <h2 className="filter-sheet__title">{t('filterTitle')}</h2>
          <button onClick={onClose} className="filter-sheet__close" aria-label={t('close')}>
            <Icon name="x" size={20} color="var(--muted)" />
          </button>
        </div>

        <div className="filter-sheet__body">
          {/* Maxsus istaklar */}
          <section className="filter-block">
            <h3 className="filter-block__title">{t('specialWishesTitle')}</h3>
            <div className="filter-specials">
              {SPECIALS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleSpecial(s.id)}
                  className={`filter-special ${specials.includes(s.id) ? 'is-active' : ''}`}
                >
                  <Icon name={s.icon} size={17} color={s.color} />
                  <span>{t(s.labelKey)}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Yetkazib berish vaqti */}
          <section className="filter-block">
            <h3 className="filter-block__title">{t('deliveryTimeTitle')}</h3>
            <div className="filter-times">
              {TIMES.map((tm) => (
                <button
                  key={tm ?? 'more'}
                  onClick={() => { haptic(); setMaxTime(tm); }}
                  className={`filter-time ${maxTime === tm ? 'is-active' : ''}`}
                >
                  {tm ? tm : '60+'}
                </button>
              ))}
            </div>
          </section>

          {/* Oshxonalar va kategoriyalar */}
          <section className="filter-block">
            <h3 className="filter-block__title">{t('cuisinesCategoriesTitle')}</h3>
            <div className="filter-cats">
              {CATS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggleCategory(c.id)}
                  className={`filter-cat ${categories.includes(c.id) ? 'is-active' : ''}`}
                >
                  <span className="filter-cat__art"><CategoryIcon name={c.art} id={c.id} img={c.img} size={48} /></span>
                  <span className="filter-cat__label">{c.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Saralash */}
          <section className="filter-block">
            <h3 className="filter-block__title">{t('sortTitle')}</h3>
            <div className="filter-sorts">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { haptic(); setSort(s.id); }}
                  className={`filter-sort ${sort === s.id ? 'is-active' : ''}`}
                >
                  <span>{t(s.labelKey)}</span>
                  {sort === s.id && <Icon name="check" size={18} color="var(--brand)" />}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Pastki tugmalar */}
        <div className="filter-sheet__footer">
          <button onClick={onReset} className="filter-reset">{t('resetBtn')}</button>
          <button onClick={onClose} className="filter-apply">
            {t('showResultsBtn')}{resultCount > 0 ? ` · ${resultCount}` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

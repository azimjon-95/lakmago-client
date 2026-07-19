import { Icon } from '@/components/Icon';
import { CategoryIcon } from '@/components/CategoryIcons/CategoryIcon';
import { haptic } from '@/lib/telegram';
import { CATEGORIES as CATS } from '@/data/categories';

// Maxsus istaklar (Uzum uslubida)
export const SPECIALS = [
  { id: 'discount', label: 'Chegirmalar', icon: 'discount', color: '#E85D3D' },
  { id: 'free', label: 'Bepul yetkazish', icon: 'bike', color: '#6FBF73' },
  { id: 'top', label: 'Yuqori reyting', icon: 'star', color: '#FFCE7A' },
  { id: 'fresh', label: 'Yangi', icon: 'flame', color: '#F5A524' },
];

// Yetkazish vaqti
export const TIMES = [30, 45, 60, null]; // null = 60+

// Kategoriyalar markaziy ro'yxatdan — bosh sahifa bilan bir xil
export { CATEGORIES } from '@/data/categories';

// Saralash
export const SORTS = [
  { id: 'default', label: 'Odatiy tartib' },
  { id: 'rating', label: 'Dastlab yuqori reytingdagilari' },
  { id: 'fast', label: 'Eng tezkorlari' },
];

export function FilterSheet({
  specials, setSpecials,
  maxTime, setMaxTime,
  categories, setCategories,
  sort, setSort,
  onReset, onClose, resultCount,
}) {
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
          <h2 className="filter-sheet__title">Filtr</h2>
          <button onClick={onClose} className="filter-sheet__close" aria-label="Yopish">
            <Icon name="x" size={20} color="#A99C8C" />
          </button>
        </div>

        <div className="filter-sheet__body">
          {/* Maxsus istaklar */}
          <section className="filter-block">
            <h3 className="filter-block__title">Maxsus istaklar</h3>
            <div className="filter-specials">
              {SPECIALS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleSpecial(s.id)}
                  className={`filter-special ${specials.includes(s.id) ? 'is-active' : ''}`}
                >
                  <Icon name={s.icon} size={17} color={s.color} />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Yetkazib berish vaqti */}
          <section className="filter-block">
            <h3 className="filter-block__title">Yetkazib berish vaqti</h3>
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
            <h3 className="filter-block__title">Oshxonalar va kategoriyalar</h3>
            <div className="filter-cats">
              {CATS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggleCategory(c.id)}
                  className={`filter-cat ${categories.includes(c.id) ? 'is-active' : ''}`}
                >
                  <span className="filter-cat__art"><CategoryIcon name={c.art} img={c.img} size={48} /></span>
                  <span className="filter-cat__label">{c.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Saralash */}
          <section className="filter-block">
            <h3 className="filter-block__title">Saralash</h3>
            <div className="filter-sorts">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { haptic(); setSort(s.id); }}
                  className={`filter-sort ${sort === s.id ? 'is-active' : ''}`}
                >
                  <span>{s.label}</span>
                  {sort === s.id && <Icon name="check" size={18} color="#F5A524" />}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Pastki tugmalar */}
        <div className="filter-sheet__footer">
          <button onClick={onReset} className="filter-reset">Tozalash</button>
          <button onClick={onClose} className="filter-apply">
            Ko'rsatish{resultCount > 0 ? ` · ${resultCount}` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

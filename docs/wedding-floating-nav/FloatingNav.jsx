import { useEffect, useRef } from 'react';

/*
 * Lokma To'yxonalar saytiga (wedding.lokma.uz) qo'yiladigan SUZUVCHI PASTKI MENYU — Lokma Go va Market bilan bir xil dizayn.
 * Bog'liqlik yo'q (faqat React). Uslublar: floating-nav.css + theme-wedding.css. Ulash tartibi — README.md.
 *
 *   <FloatingNav
 *     active="venues"
 *     onSelect={(id) => navigate(id === 'venues' ? '/' : `/${id}`)}
 *     tabs={[
 *       { id: 'venues',    label: "To'yxonalar", icon: <HomeIcon /> },
 *       { id: 'map',       label: 'Xarita',      icon: <MapIcon /> },
 *       { id: 'favorites', label: 'Saralangan',  icon: <HeartIcon />, badge: favoritesCount },
 *       { id: 'profile',   label: 'Profil',      icon: <UserIcon />, photoUrl: telegramPhotoUrl },
 *     ]}
 *   />
 * Ikonkalar 26×26, stroke="currentColor" (faol/faolsiz rangni menyu o'zi beradi). Nomlar faqat aria-label/title'da (ikonkalar yolg'iz).
 */
export function FloatingNav({ tabs, active, onSelect, theme = 'wedding' }) {
  const activeIndex = tabs.findIndex((t) => t.id === active);
  // Tab almashganda pill suyuq-jele kabi cho'ziladi va yig'iladi (Go/Market bilan bir xil)
  const pillIn = useRef(null);
  const prev = useRef(activeIndex);
  useEffect(() => {
    const from = prev.current; prev.current = activeIndex;
    const el = pillIn.current;
    if (!el || from === activeIndex || from < 0 || activeIndex < 0 || typeof el.animate !== 'function') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const stretch = 1 + Math.min(Math.abs(activeIndex - from), 3) * 0.16;
    el.animate(
      [{ transform: 'scale(1, 1)' }, { transform: `scale(${stretch}, 0.9)`, offset: 0.38 }, { transform: 'scale(0.96, 1.05)', offset: 0.72 }, { transform: 'scale(1, 1)' }],
      { duration: 520, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
  }, [activeIndex]);
  return (
    <nav className="lokma-bottom-nav" aria-label="Lokma">
      <div
        className={`fnav fnav--${theme}`}
        style={{ '--fn-i': Math.max(activeIndex, 0), '--fn-n': tabs.length }}
        data-active={activeIndex >= 0 ? 'true' : 'false'}
      >
        <span className="fnav__pill" aria-hidden="true"><span ref={pillIn} className="fnav__pill-in" /></span>
        {tabs.map((t, i) => (
          <button
            key={t.id}
            type="button"
            className={`fnav__tab ${i === activeIndex ? 'is-active' : ''}`}
            aria-label={t.label}
            aria-current={i === activeIndex ? 'page' : undefined}
            title={t.label}
            onClick={() => onSelect?.(t.id)}
          >
            <span className="fnav__ic">
              {t.photoUrl
                ? <img className="fnav__photo" src={t.photoUrl} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                : t.icon}
              {t.badge > 0 && <span className="fnav__badge">{t.badge > 99 ? '99+' : t.badge}</span>}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}

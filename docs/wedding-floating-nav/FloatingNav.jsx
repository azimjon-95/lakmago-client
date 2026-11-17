import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { attachRefraction, attachLens, springKeyframes, isIOSDevice } from './liquidGlass';

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
 * Ikonkalar 23×23, stroke="currentColor" (faol/faolsiz rangni menyu o'zi beradi). Ikonka tagida yorliq (label) ko'rinadi.
 * liquidGlass.js — sinish filtri (Chromium), iOS 26 linzasi (hamma qurilmada) va prujina; floating-nav.css bilan birga nusxalanadi.
 * haptic — ixtiyoriy: linza yangi tab ustiga o'tganda chaqiriladi (masalan Telegram HapticFeedback.selectionChanged).
 */
const IOS = isIOSDevice();

export function FloatingNav({ tabs, active, onSelect, haptic, theme = 'wedding' }) {
  const activeIndex = tabs.findIndex((t) => t.id === active);
  const [shown, setShown] = useState(activeIndex);
  const navRef = useRef(null); const pillRef = useRef(null); const pillIn = useRef(null); const glare = useRef(null);
  const glass = useRef(null); const lens = useRef(null); const prevActive = useRef(activeIndex);
  /*
   * MUHIM: menyuni sahifa ICHIDA emas, ilova darajasida BIR MARTA chizing (har sahifada qayta yaratilsa, o'tishda o'chib-yonadi).
   * Platforma: iOS — Liquid Glass tomchi (linza), bitta shakl suriladi; Android/boshqalar — prujinali kapsula + Chromium sinishi.
   */
  const latest = useRef(null);
  latest.current = { tabs, onSelect, haptic };
  useEffect(() => {
    if (IOS) {
      lens.current = attachLens(navRef.current, {
        onSelect: (i) => { const { tabs: ts, onSelect: cb } = latest.current; if (ts[i]) cb?.(ts[i].id); },
        haptic: () => latest.current.haptic?.(),
      });
      return () => { lens.current?.dispose(); lens.current = null; };
    }
    glass.current = attachRefraction(navRef.current);
    return () => { glass.current?.dispose(); glass.current = null; };
  }, []);
  useLayoutEffect(() => {
    if (!IOS) return;
    const from = prevActive.current; prevActive.current = activeIndex;
    if (from === activeIndex) return;
    lens.current?.slide(from, activeIndex);
    setShown(activeIndex);
  }, [activeIndex]);
  useEffect(() => {
    if (IOS || activeIndex < 0 || shown === activeIndex) return;
    const from = shown;
    setShown(activeIndex);
    const wrap = pillRef.current;
    if (from < 0 || !wrap || typeof wrap.animate !== 'function' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const sp = springKeyframes(from, activeIndex);
    const opt = { duration: sp.ms, easing: 'linear' };
    wrap.animate(sp.move, opt);
    pillIn.current?.animate(sp.stretch, opt);
    const dir = activeIndex > from ? 1 : -1;
    glare.current?.animate([{ opacity: 0, transform: `translateX(${-70 * dir}%)` }, { opacity: 1, offset: 0.35 }, { opacity: 0, transform: `translateX(${70 * dir}%)` }], { duration: 560, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    glass.current?.pulse(sp.ms);
  }, [activeIndex, shown]);
  return () => lens.dispose();
  }, []);
  // Tab almashganda kapsula prujina bilan suriladi, suyuq cho'ziladi, yorug' chiziq ergashadi, shisha egiladi (Lokma Go/Market bilan bir xil)
  useEffect(() => {
    if (activeIndex < 0 || shown === activeIndex) return;
    const from = shown;
    setShown(activeIndex);
    const wrap = pillRef.current;
    if (!wrap || typeof wrap.animate !== 'function' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const sp = springKeyframes(from < 0 ? activeIndex : from, activeIndex);
    const opt = { duration: sp.ms, easing: 'linear' };
    wrap.animate(sp.move, opt);
    pillIn.current?.animate(sp.stretch, opt);
    const dir = activeIndex > from ? 1 : -1;
    glare.current?.animate([{ opacity: 0, transform: `translateX(${-70 * dir}%)` }, { opacity: 1, offset: 0.35 }, { opacity: 0, transform: `translateX(${70 * dir}%)` }], { duration: 560, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    glass.current?.pulse(sp.ms);
  }, [activeIndex, shown]);
  return (
    <nav className="lokma-bottom-nav" aria-label="Lokma">
      <div
        ref={navRef}
        className={`fnav fnav--${theme}${IOS ? ' fnav--ios' : ''}`}
        style={{ '--fn-i': Math.max(IOS ? activeIndex : shown, 0), '--fn-n': tabs.length }}
        data-active={activeIndex >= 0 ? 'true' : 'false'}
      >
        <span ref={pillRef} className="fnav__pill" aria-hidden="true"><span ref={pillIn} className="fnav__pill-in"><span ref={glare} className="fnav__pill-gl" /></span></span>
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
            <span className="fnav__lb">{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

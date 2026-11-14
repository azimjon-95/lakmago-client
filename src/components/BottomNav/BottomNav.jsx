import { useEffect, useRef, useState } from 'react';
import { installScrollCompact } from '@/lib/scrollCompact';
import { attachRefraction, springKeyframes } from './liquidGlass';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../Icon';
import { useCart } from '@/store/cart';
import { useUser } from '@/store/user';
import { useT } from '@/i18n';
import { useSection } from '@/store/section';
import './BottomNav.css';

const tabs = [
  { path: '/', icon: 'home', key: 'navHome' },
  { path: '/search', icon: 'search', key: 'navSearch' },
  { path: '/orders', icon: 'bag', key: 'navOrders' },
  { path: '/profile', icon: 'user', key: 'navProfile' },
];

/*
 * Pastki menyu — Instagram uslubidagi suzuvchi shisha kapsula (floating-nav.css). Faqat ikonkalar (nomi aria-label'da),
 * faol tab ortida silliq suriluvchi yumshoq "pill"; rang bo'limga qarab (Go — to'q sariq, Market — yashil).
 * To'yxonalar bo'limi alohida saytda — u uchun bir xil dizayn paketi: docs/wedding-floating-nav/.
 */
/*
 * --bottom-nav-h = menyu egallagan balandlik XAVFSIZ ZONASIZ (iste'molchilar unga `+ var(--tg-bottom-offset)` qo'shadi):
 * 6 (tepa) + 58 (kapsula) + max(10, zona + 2) (past) − zona.  Zona 20 px → 66 px; zona 0 → 74 px.
 */
// Pastki oraliq: 10px + zona × 0.35 (iOS home indikatoriga qarab; Android'da zona 0 → 10px). Savat paneli shu bilan hisoblanadi:
// balandlik (6 + 58 + oraliq) − zona  →  CSS: 74px − zona × 0.65 ; consumer'lar `+ zona` qo'shadi.
export const BOTTOM_NAV_H = 'calc(74px - var(--tg-bottom-offset, 0px) * 0.65)';
// Oxirgi faol tab (sahifalar o'rtasida eslab qolinadi: menyu har sahifada qayta chiziladi)
let lastActive = -1;
export function BottomNav() {
  useEffect(() => { installScrollCompact(); }, []);
  // Menyu bor sahifada savat/operator kapsula ustida turadi; menyusiz sahifada (restoran, savat) pastga tushadi
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--nav-top', 'calc(var(--nav-gap) + var(--cap-h))');
    return () => root.style.setProperty('--nav-top', 'var(--nav-gap)');
  }, []);

  // Pastki menyu bor-yo'qligini bildiramiz. Savat paneli shu qiymatga
  // tayanadi — menyusiz sahifada (restoran, savat) pastga tushadi.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--bottom-nav-h', BOTTOM_NAV_H);
    return () => root.style.setProperty('--bottom-nav-h', '0px');
  }, []);

  const { pathname } = useLocation();
  const navigate = useNavigate();
  const t = useT();
  const cartCount = useCart((s) => s.totalCount());
  // Profil uchun Telegram rasmi — bo'lmasa ikonka ko'rsatiladi
  const photoUrl = useUser((st) => st.user.photoUrl);
  // Market'da "Bosh" — Market bosh sahifasi (Lokma Go'ga tashlab yubormaydi)
  const market = useSection((s) => s.section === 'market');
  const homePath = market ? '/market' : '/';
  const targetOf = (tab) => (tab.path === '/' ? homePath : tab.path);
  const activeIndex = tabs.findIndex((tab) => pathname === targetOf(tab));

  // Har sahifa o'z menyusini chizadi (menyu qayta yaratiladi) — shuning uchun kapsula oldingi faol tabdan boshlanadi va yangisiga
  // PRUJINA bilan suriladi: bitta menyu bo'lib ko'rinadi, almashish "hip" bo'ladi. Harakat paytida shisha suyuq egiladi.
  const [shown, setShown] = useState(lastActive >= 0 && activeIndex >= 0 ? lastActive : activeIndex);
  const navRef = useRef(null);
  const pillRef = useRef(null);
  const pillIn = useRef(null);
  const glare = useRef(null);
  const glass = useRef(null);
  useEffect(() => {
    glass.current = attachRefraction(navRef.current);
    return () => { glass.current?.dispose(); glass.current = null; };
  }, []);
  useEffect(() => {
    if (activeIndex < 0) return undefined;
    if (shown === activeIndex) { lastActive = activeIndex; return undefined; }
    const from = shown;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setShown(activeIndex);
        lastActive = activeIndex;
        const wrap = pillRef.current; const el = pillIn.current; const gl = glare.current;
        if (!wrap || typeof wrap.animate !== 'function' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
        const sp = springKeyframes(from, activeIndex);
        const opt = { duration: sp.ms, easing: 'linear' };
        wrap.animate(sp.move, opt);
        el?.animate(sp.stretch, opt);
        const dir = activeIndex > from ? 1 : -1;
        gl?.animate(
          [{ opacity: 0, transform: `translateX(${-70 * dir}%)` }, { opacity: 1, offset: 0.35 }, { opacity: 0, transform: `translateX(${70 * dir}%)` }],
          { duration: 560, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        );
        glass.current?.pulse(sp.ms);
      });
    });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, [activeIndex, shown]);

  return (
    <nav className="bottom-nav" aria-label="Lokma">
      <div ref={navRef} className="fnav" style={{ '--fn-i': Math.max(shown, 0), '--fn-n': tabs.length }} data-active={activeIndex >= 0 ? 'true' : 'false'} data-testid="floating-nav">
        <span ref={pillRef} className="fnav__pill" aria-hidden="true"><span ref={pillIn} className="fnav__pill-in"><span ref={glare} className="fnav__pill-gl" /></span></span>
        {tabs.map((tab, i) => {
          const active = i === activeIndex;
          const label = t(tab.key);
          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => navigate(targetOf(tab))}
              className={`fnav__tab ${active ? 'is-active' : ''}`}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              title={label}
              data-testid={`fnav-${tab.icon}`}
            >
              <span className="fnav__ic">
                {tab.path === '/profile' && photoUrl ? (
                  <img src={photoUrl} alt="" className="fnav__photo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <Icon name={tab.icon} size={23} strokeWidth={active ? 2.3 : 1.9} />
                )}
                {tab.path === '/orders' && cartCount > 0 && <span className="fnav__badge">{cartCount > 99 ? '99+' : cartCount}</span>}
              </span>
              <span className="fnav__lb">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { installScrollCompact } from '@/lib/scrollCompact';
import { attachRefraction, attachLens, springKeyframes, isIOSDevice } from './liquidGlass';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../Icon';
import { useCart } from '@/store/cart';
import { useUser } from '@/store/user';
import { useT } from '@/i18n';
import { useSection } from '@/store/section';
import { tapHaptic, scrollToTopSmooth } from '@/lib/tapHaptic';
import './BottomNav.css';

const tabs = [
  { path: '/', icon: 'home', key: 'navHome' },
  { path: '/search', icon: 'search', key: 'navSearch' },
  { path: '/orders', icon: 'bag', key: 'navOrders' },
  { path: '/profile', icon: 'user', key: 'navProfile' },
];

/*
 * ═══ PASTKI MENYU: ILOVADA BITTA, DOIMIY (NavHost) ═══
 *
 * MUAMMO (video, 2026-11-17): menyu har sahifaning ICHIDA chizilardi. Sahifa almashganda u o'chib-yonardi:
 *   • lazy sahifa yuklanguncha Suspense oq ekran ko'rsatardi — menyu 100–300 ms butunlay yo'qolardi;
 *   • yangi sahifadagi menyu noldan yaratilib, kapsula/linza animatsiyalari har safar qaytadan boshlanardi
 *     (iOS'da eski prujinali kapsula + linza — ikki shakl bir vaqtda).
 *
 * YECHIM:
 *   • <NavHost/> App'da Suspense'DAN TASHQARIDA bitta marta chiziladi va hech qachon qayta yaratilmaydi
 *     (position: fixed). Sahifalardagi <BottomNav/> endi faqat JOY EGALLOVCHI (spacer) — u kontent menyu ostida
 *     qolmasligini ta'minlaydi va "bu sahifada menyu bor" deb xabar beradi. Sahifa kodi o'zgarmadi.
 *   • Router startTransition rejimida (App.jsx) — yangi sahifa tayyor bo'lguncha eski sahifa ko'rinib turadi.
 *   • Platformaga qarab: iOS — Liquid Glass tomchi (linza) BITTA shakl bilan suriladi; Android/boshqalar —
 *     avvalgi ko'rinish (prujinali kapsula + Chromium sinishi), linzasiz.
 */

/* ── Sahifalarda menyu bormi (spacer'lar soni) ── */
let slots = 0;
const subs = new Set();
const emit = () => subs.forEach((f) => f());
const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };
const getSlots = () => slots;

/*
 * --bottom-nav-h = menyu egallagan balandlik XAVFSIZ ZONASIZ (iste'molchilar unga `+ var(--tg-bottom-offset)` qo'shadi):
 * Pastki oraliq: 10px + zona × 0.35. Balandlik (6 + 58 + oraliq) − zona → 74px − zona × 0.65.
 */
export const BOTTOM_NAV_H = 'calc(74px - var(--tg-bottom-offset, 0px) * 0.65)';

/**
 * Sahifadagi menyu o'rni (spacer). Sahifalar avvalgidek <BottomNav/> yozadi — haqiqiy menyuni NavHost chizadi.
 */
export function BottomNav() {
  useEffect(() => { installScrollCompact(); }, []);
  // Menyu bor sahifada savat/operator kapsula ustida turadi; menyusiz sahifada (savat) pastga tushadi
  useEffect(() => {
    const root = document.documentElement;
    slots += 1; emit();
    root.style.setProperty('--nav-top', 'calc(var(--nav-gap) + var(--cap-h))');
    root.style.setProperty('--bottom-nav-h', BOTTOM_NAV_H);
    return () => {
      slots = Math.max(0, slots - 1); emit();
      if (slots === 0) {
        root.style.setProperty('--nav-top', 'var(--nav-gap)');
        root.style.setProperty('--bottom-nav-h', '0px');
      }
    };
  }, []);
  return <div className="bottom-nav bottom-nav--slot" aria-hidden="true" />;
}

/* Tanlov tebranishi (iOS linzasi tab ustidan o'tganda) */
const selectionHaptic = () => tapHaptic('select');

const IOS = isIOSDevice();
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** iOS: matn kiritilayotganda menyu klaviatura ortida qoladi (iOS'ning o'z tab bar'i kabi) — ustiga chiqib qolmaydi. */
function useIOSKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!IOS) return undefined;
    const isField = (el) => !!el && (el.isContentEditable || (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)
      && !/^(button|checkbox|radio|range|submit|reset|file|color|image)$/i.test(el.type || '')));
    let t = 0;
    const onIn = (e) => { if (isField(e.target)) { clearTimeout(t); setOpen(true); } };
    const onOut = () => { clearTimeout(t); t = setTimeout(() => setOpen(isField(document.activeElement)), 120); };
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => { clearTimeout(t); document.removeEventListener('focusin', onIn); document.removeEventListener('focusout', onOut); };
  }, []);
  return open;
}

export function NavHost() {
  const count = useSyncExternalStore(subscribe, getSlots, getSlots);
  // Sahifalar almashayotgan bir lahzada (eski spacer ketdi, yangisi hali kelmadi) menyu o'chib-yonmasin
  const [visible, setVisible] = useState(count > 0);
  useEffect(() => {
    if (count > 0) { setVisible(true); return undefined; }
    const t = setTimeout(() => setVisible(false), 160);
    return () => clearTimeout(t);
  }, [count]);
  const kb = useIOSKeyboardOpen();

  const { pathname } = useLocation();
  const navigate = useNavigate();
  const t = useT();
  const cartCount = useCart((s) => s.totalCount());
  const photoUrl = useUser((st) => st.user.photoUrl);
  // Market'da "Bosh" — Market bosh sahifasi (Lokma Go'ga tashlab yubormaydi)
  const market = useSection((s) => s.section === 'market');
  const homePath = market ? '/market' : '/';
  const targetOf = (tab) => (tab.path === '/' ? homePath : tab.path);
  const routeIndex = tabs.findIndex((tab) => pathname === targetOf(tab));
  /*
   * DARHOL JAVOB (Telegram kabi): tab bosilgan zahoti tanlov siljiydi — yangi sahifa yuklanishini kutmaydi
   * (router startTransition rejimida manzil sahifa tayyor bo'lgandagina o'zgaradi; avval menyu ~330 ms "qotib" turardi).
   * Sahifa ochilgach (yoki 4 s ichida ochilmasa) yana manzilga tayanadi.
   */
  const [pending, setPending] = useState(-1);
  useEffect(() => { setPending(-1); }, [routeIndex, pathname]);
  useEffect(() => {
    if (pending < 0) return undefined;
    const tm = setTimeout(() => setPending(-1), 4000);
    return () => clearTimeout(tm);
  }, [pending]);
  const activeIndex = pending >= 0 ? pending : routeIndex;
  const activeRef = useRef(activeIndex);
  activeRef.current = activeIndex;
  // Ikonka animatsiyasi: har yangi tanlovda bir marta (key orqali boshidan)
  const [pop, setPop] = useState({ i: -1, n: 0 });
  const prevPop = useRef(activeIndex);
  useEffect(() => {
    if (prevPop.current === activeIndex) return;
    const first = prevPop.current < 0 && activeIndex >= 0 && pop.n === 0;
    prevPop.current = activeIndex;
    if (activeIndex >= 0 && !first) {
      setPop((p) => ({ i: activeIndex, n: p.n + 1 }));
    }
  }, [activeIndex]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = (i) => {
    const tab = tabs[i];
    if (!tab) return;
    // Aktiv tab qayta bosilsa — sahifa yumshoq tepaga ko'tariladi (boshqa ilovalar kabi)
    if (i === activeRef.current) { tapHaptic(); scrollToTopSmooth(); return; }
    tapHaptic();
    setPending(i);
    navigate(targetOf(tab));
  };

  const [shown, setShown] = useState(activeIndex);
  const navRef = useRef(null);
  const pillRef = useRef(null);
  const pillIn = useRef(null);
  const glare = useRef(null);
  const glass = useRef(null);
  const lens = useRef(null);
  const prevActive = useRef(activeIndex);

  // Android/boshqalar: Chromium sinishi (iOS'da supportsRefraction=false). iOS: linza.
  const selectRef = useRef(null);
  selectRef.current = go;
  useEffect(() => {
    if (IOS) {
      lens.current = attachLens(navRef.current, {
        onSelect: (i) => selectRef.current?.(i),
        haptic: selectionHaptic,
        getActive: () => activeRef.current,
      });
      return () => { lens.current?.dispose(); lens.current = null; };
    }
    glass.current = attachRefraction(navRef.current);
    return () => { glass.current?.dispose(); glass.current = null; };
  }, []);

  // iOS: tab almashishi — kapsula darhol yangi joyga (yashirin), tomchi esa eskisidan yangisiga suriladi. Bo'yashdan OLDIN.
  useLayoutEffect(() => {
    if (!IOS) return;
    const from = prevActive.current;
    prevActive.current = activeIndex;
    if (from === activeIndex) return;
    lens.current?.slide(from, activeIndex);
    setShown(activeIndex);
  }, [activeIndex]);

  // Android: avvalgi prujinali kapsula (WAAPI) + yorug' chiziq + shisha egilishi
  useEffect(() => {
    if (IOS || activeIndex < 0) return undefined;
    if (shown === activeIndex) return undefined;
    const from = shown;
    setShown(activeIndex);
    const wrap = pillRef.current; const el = pillIn.current; const gl = glare.current;
    if (from < 0 || !wrap || typeof wrap.animate !== 'function' || reducedMotion()) return undefined;
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
    return undefined;
  }, [activeIndex, shown]);

  const hidden = !visible || kb;
  return (
    <nav
      className={`bottom-nav bottom-nav--host${hidden ? ' is-hidden' : ''}`}
      aria-label="Lokma"
      aria-hidden={hidden ? 'true' : undefined}
      inert={hidden ? '' : undefined}
    >
      <div
        ref={navRef}
        className={`fnav${IOS ? ' fnav--ios' : ''}`}
        style={{ '--fn-i': Math.max(IOS ? activeIndex : shown, 0), '--fn-n': tabs.length }}
        data-active={activeIndex >= 0 ? 'true' : 'false'}
        data-testid="floating-nav"
      >
        <span ref={pillRef} className="fnav__pill" aria-hidden="true"><span ref={pillIn} className="fnav__pill-in"><span ref={glare} className="fnav__pill-gl" /></span></span>
        {tabs.map((tab, i) => {
          const active = i === activeIndex;
          const label = t(tab.key);
          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => go(i)}
              className={`fnav__tab ${active ? 'is-active' : ''}`}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              title={label}
              data-testid={`fnav-${tab.icon}`}
            >
              <span
                key={active && pop.i === i ? `p${pop.n}` : 'ic'}
                className={`fnav__ic${active && pop.i === i ? ' is-pop' : ''}`}
                data-ic={tab.icon}
              >
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

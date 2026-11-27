import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSection } from '@/store/section';
import { getStartParam } from '@/lib/telegram';

/*
 * ═══ OXIRGI BO'LIM XOTIRASI: Lokma Go / Lokma Market / Lokma To'yxonalari ═══
 *
 * Mijoz qaysi bo'limda bo'lsa, qurilma eslab qoladi (localStorage) va ilova keyingi safar shu bo'limning
 * bosh sahifasini ochadi. Qo'lda almashtirsa — xotira yangilanadi.
 *
 * Qoidalar:
 *  • Faqat bo'limning BOSH sahifasi eslanadi ('/', '/market', aynan '/weddings'). Boshqa sahifalar (taom, savat…)
 *    xotirani o'zgartirmaydi.
 *  • Tiklash faqat ilova '/' da ochilganda va chuqur havola (startapp / push) YO'Q bo'lganda — havola doim ustun.
 *  • Hech narsa so'ralmaydi, ilovani bloklamaydi (guest-first, 2-qoida).
 */
const KEY = 'lokma_last_home_v1';
const PATHS = { go: '/', market: '/market', weddings: '/weddings' };

export function homeOfPath(pathname) {
  if (pathname === '/') return 'go';
  if (pathname === '/market') return 'market';
  if (pathname === '/weddings') return 'weddings';
  return null;
}

export function readLastHome() {
  try {
    const v = localStorage.getItem(KEY);
    return Object.prototype.hasOwnProperty.call(PATHS, v) ? v : 'go';
  } catch { return 'go'; }
}

export function rememberHome(pathname) {
  const h = homeOfPath(pathname);
  if (!h) return;
  try { if (localStorage.getItem(KEY) !== h) localStorage.setItem(KEY, h); } catch { /* bloklangan */ }
}

/** Render'dan OLDIN (main.jsx): ilova '/' da ochilgan bo'lsa va chuqur havola bo'lmasa — oxirgi bo'limga o'tkazadi. */
export function restoreLastHome() {
  try {
    if (typeof window === 'undefined' || window.location.pathname !== '/') return;
    if (getStartParam()) return;
    const h = readLastHome();
    if (h === 'go') return;
    useSection.getState().setSection(h === 'market' ? 'market' : 'go');
    window.history.replaceState(window.history.state, '', PATHS[h] + window.location.search + window.location.hash);
  } catch { /* xotira yordamchi: xato bo'lsa ilova odatdagidek ochiladi */ }
}

/** Router ichida: bo'lim bosh sahifasi ochilganda eslab qoladi. */
export function HomeMemory() {
  const { pathname } = useLocation();
  useEffect(() => { rememberHome(pathname); }, [pathname]);
  return null;
}

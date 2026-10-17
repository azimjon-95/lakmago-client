import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '@/api';
import { haptic } from '@/lib/telegram';
import { PromoCard, ensurePromoFont, promoImg } from './PromoCard';
import { markSeen, shouldShow } from './promoSeen';
import './PromoModals.css';

/*
 * ═══ REKLAMA OYNALARI — mijoz bosh sahifani ochganda ═══
 * Splash tugab, bosh sahifa ko'ringach (biroz kutib) admin yoqgan oynalar NAVBAT bilan chiqadi:
 * bittasini yopsa — keyingisi yumshoq ochiladi. Har oyna kuniga bir marta (yoki umuman bir marta).
 * Ochilish/yopilish — macOS "genie" kabi: pastdan torayib-kengayib chiqadi, yopilganda shu yo'l bilan ketadi.
 * Mavjud sahifalarga tegmaydi: faqat "/" da, faqat faol oyna bo'lsa, o'z qatlamida ishlaydi.
 */
const START_DELAY = 900;   // bosh sahifa ko'ringach, foydalanuvchi taomlarni ko'ra boshlagan payt
const OPEN_MS = 640;
const CLOSE_MS = 420;
const GAP_MS = 140;         // ketma-ket oynalar orasidagi tanaffus

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const track = (id, kind) => api.trackPromoModal?.(id, kind).catch(() => {});

export function PromoModals() {
  const location = useLocation();
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState('idle'); // idle | in | open | out
  const started = useRef(false);
  const timers = useRef([]);
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.current.push(t); return t; };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const onHome = location.pathname === '/';

  // Bir sessiyada bir marta: bosh sahifada, biroz kutib, faol oynalarni olamiz
  useEffect(() => {
    if (!onHome || started.current) return undefined;
    const t = setTimeout(async () => {
      if (started.current) return;
      started.current = true;
      try {
        const list = (await api.getPromoModals()) || [];
        const due = list.filter((p) => shouldShow(p));
        if (!due.length) return;
        ensurePromoFont();
        // Rasmlarni oldindan yuklaymiz — oyna ochilganda bo'sh joy ko'rinmasin
        await Promise.all(due.slice(0, 3).map((p) => (p.imageUrl ? new Promise((ok) => { const i = new Image(); i.onload = ok; i.onerror = ok; i.src = promoImg(p.imageUrl); setTimeout(ok, 2500); }) : null)));
        if (window.location.pathname !== '/') { started.current = false; return; }
        setQueue(due);
        setIdx(0);
        setPhase('in');
      } catch { /* tarmoq xatosi — reklama ko'rsatilmaydi, ilova ishlayveradi */ }
    }, START_DELAY);
    return () => clearTimeout(t);
  }, [onHome]);

  const current = queue[idx];

  // Ko'rsatilgan zahoti "ko'rildi" (qayta yuklasa ham bugun takrorlanmaydi)
  useEffect(() => {
    if (phase !== 'in' || !current) return undefined;
    markSeen(current);
    track(current.id, 'shown');
    const t = later(() => setPhase('open'), reduceMotion() ? 200 : OPEN_MS);
    return () => clearTimeout(t);
  }, [phase, current]);

  const close = useCallback((all = false) => {
    if (phase !== 'open' && phase !== 'in') return;
    haptic?.();
    setPhase('out');
    later(() => {
      const next = idx + 1;
      if (!all && next < queue.length) {
        later(() => { setIdx(next); setPhase('in'); }, GAP_MS);
        setPhase('gap');
      } else {
        setPhase('idle'); setQueue([]);
      }
    }, reduceMotion() ? 160 : CLOSE_MS);
  }, [phase, idx, queue.length]);

  const act = useCallback(() => {
    if (!current?.link) return;
    track(current.id, 'click');
    const link = current.link;
    close(true);
    later(() => {
      if (link.startsWith('/')) navigate(link);
      else window.Telegram?.WebApp?.openLink ? window.Telegram.WebApp.openLink(link) : window.open(link, '_blank', 'noopener');
    }, reduceMotion() ? 160 : CLOSE_MS);
  }, [current, close, navigate]);

  // Esc — yopish; ochiq paytda sahifa aylanmasin
  const visible = phase !== 'idle' && queue.length > 0;
  useEffect(() => {
    if (!visible) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [visible, close]);

  // Boshqa sahifaga o'tilsa — jimgina yopiladi
  useEffect(() => { if (!onHome && visible) { setPhase('idle'); setQueue([]); } }, [onHome, visible]);

  if (!visible) return null;
  const lastOut = phase === 'out' && idx + 1 >= queue.length;

  return (
    <div className={`pmx${lastOut ? ' pmx--leaving' : ''}${reduceMotion() ? ' pmx--calm' : ''}`} role="dialog" aria-modal="true" aria-label="Taklif">
      <div className="pmx-backdrop" onClick={() => close()} />
      {current && phase !== 'gap' && (
        <div key={current.key} className={`pmx-stage pmx-stage--${phase}`}>
          <PromoCard promo={current} onClose={() => close()} onAction={act} />
        </div>
      )}
      {queue.length > 1 && (
        <div className="pmx-dots" aria-label={`${idx + 1} / ${queue.length}`}>
          {queue.map((p, i) => <i key={p.key} className={i === idx ? 'is-on' : i < idx ? 'is-done' : ''} />)}
        </div>
      )}
    </div>
  );
}

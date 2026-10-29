import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useT, useI18n } from '@/i18n';
import { haptic } from '@/lib/telegram';
import {
  applyLoginTokens, clearTgLoginCache, openExternal, pollTgLogin, prefetchTgLogin, profileFromLogin,
} from '@/lib/tgLinkAuth';
import './LokmaSignIn.css';
import { DemoLoginForm } from './DemoLoginForm';
import { useCapabilities, isNativeApp } from '@/lib/capabilities';

/*
 * ═══ LOKMA GO — KREATIV KIRISH (native ilova va brauzer) ═══
 *
 * Mijoz uchun "Telegram'ga ulanish" emas, "bir bosishda kirish" bo'lib tuyuladi:
 *   idle     — brend ikonkasi, aylanayotgan taomlar, 1 ta katta tugma ("Davom etish")
 *   waiting  — Telegram ochiladi, ilova va Telegram orasida uchayotgan qog'oz samolyot, 3 qadamli ko'rsatkich;
 *              ilova O'ZI so'rab turadi va mijoz qaytishi bilan avtomatik kiradi (qo'lda hech narsa kiritilmaydi)
 *   success  — "Salom, Ali!" + tantana, so'ng avtomatik davom etadi
 *   error    — do'stona xabar + "Qayta urinish"
 *
 * Oqim va xavfsizlik: lib/tgLinkAuth.js (server: services/tgLinkLogin.js). Telegram ochish uchun so'rov
 * oyna ochilishi bilan OLDINDAN yaratiladi — bosish kutishsiz ochadi (Safari/WebView talabi).
 */
const POLL_MS = 1500;
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export function LokmaSignIn({ reason = 'order', onLoggedIn, onOtherMethod }) {
  const t = useT();
  const { lang } = useI18n();
  const [phase, setPhase] = useState('idle'); // idle | starting | waiting | success | error
  const [awaiting, setAwaiting] = useState(false); // mijoz botni ochdi (2-qadam faol)
  const [problem, setProblem] = useState('');
  const [left, setLeft] = useState(0);
  const [name, setName] = useState('');
  const [showReopen, setShowReopen] = useState(false);
  // App Store tekshiruvi uchun demo kirish: faqat iOS/Android ilova VA server yoqqanda (capabilities); haqiqiy mijozlar ko'rmaydi
  const [showDemo, setShowDemo] = useState(false);
  const caps = useCapabilities();
  const demoAvailable = caps.demoLogin && isNativeApp();

  const req = useRef(null);
  const alive = useRef(true);
  const polling = useRef(false);
  const fails = useRef(0);
  const ctrl = useRef(null);
  const doneRef = useRef(onLoggedIn);
  doneRef.current = onLoggedIn;

  // Oyna ochilishi bilan so'rovni fonda tayyorlaymiz
  useEffect(() => {
    alive.current = true;
    prefetchTgLogin(lang).then((r) => { if (alive.current) req.current = r; }).catch(() => {});
    return () => { alive.current = false; ctrl.current?.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fail = useCallback((kind) => {
    clearTgLoginCache();
    req.current = null;
    setProblem(kind);
    setPhase('error');
  }, []);

  const poll = useCallback(async () => {
    if (!alive.current || !req.current || polling.current) return;
    polling.current = true;
    ctrl.current = new AbortController();
    try {
      const { http, data } = await pollTgLogin(req.current, ctrl.current.signal);
      if (!alive.current) return;
      fails.current = 0;
      if (http === 200 && data.status === 'ok') {
        applyLoginTokens(data);
        clearTgLoginCache();
        req.current = null;
        const profile = profileFromLogin(data);
        setName(profile.firstName || '');
        setPhase('success');
        haptic?.('success');
        setTimeout(() => { if (alive.current) doneRef.current?.(profile); }, 1200);
      } else if (http === 403) fail('blocked');
      else if (data.status === 'pending') setAwaiting(Boolean(data.awaiting));
      else if (data.status === 'cancelled') fail('cancelled');
      else if (['expired', 'used', 'invalid'].includes(data.status)) fail('expired');
      else if (http >= 500 || http === 429) { fails.current += 1; if (fails.current > 12) fail('network'); }
    } catch (e) {
      if (e.name !== 'AbortError') { fails.current += 1; if (fails.current > 12) fail('network'); }
    } finally {
      polling.current = false;
    }
  }, [fail]);

  // Kutish: har 1.5 s so'raymiz; ilovaga QAYTILGANDA (ko'rinadigan bo'lganda) darhol
  useEffect(() => {
    if (phase !== 'waiting') return undefined;
    const iv = setInterval(poll, POLL_MS);
    const tick = setInterval(() => {
      const s = Math.max(0, Math.round(((req.current?.expiresAt || 0) - Date.now()) / 1000));
      setLeft(s);
      if (s <= 0) fail('expired');
    }, 1000);
    const wake = () => { if (document.visibilityState === 'visible') poll(); };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('focus', wake);
    const hint = setTimeout(() => setShowReopen(true), 2500);
    poll();
    return () => {
      clearInterval(iv); clearInterval(tick); clearTimeout(hint);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('focus', wake);
    };
  }, [phase, poll, fail]);

  const begin = (r) => {
    fails.current = 0;
    setAwaiting(false);
    setShowReopen(false);
    setLeft(Math.max(0, Math.round((r.expiresAt - Date.now()) / 1000)));
    setPhase('waiting');
  };

  const go = async () => {
    haptic?.('light');
    let r = req.current;
    // Tayyor so'rov bor — Telegram'ni SINXRON ochamiz (foydalanuvchi bosishi ichida)
    if (r && r.expiresAt - Date.now() > 20_000) { openExternal(r.appLink); begin(r); return; }
    setPhase('starting');
    try {
      r = await prefetchTgLogin(lang);
      if (!alive.current) return;
      req.current = r;
      openExternal(r.appLink);
      begin(r);
    } catch {
      fail('network');
    }
  };

  const reopen = () => { if (req.current) openExternal(req.current.appLink); };
  const openWeb = () => { if (req.current) openExternal(req.current.deepLink); };
  const cancel = () => { ctrl.current?.abort(); setPhase('idle'); };

  const title = t(reason === 'profile' ? 'lsi_title_profile' : 'lsi_title_order');
  const sub = t(reason === 'profile' ? 'lsi_sub_profile' : 'lsi_sub_order');

  /* ───────────── Muvaffaqiyat ───────────── */
  const onDemoOk = (data) => {
    applyLoginTokens(data);
    clearTgLoginCache();
    const profile = profileFromLogin(data);
    setName(profile.firstName || '');
    setShowDemo(false);
    setPhase('success');
    haptic?.('success');
    setTimeout(() => { if (alive.current) doneRef.current?.(profile); }, 900);
  };

  if (phase === 'success') {
    return (
      <div className="lsi lsi--center" role="status">
        <div className="lsi-win">
          <svg className="lsi-win__svg" viewBox="0 0 52 52" aria-hidden="true">
            <circle className="lsi-win__circle" cx="26" cy="26" r="23" />
            <path className="lsi-win__tick" d="M15 27.5l7.5 7.5L37.5 19" />
          </svg>
          {Array.from({ length: 14 }, (_, i) => <i key={i} className="lsi-confetti" style={{ '--a': `${i * (360 / 14)}deg`, '--d': `${i % 3}` }} />)}
        </div>
        <h2 className="lsi-title">{t('lsi_hello')} {name || ''}!</h2>
        <p className="lsi-sub">{t('lsi_ok_sub')}</p>
      </div>
    );
  }

  /* ───────────── Xato ───────────── */
  if (phase === 'error') {
    return (
      <div className="lsi lsi--center" role="alert">
        <div className="lsi-oops"><Icon name={problem === 'network' ? 'info' : 'clock'} size={34} color="var(--brand)" /></div>
        <h2 className="lsi-title lsi-title--sm">{t(`lsi_err_${problem || 'expired'}`)}</h2>
        {problem !== 'blocked' && (
          <button type="button" className="lsi-cta" onClick={go}><span>{t('lsi_retry')}</span></button>
        )}
      </div>
    );
  }

  /* ───────────── Kutish ───────────── */
  if (phase === 'waiting' || phase === 'starting') {
    return (
      <div className="lsi lsi--center">
        <div className="lsi-link" aria-hidden="true">
          <img className="lsi-link__logo" src="/brand/lokma-go-icon.png" alt="" />
          <div className="lsi-track">
            <i className="lsi-track__dot" /><i className="lsi-track__dot" /><i className="lsi-track__dot" /><i className="lsi-track__dot" />
            <span className="lsi-plane"><Icon name="send" size={16} color="#fff" /></span>
          </div>
          <div className="lsi-link__tg"><Icon name="send" size={24} color="#fff" /></div>
        </div>

        <h2 className="lsi-title lsi-title--sm">{t('lsi_wait_title')}</h2>
        <p className="lsi-sub" role="status" aria-live="polite">{phase === 'starting' || !awaiting ? t('lsi_wait_opening') : t('lsi_wait_confirm')}</p>

        <ol className="lsi-steps">
          {[['lsi_step1', 1], ['lsi_step2', 2], ['lsi_step3', 3]].map(([k, n]) => (
            // 1 — Telegram ochildi (bajarilgan), 2 — mijoz botda tasdiqlayapti (faol; bot ochilgach kuchliroq), 3 — keyingi
            <li key={k} className={`lsi-step ${n === 1 ? 'is-done' : ''} ${n === 2 ? 'is-active' : ''} ${n === 2 && awaiting ? 'is-hot' : ''}`}>
              <span className="lsi-step__dot">{n === 1 ? <Icon name="check" size={13} color="#fff" /> : n}</span>
              <span>{t(k)}</span>
            </li>
          ))}
        </ol>

        <div className="lsi-count" aria-live="off">{mmss(left)} {t('lsi_left')}</div>

        <button type="button" className="lsi-ghost" onClick={reopen}><Icon name="send" size={15} color="var(--brand)" /> {t('lsi_reopen')}</button>
        {showReopen && <button type="button" className="lsi-link-btn" onClick={openWeb}>{t('lsi_notopened')}</button>}
        <button type="button" className="lsi-link-btn lsi-link-btn--muted" onClick={cancel}>{t('lsi_cancel')}</button>
      </div>
    );
  }

  /* ───────────── Demo kirish formasi ───────────── */
  if (showDemo && phase === 'idle') return <DemoLoginForm onBack={() => setShowDemo(false)} onSuccess={onDemoOk} />;

  /* ───────────── Boshlang'ich ───────────── */
  return (
    <div className="lsi">
      <div className="lsi-hero" aria-hidden="true">
        <span className="lsi-ring lsi-ring--1" /><span className="lsi-ring lsi-ring--2" />
        <img className="lsi-logo" src="/brand/lokma-go-icon.png" alt="" />
        <span className="lsi-orbit lsi-orbit--a"><Icon name="burger" size={18} color="var(--brand)" /></span>
        <span className="lsi-orbit lsi-orbit--b"><Icon name="cake" size={18} color="var(--brand)" /></span>
        <span className="lsi-orbit lsi-orbit--c"><Icon name="coffee" size={18} color="var(--brand)" /></span>
      </div>

      <h2 className="lsi-title">{title}</h2>
      <p className="lsi-sub">{sub}</p>

      <ul className="lsi-chips">
        <li><Icon name="clock" size={14} color="var(--brand)" /> {t('lsi_chip_fast')}</li>
        <li><Icon name="gift" size={14} color="var(--brand)" /> {t('lsi_chip_bonus')}</li>
        <li><Icon name="pin" size={14} color="var(--brand)" /> {t('lsi_chip_addr')}</li>
      </ul>

      <button type="button" className="lsi-cta" onClick={go}>
        <Icon name="send" size={19} color="#fff" /><span>{t('lsi_cta')}</span>
      </button>
      <p className="lsi-secure"><Icon name="shieldCheck" size={14} color="var(--muted)" /> {t('lsi_secure')}</p>
      {onOtherMethod && <button type="button" className="lsi-link-btn lsi-link-btn--muted" onClick={onOtherMethod}>{t('lsi_other')}</button>}
      {demoAvailable && <button type="button" className="lsi-link-btn lsi-link-btn--muted lsi-link-btn--demo" onClick={() => setShowDemo(true)} data-testid="demo-enter">{t('demo_enter')}</button>}
    </div>
  );
}

/**
 * Profil sahifasida (mehmon uchun): yumshoq taklif kartochkasi — "Profilingizni yarating".
 */
export function GuestHero({ onSignIn }) {
  const t = useT();
  return (
    <section className="lsi-guest">
      <div className="lsi-guest__glow" aria-hidden="true" />
      <img className="lsi-guest__logo" src="/brand/lokma-go-icon.png" alt="" />
      <h2 className="lsi-guest__title">{t('lsi_guest_title')}</h2>
      <p className="lsi-guest__sub">{t('lsi_guest_sub')}</p>
      <ul className="lsi-chips lsi-chips--left">
        <li><Icon name="heart" size={14} color="var(--brand)" /> {t('favorites')}</li>
        <li><Icon name="gift" size={14} color="var(--brand)" /> {t('lsi_chip_bonus')}</li>
        <li><Icon name="pin" size={14} color="var(--brand)" /> {t('lsi_chip_addr')}</li>
      </ul>
      <button type="button" className="lsi-cta" onClick={onSignIn}>
        <Icon name="send" size={19} color="#fff" /><span>{t('lsi_guest_cta')}</span>
      </button>
    </section>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '@/api';
import { useT } from '@/i18n';
import { clientInfo, isNativeApp } from '@/lib/clientInfo';
import {
  completeFlexible, decide, flexibleUpdate, immediateUpdate, openStore, readSnooze, storeInfo, writeSnooze,
} from '@/lib/appUpdate';
import './AppUpdate.css';

/*
 * ═══ ILOVA YANGILANISHI — faqat native iOS / Android ═══
 * Qachon tekshiriladi: ilova ochilgach (splash tugab, biroz kutib) va fondan qaytganda
 * (majburiy — har safar, ixtiyoriy — 6 soatda bir). Qarorlar: lib/appUpdate.js decide().
 *
 *   force    — yopib bo'lmaydigan oyna (eski versiya serverda ishlamaydi)
 *   prompt   — "Yangi versiya" taklifi, faqat bosh sahifada (savat/to'lov paytida bezovta qilinmaydi)
 *   flexible — Android: Google Play fonda yuklaydi; tayyor bo'lgach pastda "Qayta ishga tushirish"
 *
 * Har qanday xato — jim (ilova ishlayveradi).
 */
const FIRST_CHECK_MS = 2500;
const SOFT_EVERY_MS = 6 * 60 * 60_000;

export function AppUpdate() {
  const t = useT();
  const location = useLocation();
  const [state, setState] = useState({ action: 'none' });
  const [ready, setReady] = useState(false);     // Android: yuklab olindi, o'rnatishga tayyor
  const lastSoft = useRef(0);
  const flexibleStarted = useRef(false);
  const busy = useRef(false);
  const cfgRef = useRef(null);

  const check = useCallback(async ({ soft = true } = {}) => {
    if (!isNativeApp() || busy.current) return;
    busy.current = true;
    try {
      const [cfg, info] = await Promise.all([
        api.getAppConfig().catch(() => cfgRef.current),
        storeInfo().catch(() => null),
      ]);
      cfgRef.current = cfg || cfgRef.current;
      const platform = clientInfo().channel;
      const res = decide({
        platform,
        current: info?.current || clientInfo().appVersion,
        store: info?.store || {},
        cfg: cfgRef.current || {},
        snooze: readSnooze(),
      });
      if (res.action === 'force') {
        if (res.immediate) { await immediateUpdate().catch(() => setState(res)); return; }
        setState(res);
        return;
      }
      if (!soft) return;
      lastSoft.current = Date.now();
      if (res.action === 'flexible' && !flexibleStarted.current) {
        flexibleStarted.current = true;
        flexibleUpdate(() => setReady(true)).catch(() => { flexibleStarted.current = false; });
        return;
      }
      if (res.action === 'prompt') setState({ ...res, days: cfgRef.current?.updatePromptDays || 3 });
    } finally {
      busy.current = false;
    }
  }, []);

  // Birinchi tekshiruv — ilova ko'ringach
  useEffect(() => {
    if (!isNativeApp()) return undefined;
    const tm = setTimeout(() => check({ soft: true }), FIRST_CHECK_MS);
    return () => clearTimeout(tm);
  }, [check]);

  // Fondan qaytganda: majburiy — har safar, ixtiyoriy — 6 soatda bir
  useEffect(() => {
    if (!isNativeApp()) return undefined;
    let handle;
    import('@capacitor/app').then(({ App }) => App.addListener('resume', () => {
      check({ soft: Date.now() - lastSoft.current > SOFT_EVERY_MS });
    })).then((h) => { handle = h; }).catch(() => {});
    return () => { handle?.remove?.(); };
  }, [check]);

  const later = () => { writeSnooze(state.version, state.days); setState({ action: 'none' }); };
  const update = () => openStore(state.storeUrl);

  if (state.action === 'force') {
    return (
      <div className="aup aup--force" role="alertdialog" aria-modal="true" aria-labelledby="aup-title">
        <div className="aup-sheet">
          <div className="aup-badge" aria-hidden="true">↑</div>
          <h2 id="aup-title" className="aup-title">{t('updateForceTitle')}</h2>
          <p className="aup-text">{t('updateForceText')}</p>
          <button type="button" className="aup-btn aup-btn--primary" onClick={update}>{t('updateNow')}</button>
        </div>
      </div>
    );
  }

  // Ixtiyoriy taklif — faqat bosh sahifada (buyurtma berayotganda halal berilmaydi)
  if (state.action === 'prompt' && location.pathname === '/') {
    return (
      <div className="aup" role="dialog" aria-modal="true" aria-labelledby="aup-title">
        <div className="aup-backdrop" onClick={later} />
        <div className="aup-sheet">
          <div className="aup-badge" aria-hidden="true">↑</div>
          <h2 id="aup-title" className="aup-title">{t('updatePromptTitle')}</h2>
          <p className="aup-text">{t('updatePromptText')}</p>
          <button type="button" className="aup-btn aup-btn--primary" onClick={() => { update(); later(); }}>{t('updateNow')}</button>
          <button type="button" className="aup-btn" onClick={later}>{t('updateLater')}</button>
        </div>
      </div>
    );
  }

  if (ready) {
    return (
      <div className="aup-snack" role="status">
        <span>{t('updateReadyText')}</span>
        <button type="button" onClick={() => completeFlexible().catch(() => setReady(false))}>{t('updateRestart')}</button>
      </div>
    );
  }
  return null;
}

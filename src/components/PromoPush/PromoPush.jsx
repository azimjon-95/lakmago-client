import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useDistrict } from '@/store/district';
import { useUser } from '@/store/user';
import { useModalBackClose } from '@/hooks/useModalBackClose';
import { haptic } from '@/lib/telegram';
import { isNativeApp } from '@/lib/clientInfo';
import {
  setPushNavigator, setPushContext, shouldAskConsent, acceptConsent, declineConsent,
  refreshPushRegistration, isOptedIn,
} from '@/lib/promoPush';
import { api } from '@/api';
import './PromoPush.css';

const FIRST_DELAY_MS = 7000;
const RETRY_MS = 5000;
const MAX_WAIT_MS = 90_000;

/**
 * Ilova uchun push ko'prigi (faqat iOS/Android; veb/Telegramda hech narsa qilmaydi):
 *  • bildirishnoma bosilsa — router orqali taom sahifasiga o'tish;
 *  • til, tuman, hisob o'zgarsa — serverga yangilash (rozi bo'lsa);
 *  • BIR MARTA rozilik oynasi: ilova ochilgandan ~7 s keyin, boshqa oyna ochiq bo'lmasa. Ilovani bloklamaydi.
 */
export function PromoPush() {
  const navigate = useNavigate();
  const { lang } = useI18n();
  const district = useDistrict((s) => s.activeDistrictId) || '';
  const userId = useUser((s) => s.user?.id || s.user?._id || '');
  const [ask, setAsk] = useState(false);
  const firstSync = useRef(true);

  useEffect(() => {
    if (!isNativeApp()) return undefined;
    setPushNavigator((url) => navigate(url));
    return () => setPushNavigator(null);
  }, [navigate]);

  // Til / tuman / hisob — serverga (faqat rozi bo'lsa). Birinchi render'da pushBoot o'zi ro'yxatdan o'tkazadi.
  useEffect(() => {
    setPushContext({ district });
    if (!isNativeApp() || !isOptedIn()) return;
    if (firstSync.current) { firstSync.current = false; return; }
    api.pushPrefs({ lang, district }).catch(() => {});
  }, [lang, district]);
  useEffect(() => { if (userId) refreshPushRegistration(); }, [userId]);

  // Rozilik oynasi: bir marta, boshqa modal (reklama, yangilanish, kirish) ochiq bo'lmaganda
  useEffect(() => {
    if (!isNativeApp()) return undefined;
    let stopped = false;
    let timer;
    const started = Date.now();
    const tryShow = async () => {
      if (stopped) return;
      if (!(await shouldAskConsent())) return;
      const busy = document.querySelector('[aria-modal="true"], [role="dialog"], .ocm-overlay, .pmx-backdrop, .aup');
      if (busy || document.hidden) {
        if (Date.now() - started < MAX_WAIT_MS) timer = setTimeout(tryShow, RETRY_MS);
        return;
      }
      setAsk(true);
    };
    timer = setTimeout(tryShow, FIRST_DELAY_MS);
    return () => { stopped = true; clearTimeout(timer); };
  }, []);

  if (!ask) return null;
  return <PushConsentSheet onDone={() => setAsk(false)} />;
}

export function PushConsentSheet({ onDone }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const close = () => { declineConsent(); onDone(); };
  useModalBackClose(true, close);

  const yes = async () => {
    haptic();
    setBusy(true);
    await acceptConsent();
    onDone();
  };

  return (
    <div className="pp-overlay" onClick={busy ? undefined : close}>
      <div className="pp-sheet" role="dialog" aria-modal="true" aria-labelledby="pp-title" onClick={(e) => e.stopPropagation()}>
        <div className="pp-preview" aria-hidden="true">
          <div className="pp-note pp-note--back" />
          <div className="pp-note">
            <div className="pp-note__app">
              <span className="pp-note__icon">🍲</span>
              <span className="pp-note__name">Lokma Go</span>
              <span className="pp-note__time">{t('pushPreviewTime')}</span>
            </div>
            <div className="pp-note__title">{t('pushPreviewTitle')}</div>
            <div className="pp-note__body">{t('pushPreviewBody')}</div>
          </div>
        </div>

        <h2 id="pp-title" className="pp-title">{t('pushAskTitle')}</h2>
        <p className="pp-text">{t('pushAskText')}</p>

        <div className="pp-actions">
          <button type="button" className="pp-btn pp-btn--primary" onClick={yes} disabled={busy}>
            {t('pushAskYes')}
          </button>
          <button type="button" className="pp-btn pp-btn--ghost" onClick={close} disabled={busy}>
            {t('pushAskNo')}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useT } from '@/i18n';
import { renderTelegramLoginWidget } from '@/lib/telegramWebAuth';
import './TelegramOnly.css';

/*
 * Brauzerda (Chrome/Safari, Telegram tashqarisida) ochilganda
 * ko'rsatiladi. Auth fundamenti 2-bosqichigacha bu ekran FAQAT
 * "Telegramda oching" havolasini ko'rsatardi — endi Telegram
 * Login Widget orqali TO'G'RIDAN-TO'G'RI shu sahifada ham
 * kirish mumkin (initData Mini App'dan tashqarida mavjud emas,
 * shuning uchun butunlay boshqa mexanizm — src/lib/telegramWebAuth.js).
 *
 * Muvaffaqiyatli login bo'lsa onLoggedIn(profile) chaqiriladi —
 * App.jsx shu orqali <AppInner />'ga o'tadi (Mini App bilan BIR
 * XIL keyingi tajriba, faqat kirish usuli farqli).
 */
export function TelegramOnly({ onLoggedIn }) {
  const t = useT();
  const widgetRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // `??` emas, `||` — bo'sh satr ham zaxira qiymatga o'tsin
  // (qarang: src/lib/telegramWebAuth.js dagi batafsil izoh).
  const botUsername = (import.meta.env.VITE_BOT_USERNAME || 'lokmaGobot')
    .trim().replace(/^@/, '');
  const webappName = import.meta.env.VITE_WEBAPP_NAME ?? 'app';
  const startLink = `https://t.me/${botUsername}?start=web`;
  const appLink = webappName
    ? `https://t.me/${botUsername}/${webappName}`
    : `https://t.me/${botUsername}?startapp=`;

  useEffect(() => {
    setLoading(true);
    const cleanup = renderTelegramLoginWidget(
      widgetRef.current,
      (profile) => { setLoading(false); onLoggedIn?.(profile); },
      (e) => { setLoading(false); setError(e.message); },
    );
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="tg-only">
      <div className="tg-only__card">
        <div className="tg-only__logo"><Icon name="utensils" size={44} color="var(--brand-text)" /></div>
        <h1 className="tg-only__title">LokmaGo</h1>
        <p className="tg-only__text">
          {t('telegramLoginPrompt')}
        </p>

        <div ref={widgetRef} className="tg-only__widget" />
        {loading && <div className="tg-only__widget-loading">{t('loading')}</div>}
        {error && <div className="tg-only__error">{error}</div>}

        <div className="tg-only__divider"><span>{t('orLabel')}</span></div>

        <a href={startLink} className="tg-only__btn">
          <Icon name="send" size={18} color="var(--brand-text)" /> {t('openInTelegram')}
        </a>
        <a href={appLink} className="tg-only__link" target="_blank" rel="noreferrer">
          {t('openDirectly')}
        </a>
      </div>
    </div>
  );
}


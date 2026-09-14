import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useT, useI18n } from '@/i18n';
import { renderTelegramLoginWidget } from '@/lib/telegramWebAuth';
import '@/components/TelegramOnly/TelegramOnly.css';

/*
 * Telegram Login Widget'ning "karta" ko'rinishi — brauzer (Chrome/
 * Safari) orqali kirish uchun.
 *
 * MUHIM (Phase 3, 1-bosqich): bu komponent components/TelegramOnly/
 * TelegramOnly.jsx dagi ICHKI JSX/state mantig'ining NUSXASI (bir
 * xil CSS sinflari — TelegramOnly.css qayta import qilinadi, bir
 * xil renderTelegramLoginWidget() chaqiruvi). TelegramOnly.jsx
 * ATAYLAB o'zgartirilmadi — u hali App.jsx'da to'g'ridan-to'g'ri
 * ishlatilmoqda, "kichik va xavfsiz bosqichlar" tamoyiliga ko'ra
 * unga tegmaslik shart edi. App.jsx integratsiyasi bosqichida
 * (tasdiqlangandan keyin) TelegramOnly.jsx ham shu komponentdan
 * foydalanadigan qilib refaktor qilinishi mumkin — bu HOZIRGI
 * bosqich doirasidan tashqari, alohida, kichikroq qadam.
 *
 * Login logikasi (renderTelegramLoginWidget — widget chizish,
 * serverga so'rov, token saqlash) BUTUNLAY qayta ishlatiladi,
 * hech qanday nusxa YOKI yangi implementatsiya yo'q — faqat UI
 * qatlami (widgetReady/authing/error state va JSX) TelegramOnly
 * bilan bir xil.
 */
export function TelegramLoginCard({ onLoggedIn }) {
  const t = useT();
  const { lang } = useI18n();
  const widgetRef = useRef(null);
  const [error, setError] = useState(null);
  const [box, setBox] = useState(null);
  const [widgetReady, setWidgetReady] = useState(false);
  const [authing, setAuthing] = useState(false);

  useEffect(() => {
    const cleanup = renderTelegramLoginWidget(
      widgetRef.current,
      (profile) => { setAuthing(false); onLoggedIn?.(profile); },
      (e) => {
        setAuthing(false);
        setWidgetReady(true);
        setError(e.message === 'WIDGET_LOAD_FAILED' ? t('widgetLoadFailed') : e.message);
      },
      {
        lang,
        onWidgetReady: () => {
          setWidgetReady(true);
          const frame = widgetRef.current?.querySelector('iframe');
          if (frame) setBox({ w: frame.offsetWidth, h: frame.offsetHeight });
        },
        onAuthStart: () => { setError(null); setAuthing(true); },
      },
    );
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="tg-only__card">
      <div className="tg-only__logo">
        <Icon name="utensils" size={38} color="var(--brand-text)" />
      </div>

      <h1 className="tg-only__title">LokmaGo</h1>
      <p className="tg-only__text">{t('telegramLoginPrompt')}</p>

      <div
        className="tg-only__auth"
        style={box ? { width: box.w, height: box.h } : undefined}
      >
        {widgetReady && !authing && (
          <div className="tg-only__fakebtn" aria-hidden="true">
            <Icon name="send" size={18} color="var(--brand-text)" />
            <span>{t('loginWithTelegram')}</span>
          </div>
        )}

        <div ref={widgetRef} className="tg-only__widget" data-masked={widgetReady && !authing} />

        {!widgetReady && !error && <div className="tg-only__skeleton" aria-hidden="true" />}

        {authing && (
          <div className="tg-only__status" role="status">
            <span className="tg-only__spinner" aria-hidden="true" />
            {t('signingIn')}
          </div>
        )}
      </div>

      {error && (
        <div className="tg-only__error" role="alert">
          <Icon name="info" size={15} color="var(--danger)" />
          <span>{error}</span>
        </div>
      )}

      <p className="tg-only__note">{t('telegramLoginNote')}</p>
    </div>
  );
}

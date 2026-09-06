import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useT, useI18n } from '@/i18n';
import { renderTelegramLoginWidget } from '@/lib/telegramWebAuth';
import './TelegramOnly.css';

/*
 * Brauzerda (Chrome / Safari / Windows — Telegram tashqarisida)
 * ochilganda ko'rsatiladigan kirish ekrani.
 *
 * ═══ YAGONA KIRISH YO'LI — TELEGRAM LOGIN WIDGET ═══
 *
 * Ilgari bu yerda uchta variant bor edi: vidjet, "Telegram'da
 * ochish" va "To'g'ridan ilovani ochish". Ikkinchi va uchinchisi
 * mijozni saytdan CHIQARIB yuborardi — u Telegram ilovasiga
 * o'tib ketardi va veb versiya umuman ishlatilmasdi. Endi ular
 * olib tashlandi: brauzerdan kelgan mijoz shu yerda kirib,
 * xaridini shu yerda davom ettiradi.
 *
 * Akkaunt bitta: vidjet ham, Mini App ham serverda bir xil
 * `telegramId` bo'yicha topiladi, shuning uchun savat, manzillar
 * va buyurtmalar ikkala kirish yo'lida ham umumiy.
 */
export function TelegramOnly({ onLoggedIn }) {
  const t = useT();
  const { lang } = useI18n();
  const widgetRef = useRef(null);
  const [error, setError] = useState(null);

  /*
   * Vidjet iframe'ining O'LCHAMI.
   *
   * Telegram tugmasi cross-origin iframe ichida — uning rangini
   * yoki shaklini CSS bilan o'zgartirib bo'lmaydi. Shuning uchun
   * ostiga O'ZIMIZNING brend tugmamizni qo'yamiz, iframe esa
   * ustida shaffof holda turadi: mijoz bizning tugmani ko'radi,
   * bosganda esa bosish haqiqiy Telegram tugmasiga tushadi.
   *
   * Buning ishlashi uchun ikkalasi AYNAN bir o'lchamda bo'lishi
   * shart — shuning uchun iframe chizilgach o'lchamini o'lchab,
   * brend tugmasiga beramiz. Til yoki shrift o'zgarsa ham
   * mos kelib turadi.
   */
  const [box, setBox] = useState(null);

  /*
   * IKKI XIL HOLAT — ILGARI BITTASI BILAN BOSHQARILARDI.
   *
   * Eski kodda `loading` mount'da true qilinardi va faqat kirish
   * TUGAGANDA false bo'lardi. Vidjet chizilgani tekshirilmasdi,
   * shuning uchun "Yuklanmoqda..." yozuvi vidjet allaqachon
   * ekranda turganda ham qolib ketardi.
   *
   *   widgetReady — vidjet chizildimi (ungacha skelet)
   *   authing     — mijoz Telegram'da tasdiqladi, server javobi kutilmoqda
   */
  const [widgetReady, setWidgetReady] = useState(false);
  const [authing, setAuthing] = useState(false);

  useEffect(() => {
    const cleanup = renderTelegramLoginWidget(
      widgetRef.current,
      (profile) => { setAuthing(false); onLoggedIn?.(profile); },
      (e) => {
        setAuthing(false);
        setWidgetReady(true); // skeletni olib tashlaymiz, xato ko'rinsin
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
    <div className="tg-only">
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
          {/*
            Ko'rinadigan brend tugmasi. Bosishni O'ZI qabul
            qilmaydi — ustidagi shaffof Telegram iframe'i qabul
            qiladi (izohga qarang). Shuning uchun aria-hidden.
          */}
          {widgetReady && !authing && (
            <div className="tg-only__fakebtn" aria-hidden="true">
              <Icon name="send" size={18} color="var(--brand-text)" />
              <span>{t('loginWithTelegram')}</span>
            </div>
          )}

          {/* Haqiqiy vidjet — ustida, shaffof */}
          <div ref={widgetRef} className="tg-only__widget" data-masked={widgetReady && !authing} />

          {/* Vidjet chizilgunicha — o'lchamdosh skelet, sakrash bo'lmasin */}
          {!widgetReady && !error && <div className="tg-only__skeleton" aria-hidden="true" />}

          {/* Server javobi kutilmoqda */}
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
    </div>
  );
}

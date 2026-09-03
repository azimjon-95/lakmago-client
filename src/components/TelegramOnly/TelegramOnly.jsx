import { Icon } from '@/components/Icon';
import { useT } from '@/i18n';
import './TelegramOnly.css';

// Brauzerda ochilsa ko'rsatiladi — ilova faqat Telegram ichida ishlaydi.
export function TelegramOnly() {
  const t = useT();
  const botUsername = import.meta.env.VITE_BOT_USERNAME ?? 'LokmaGoBot';
  const webappName = import.meta.env.VITE_WEBAPP_NAME ?? 'app';

  // Asosiy havola: botga ?start=web bilan o'tadi.
  // Telegram bu havolani ochganda AVTOMATIK /start web yuboradi (foydalanuvchi
  // hech nima yozmaydi) — obuna gate + xush kelibsiz oqimi ishga tushadi,
  // so'ng "Buyurtma berish" (webapp) tugmasi beriladi.
  const startLink = `https://t.me/${botUsername}?start=web`;
  // Muqobil: to'g'ridan Mini App (obuna talab qilinmasa — eng tez)
  const appLink = webappName
    ? `https://t.me/${botUsername}/${webappName}`
    : `https://t.me/${botUsername}?startapp=`;

  return (
    <div className="tg-only">
      <div className="tg-only__card">
        <div className="tg-only__logo"><Icon name="utensils" size={44} color="var(--brand-text)" /></div>
        <h1 className="tg-only__title">LokmaGo</h1>
        <p className="tg-only__text">
          {t('telegramOnlyLine1')}
          {' '}
          {t('telegramOnlyLine2')}
        </p>
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

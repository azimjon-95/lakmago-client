import { Icon } from '@/components/Icon';
import './TelegramOnly.css';

// Brauzerда ochilса ko'rsatiladi — ilova faqat Telegram ичida ishlaydi.
export function TelegramOnly() {
  const botUsername = import.meta.env.VITE_BOT_USERNAME ?? 'LokmaGoBot';
  const webappName = import.meta.env.VITE_WEBAPP_NAME ?? 'app';

  // Asosiy havola: botга ?start=web bilan o'tadi.
  // Telegram bu havolани ochганда AVTOMATIK /start web yuboradi (foydalanuvchi
  // hech nima yozmaydi) — obuna gate + xush kelibsiz oqimи ishga tushadi,
  // so'ng "Buyurtma berish" (webapp) tugmasi beriladi.
  const startLink = `https://t.me/${botUsername}?start=web`;
  // Muqobil: to'g'ridan Mini App (obuna talab qilinmаса — eng tez)
  const appLink = webappName
    ? `https://t.me/${botUsername}/${webappName}`
    : `https://t.me/${botUsername}?startapp=`;

  return (
    <div className="tg-only">
      <div className="tg-only__card">
        <div className="tg-only__logo"><Icon name="utensils" size={44} color="#2C1400" /></div>
        <h1 className="tg-only__title">LokmaGo</h1>
        <p className="tg-only__text">
          Ilova faqat <b>Telegram</b> ichida ishlaydi.
          Quyidagi tugmani bosing — Telegram'да avtomatik ochiladi.
        </p>
        <a href={startLink} className="tg-only__btn">
          <Icon name="send" size={18} color="#2C1400" /> Telegram'да ochish
        </a>
        <a href={appLink} className="tg-only__link" target="_blank" rel="noreferrer">
          To'g'ridan ilovani ochish
        </a>
      </div>
    </div>
  );
}

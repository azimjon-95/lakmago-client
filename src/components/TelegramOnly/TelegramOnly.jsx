import { Icon } from '@/components/Icon';
import './TelegramOnly.css';

// Brauzerда ochilса ko'rsatiladi — ilova faqat Telegram ичида ishlaydi.
export function TelegramOnly() {
  const botUsername = import.meta.env.VITE_BOT_USERNAME ?? 'LokmaGoBot';
  const webappName = import.meta.env.VITE_WEBAPP_NAME ?? 'app';
  const link = `https://t.me/${botUsername}/${webappName}`;

  return (
    <div className="tg-only">
      <div className="tg-only__card">
        <div className="tg-only__logo">🍽</div>
        <h1 className="tg-only__title">LokmaGo</h1>
        <p className="tg-only__text">
          Ilova faqat <b>Telegram</b> ichida ishlaydi.
          Buyurtma berish uchun quyidagi tugma orqali Telegram'да oching.
        </p>
        <a href={link} className="tg-only__btn" target="_blank" rel="noreferrer">
          <Icon name="send" size={18} color="#2C1400" /> Telegram'да ochish
        </a>
        <p className="tg-only__hint">yoki @{botUsername} ni Telegram'да toping</p>
      </div>
    </div>
  );
}

import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { useT } from '@/i18n';
import './HomeSections.css';

/*
 * Bosh sahifa: banner ostidagi bo'lim tugmalari.
 *   Lokma Market  — oziq-ovqat do'konlari (/market)
 *   To'yxonalar   — hozircha "Tez orada", bosilmaydi
 * Qaysi tugma ko'rinishi — serverdagi .env (LOKMA_MARKET_ACCESS /
 * LOKMA_WEDDING_ACCESS): `all` yoki test uchun Telegram ID'lar.
 * Hech biri ochiq bo'lmasa — blok umuman chizilmaydi (bosh sahifa avvalgidek).
 */
export const HomeSections = memo(function HomeSections({ market, wedding }) {
  const t = useT();
  const navigate = useNavigate();
  if (!market && !wedding) return null;

  return (
    <div className={`home-sections ${market && wedding ? '' : 'home-sections--single'}`}>
      {market && (
        <button type="button" className="home-section-tile home-section-tile--market" onClick={() => navigate('/market')}>
          <span className="home-section-tile__art" aria-hidden="true">🧺</span>
          <span className="home-section-tile__text">
            <span className="home-section-tile__title">{t('lokmaMarket')}</span>
            <span className="home-section-tile__sub">{t('marketSubtitle')}</span>
          </span>
          <Icon name="chevronRight" size={18} color="var(--muted)" />
        </button>
      )}
      {wedding && (
        <div className="home-section-tile home-section-tile--wedding is-disabled" aria-disabled="true">
          <span className="home-section-tile__art" aria-hidden="true">💐</span>
          <span className="home-section-tile__text">
            <span className="home-section-tile__title">{t('weddingHalls')}</span>
            <span className="home-section-tile__soon">
              <Icon name="clock" size={11} color="currentColor" /> {t('comingSoon')}
            </span>
          </span>
        </div>
      )}
    </div>
  );
});

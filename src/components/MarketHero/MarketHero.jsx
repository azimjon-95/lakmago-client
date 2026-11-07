import { Icon } from '@/components/Icon';
import { useT } from '@/i18n';
import './MarketHero.css';

/*
 * ═══ LOKMA MARKET — BOSH BANNER ═══
 * Yashil to'lqinli fon + skuterdagi kuryer CHAPDAN yumshoq kirib keladi (keyin yengil "yurish" tebranishi),
 * yozuvlar ketma-ket yumshoq paydo bo'ladi. "Harakatni kamaytirish" yoqilgan qurilmada animatsiyasiz.
 * Rasmlar: /sections/market-hero-bg.webp (fon), /sections/market-courier.webp (shaffof kuryer).
 */
export function MarketHero() {
  const t = useT();
  return (
    <section className="mhero" aria-label={t('lokmaMarket')} data-testid="market-hero">
      <div className="mhero__bg" aria-hidden="true" />
      <div className="mhero__streaks" aria-hidden="true"><i /><i /><i /></div>
      <img className="mhero__courier" src="/sections/market-courier.webp" alt="" width="420" height="485" decoding="async" fetchpriority="high" />

      <div className="mhero__content">
        <div className="mhero__badge mhero__in" style={{ '--d': '0.15s' }}>
          <span className="mhero__leaf" aria-hidden="true" />{t('lokmaMarket').toUpperCase()}
        </div>
        <h2 className="mhero__title mhero__in" style={{ '--d': '0.3s' }}>
          <span>{t('marketHeroTop')}</span>
          <span className="mhero__accent">{t('marketHeroAccent')}</span>
        </h2>
        <ul className="mhero__feats">
          <li className="mhero__in" style={{ '--d': '0.5s' }}>
            <span className="mhero__ic mhero__ic--zap"><Icon name="zap" size={18} strokeWidth={1.6} /></span>
            <span>{t('marketFeatFast')}</span>
          </li>
          <li className="mhero__in" style={{ '--d': '0.62s' }}>
            <span className="mhero__ic mhero__ic--deal"><Icon name="discount" size={13} strokeWidth={2.6} /></span>
            <span>{t('marketFeatDeals')}</span>
          </li>
          <li className="mhero__in" style={{ '--d': '0.74s' }}>
            <span className="mhero__ic mhero__ic--shield"><Icon name="shieldCheck" size={18} strokeWidth={1.8} /></span>
            <span>{t('marketFeatTrusted')}</span>
          </li>
        </ul>
      </div>
    </section>
  );
}

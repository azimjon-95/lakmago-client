import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { useT } from '@/i18n';
import { useSection } from '@/store/section';
import './HomeSections.css';

/*
 * ═══ BO'LIMLAR ORASIDA O'TISH TUGMALARI ═══
 *
 * Bosh sahifada (current='home'):   [ Lokma Market ]  [ To'yxonalar · Tez orada ]
 * Market sahifasida (current='market'): [ Lokma Go ]  [ To'yxonalar · Tez orada ]
 * Shu tariqa bo'limlar orasida bir bosishda o'tiladi.
 *
 * Ko'rinish — server .env ruxsatiga qarab (LOKMA_MARKET_ACCESS /
 * LOKMA_WEDDING_ACCESS): `all` yoki test uchun Telegram ID'lar.
 * Bosh sahifada hech biri ochiq bo'lmasa — blok chizilmaydi.
 *
 * Rasmlar: public/sections/*.webp (fon shaffof, obyekt to'liq — kesilmagan).
 */
const IMG = {
  market: '/sections/market-basket.webp',
  wedding: '/sections/wedding-cloche.webp',
  go: '/sections/lokma-go.webp',
};

function Tile({ variant, img, title, sub, soon, onClick }) {
  const disabled = Boolean(soon);
  const Tag = disabled ? 'div' : 'button';
  return (
    <Tag
      {...(disabled ? { 'aria-disabled': 'true' } : { type: 'button', onClick })}
      className={`home-section-tile home-section-tile--${variant} ${disabled ? 'is-disabled' : ''}`}
    >
      <span className="home-section-tile__art" aria-hidden="true">
        <img src={img} alt="" width="64" height="64" loading="eager" decoding="async" draggable="false" />
      </span>
      <span className="home-section-tile__text">
        <span className="home-section-tile__title">{title}</span>
        {soon ? (
          <span className="home-section-tile__soon">
            <Icon name="clock" size={11} color="currentColor" /> {soon}
          </span>
        ) : sub ? (
          <span className="home-section-tile__sub">{sub}</span>
        ) : null}
      </span>
      {!disabled && <Icon name="chevronRight" size={16} color="var(--muted)" />}
    </Tag>
  );
}

export const HomeSections = memo(function HomeSections({ current = 'home', market, wedding }) {
  const t = useT();
  const navigate = useNavigate();
  const setSection = useSection((s) => s.setSection);

  const first = current === 'market'
    // Marketdan — ovqat bo'limiga qaytish (doim mavjud)
    ? <Tile variant="go" img={IMG.go} title={t('lokmaGo')} sub={t('lokmaGoSubtitle')} onClick={() => { setSection('go'); navigate('/'); }} />
    : market
      ? <Tile variant="market" img={IMG.market} title={t('lokmaMarket')} sub={t('marketSubtitle')} onClick={() => navigate('/market')} />
      : null;
  const second = wedding
    ? <Tile variant="wedding" img={IMG.wedding} title={t('lokmaWedding')} soon={t('comingSoon')} />
    : null;

  if (!first && !second) return null;
  return (
    <div className={`home-sections ${first && second ? '' : 'home-sections--single'}`}>
      {first}
      {second}
    </div>
  );
});

import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { useT } from '@/i18n';
import { useSection } from '@/store/section';
import './HomeSections.css';

/*
 * ═══ BO'LIMLAR ORASIDA O'TISH TUGMALARI ═══
 *
 * Bosh sahifada (current='home'):   [ Lokma Market ]  [ Lokma To'yxonalari ]
 * Market sahifasida (current='market'): [ Lokma Go ]  [ Lokma To'yxonalari ]
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

/*
 * Orqa fon rasmlari (to'yxona saytidagi tugmalar bilan BIR XIL uslub):
 *   go / market — Unsplash (to'yxona saytidagi bilan bir xil rasmlar),
 *   wedding     — haqiqiy to'yxona zali (public/sections/wedding-bg.webp).
 * Rasm yuklanmasa ham tugma o'z rangida (--hs-base) chiroyli ko'rinadi.
 */
const PHOTO = {
  go: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=640&q=70&auto=format&fit=crop',
  market: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=640&q=70&auto=format&fit=crop',
  wedding: '/sections/wedding-bg.webp',
};

function Tile({ variant, img, title, sub, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${title}. ${sub || ''}`}
      className={`home-section-tile home-section-tile--${variant}`}
      style={{ '--hs-photo': `url("${PHOTO[variant]}")` }}
    >
      {/* Yuqorida: eski 3D belgi (chapda) va strelka (o'ngda); pastda — nom to'liq kenglikda */}
      <span className="home-section-tile__top">
        {/* Belgi o'z o'lchamidagi oq (xira shisha) quti ustida */}
        <span className="home-section-tile__icon-box">
          <img className="home-section-tile__icon" src={img} alt="" width="34" height="34" loading="eager" decoding="async" draggable="false" />
        </span>
        <span className="home-section-tile__arrow" aria-hidden="true">
          <Icon name="arrowRight" size={13} color="#1A1A17" />
        </span>
      </span>
      <span className="home-section-tile__text">
        <span className="home-section-tile__title">{title}</span>
        {sub ? <span className="home-section-tile__sub">{sub}</span> : null}
      </span>
    </button>
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
  // To'yxonalar — Lokma ichida ochiladi (pages/Weddings, alohida sayt iframe'da)
  const second = wedding
    ? <Tile variant="wedding" img={IMG.wedding} title={t('lokmaWedding')} sub={t('weddingSubtitle')} onClick={() => navigate('/weddings')} />
    : null;

  if (!first && !second) return null;
  return (
    <div className={`home-sections ${first && second ? '' : 'home-sections--single'}`}>
      {first}
      {second}
    </div>
  );
});

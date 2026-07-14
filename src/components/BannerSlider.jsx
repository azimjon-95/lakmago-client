import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import './cards/BannerSlider.css';

export function BannerSlider({ banners }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % banners.length), 3500);
    return () => clearInterval(t);
  }, [banners.length]);

  if (!banners.length) return null;
  const b = banners[index];

  return (
    <div className="banner-slider">
      <div className="banner-slide" style={{ background: b.bg }} key={b.id}>
        <div>
          <div className="banner-slide__eyebrow" style={{ color: b.accentText }}>{b.eyebrow}</div>
          <div className="banner-slide__title">{b.title}</div>
          <div className="banner-slide__cta" style={{ background: b.ctaBg, color: b.ctaText }}>{b.cta}</div>
        </div>
        <Icon name={b.icon} size={52} color={b.ctaBg} />
      </div>
      <div className="banner-slider__dots">
        {banners.map((_, i) => (
          <span key={i} className={`banner-slider__dot ${i === index ? 'is-active' : ''}`} />
        ))}
      </div>
    </div>
  );
}

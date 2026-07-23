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

  // Havolani Telegram ichida yoki brauzerda ochamiz
  const openLink = (url) => {
    const tg = window.Telegram?.WebApp;
    if (!url) return;
    if (url.includes('t.me/') && tg?.openTelegramLink) tg.openTelegramLink(url);
    else if (tg?.openLink) tg.openLink(url);
    else window.open(url, '_blank');
  };

  if (!banners.length) return null;
  const b = banners[index];
  // Rasm bo'lsa fon sifatida rasm, bo'lmasa rang
  const slideStyle = b.imageUrl
    ? { background: `center/cover no-repeat url(${b.imageUrl})` }
    : { background: b.bg };

  return (
    <div className="banner-slider">
      <div
        className={`banner-slide ${b.hasButton ? '' : 'banner-slide--plain'}`}
        style={slideStyle}
        key={b.id || b._id}
        onClick={() => b.hasButton && b.linkUrl && openLink(b.linkUrl)}
        role={b.hasButton && b.linkUrl ? 'button' : undefined}
      >
        {/* Matn va tugma faqat yoqilganda — aks holda toza rasm */}
        {b.hasButton && (
          <div className="banner-slide__body">
            {b.eyebrow && (
              <div className="banner-slide__eyebrow" style={{ color: b.accentText }}>{b.eyebrow}</div>
            )}
            {b.title && <div className="banner-slide__title">{b.title}</div>}
            <div className="banner-slide__cta" style={{ background: b.ctaBg, color: b.ctaText }}>
              {b.cta || "Ko'rish"}
            </div>
          </div>
        )}
        {!b.imageUrl && <Icon name={b.icon} size={52} color={b.ctaBg} />}
      </div>
      <div className="banner-slider__dots">
        {banners.map((_, i) => (
          <span key={i} className={`banner-slider__dot ${i === index ? 'is-active' : ''}`} />
        ))}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';

import { Icon } from './Icon';

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
    <div className="mx-4 mb-2 rounded-2xl overflow-hidden relative h-[130px]">
      <div
        className="h-[130px] flex items-center justify-between px-[18px] animate-fade"
        style={{ background: b.bg }}
        key={b.id}>
        
        <div>
          <div className="text-[11px] font-medium" style={{ color: b.accentText }}>
            {b.eyebrow}
          </div>
          <div className="text-[19px] text-white font-medium leading-tight mt-0.5 max-w-[210px]">
            {b.title}
          </div>
          <div
            className="mt-2 inline-block text-xs font-medium px-3 py-[5px] rounded-[9px]"
            style={{ background: b.ctaBg, color: b.ctaText }}>
            
            {b.cta}
          </div>
        </div>
        <Icon name={b.icon} size={52} color={b.ctaBg} />
      </div>
      <div className="absolute bottom-2.5 left-[18px] flex gap-1.5">
        {banners.map((_, i) =>
        <span
          key={i}
          className="h-[5px] rounded-[3px] transition-all"
          style={{
            width: i === index ? 16 : 5,
            background: i === index ? '#EF9F27' : 'rgba(255,255,255,0.5)'
          }} />

        )}
      </div>
    </div>);

}

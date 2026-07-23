import { useState, useEffect } from 'react';

import { Icon } from './Icon';

// Har bir "photo" kaliti uchun realistik rang sxemasi. Backend integratsiyasida bu komponent
// ichida <img src={dish.imageUrl}> bilan almashtiriladi; hozircha restoran/taom yuklagan
// rasm o'rnini bosuvchi vizual taqlid (gradient + shaffof ikon + yorug'lik effekti).
export const PHOTO_STYLES = {
  plov: { grad: 'linear-gradient(145deg, #F4C468 0%, #D98A2E 55%, #B96A1A 100%)', icon: 'bowl', iconColor: 'rgba(70,35,0,0.55)' },
  manti: { grad: 'linear-gradient(145deg, #F0DCC0 0%, #DCB98A 55%, #B98F5C 100%)', icon: 'meat', iconColor: 'rgba(60,35,10,0.5)' },
  kabob: { grad: 'linear-gradient(145deg, #E8956B 0%, #C85A32 55%, #9A3D1D 100%)', icon: 'meat', iconColor: 'rgba(255,255,255,0.55)' },
  sushi: { grad: 'linear-gradient(145deg, #A8D9C4 0%, #5FAE8C 55%, #357560 100%)', icon: 'fish', iconColor: 'rgba(255,255,255,0.6)' },
  tiramisu: { grad: 'linear-gradient(145deg, #E8D4B0 0%, #C9A876 55%, #96754A 100%)', icon: 'cake', iconColor: 'rgba(60,35,10,0.5)' },
  burger: { grad: 'linear-gradient(145deg, #F0C468 0%, #D98F3A 55%, #A85A1E 100%)', icon: 'burger', iconColor: 'rgba(60,25,0,0.55)' }
};








// Rasm slot: photo bo'lsa gradient+ikon "fotosurat" taqlidi, bo'lmasa universal fallback (kamera belgisi bilan)
// Cloudinary URL'ni optimallashtirish (WebP/AVIF, o'lcham) — tez yuklanadi
// fit='contain' bo'lsa c_fit (rasm kesilmaydi), aks holda c_fill (to'ldiradi)
function optimizeCloudinary(url, width, fit = 'cover') {
  if (!url || !url.includes('/upload/')) return url;
  const crop = fit === 'contain' ? 'c_fit' : 'c_fill';
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},${crop}/`);
}

export function DishPhoto({ dish, height = 96, radius = 12, iconSize = 34, fill = false, fit = 'cover' }) {
  // fill=true — ota elementни to'liq egallaydi (modal uchun)
  // fit='contain' — rasm kesilmaydi, to'liq ko'rinadi
  const boxStyle = fill
    ? { width: '100%', height: '100%', borderRadius: radius, overflow: 'hidden', background: dish.tint || 'var(--food-tint-1)' }
    : { height, borderRadius: radius, overflow: 'hidden', background: dish.tint || 'var(--food-tint-1)' };

  // 1) Haqiqiy rasm bo'lsa (Cloudinary) — uni ko'rsatamiz (optimallashtirilган, lazy)
  const realUrl = dish.imageUrl || (dish.images && dish.images[0]);
  if (realUrl && realUrl.startsWith('http')) {
    // contain rejimида kattaroq o'lcham so'raymiz (sifat yo'qolmasin)
    const w = fit === 'contain' ? 800 : 400;
    return (
      <div style={boxStyle}>
        <img
          src={optimizeCloudinary(realUrl, w, fit)}
          alt={dish.name || ''}
          loading="lazy"
          decoding="async"
          style={{ width: '100%', height: '100%', objectFit: fit }}
        />
      </div>
    );
  }

  const style = dish.photo ? PHOTO_STYLES[dish.photo] : null;

  if (style) {
    return (
      <div style={{ height, borderRadius: radius, position: 'relative', overflow: 'hidden', background: style.grad }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.35), transparent 55%)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={style.icon} size={iconSize * 1.7} color={style.iconColor} strokeWidth={1.4} />
        </div>
      </div>);

  }

  return (
    <div style={{ height, borderRadius: radius, background: dish.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <Icon name={dish.icon} size={iconSize} color="#F5A524" />
      <div style={{ position: 'absolute', bottom: 5, right: 6, display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(255,255,255,0.65)', borderRadius: 6, padding: '1px 5px' }}>
        <Icon name="camera" size={9} color="#A99C8C" />
      </div>
    </div>);

}






// Restoran banneri: real rasm (Cloudinary) bo'lsa uni ko'rsatadi, bo'lmasa universal banner
export function RestaurantBanner({ restaurant, height = 150 }) {
  const [index, setIndex] = useState(0);
  const images = restaurant.images || [];

  // Haqiqiy rasm (http) bo'lsa — uni ko'rsatamiz
  const realUrl = restaurant.imageUrl || images.find((u) => typeof u === 'string' && u.startsWith('http'));

  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % images.length), 3000);
    return () => clearInterval(t);
  }, [images.length]);

  if (realUrl && realUrl.startsWith('http')) {
    const optimized = realUrl.includes('/upload/')
      ? realUrl.replace('/upload/', '/upload/f_auto,q_auto,w_800,c_fill/')
      : realUrl;
    return (
      <div style={{ height, position: 'relative', flex: 'none', overflow: 'hidden', background: '#1C1815' }}>
        <img src={optimized} alt={restaurant.name || ''} loading="lazy" decoding="async"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent 45%)' }} />
      </div>
    );
  }

  // Rasm yo'q — restoran ikoni bilan chiroyli gradient.
  // images ichida yaroqsiz qiymat bo'lsa ham shu holat ishlaydi.
  const hasValidImage = images.some((u) => typeof u === 'string' && u.startsWith('http'));
  if (!hasValidImage) {
    return (
      <div style={{
        height,
        background: 'linear-gradient(135deg, #3D2A10 0%, #2A1D0E 100%)',
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flex: 'none',
      }}>
        <Icon name={restaurant.icon} size={64} color="#F5A524" style={{ opacity: 0.35 }} />
      </div>
    );
  }

  const photoKey = images[index];
  const style = PHOTO_STYLES[photoKey] || PHOTO_STYLES.plov;

  return (
    <div style={{ height, position: 'relative', flex: 'none', overflow: 'hidden' }}>
      <div key={photoKey} style={{ height, background: style.grad, position: 'relative' }} className="animate-fade">
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 25% 15%, rgba(255,255,255,0.3), transparent 50%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent 45%)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={style.icon} size={90} color={style.iconColor} strokeWidth={1.3} />
        </div>
      </div>
      {images.length > 1 &&
      <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5 }}>
          {images.map((_, i) =>
        <span
          key={i}
          style={{
            height: 5,
            borderRadius: 3,
            width: i === index ? 16 : 5,
            background: i === index ? '#fff' : 'rgba(255,255,255,0.5)',
            transition: 'width 0.2s'
          }} />

        )}
        </div>
      }
    </div>);

}

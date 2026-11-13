import { useState } from 'react';
import { NoImage } from './NoImage';

/* Mahsulot rasmi: yuklanmasa (xato) yoki manzil bo'sh bo'lsa — "Rasm yo'q" belgisi (bo'sh joy qolmaydi). */
export function ProductImg({ src, alt = '', fit = 'contain', compact = true }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <NoImage compact={compact} />;
  return (
    <img
      src={src} alt={alt} loading="lazy" decoding="async" draggable="false"
      onError={() => setFailed(true)}
      style={{ width: '100%', height: '100%', objectFit: fit }}
    />
  );
}
